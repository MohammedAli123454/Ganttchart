import { useState } from 'react';
import { LOADER_COLORS } from '@/components/wbs-dialogs';
import type { WBSNode, DragData } from '@/components/wbs-tree/types/wbs-types';

export const useNodeHandlers = (
  node: WBSNode,
  parentId: string | null,
  index: number,
  expanded: boolean,
  onToggle?: (nodeId: string) => void,
  onNodeAdd?: (parentId: string | null, node: Omit<WBSNode, 'id'>) => Promise<void>,
  onNodeEdit?: (nodeId: string, updates: Partial<WBSNode>) => Promise<void>,
  onNodeDelete?: (nodeId: string) => Promise<void>,
  onNodeMove?: (dragData: DragData, targetParentId: string | null, targetIndex: number) => Promise<void>
) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: node.name });
  const [showInlineAddInput, setShowInlineAddInput] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [loadingDialog, setLoadingDialog] = useState<{
    isOpen: boolean;
    message: string;
    type: keyof typeof LOADER_COLORS;
  }>({ isOpen: false, message: '', type: 'create' });
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, isDeleting: false });
  const [dragState, setDragState] = useState({ isDragging: false, dragOver: false });
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [rightClickMenuOpen, setRightClickMenuOpen] = useState(false);
  const [rightClickPosition, setRightClickPosition] = useState({ x: 0, y: 0 });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle && node.children?.length) onToggle(node.id);
  };

  const handleEdit = async () => {
    if (onNodeEdit && editForm.name.trim()) {
      setLoadingDialog({ isOpen: true, message: 'Updating task...', type: 'update' });
      try {
        await onNodeEdit(node.id, { name: editForm.name.trim() });
        setIsEditing(false);
      } finally {
        setLoadingDialog({ isOpen: false, message: '', type: 'update' });
      }
    } else {
      setEditForm({ name: node.name });
      setIsEditing(false);
    }
  };

  const handleAddChild = async (name: string) => {
    if (onNodeAdd) {
      await onNodeAdd(node.id, { name, parentId: node.id });
      if (onToggle && !expanded) onToggle(node.id);
    }
  };

  const handleInlineAddChild = async () => {
    if (newChildName.trim() && onNodeAdd) {
      setLoadingDialog({ isOpen: true, message: 'Creating new task...', type: 'create' });
      try {
        await handleAddChild(newChildName.trim());
        setNewChildName('');
        setShowInlineAddInput(false);
      } finally {
        setLoadingDialog({ isOpen: false, message: '', type: 'create' });
      }
    }
  };

  const handleShowInlineAdd = () => {
    setShowInlineAddInput(true);
    if (onToggle && !expanded) onToggle(node.id);
  };

  const handleDeleteConfirm = async () => {
    if (onNodeDelete) {
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }));
      try {
        await onNodeDelete(node.id);
        setDeleteConfirmation({ isOpen: false, isDeleting: false });
      } catch {
        setDeleteConfirmation(prev => ({ ...prev, isDeleting: false }));
      }
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    const dragData: DragData = { nodeId: node.id, sourceParentId: parentId, sourceIndex: index };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ ...dragState, isDragging: true });
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!onNodeMove) return;
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const dragData: DragData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (dragData.nodeId === node.id) return;
      
      const targetParentId = node.children?.length && expanded ? node.id : parentId;
      const targetIndex = node.children?.length && expanded ? node.children.length : index + 1;
      await onNodeMove(dragData, targetParentId, targetIndex);
    } catch (error) {
      console.error('Error handling drop:', error);
    } finally {
      setDragState({ isDragging: false, dragOver: false });
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRightClickPosition({ x: e.clientX, y: e.clientY });
    setRightClickMenuOpen(true);
  };

  return {
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    showInlineAddInput,
    setShowInlineAddInput,
    newChildName,
    setNewChildName,
    loadingDialog,
    deleteConfirmation,
    setDeleteConfirmation,
    dragState,
    setDragState,
    handleToggle,
    handleEdit,
    handleAddChild,
    handleInlineAddChild,
    handleShowInlineAdd,
    handleDeleteConfirm,
    handleDragStart,
    handleDrop,
    handleRightClick,
    contextMenuOpen,
    setContextMenuOpen,
    rightClickMenuOpen,
    setRightClickMenuOpen,
    rightClickPosition
  };
};