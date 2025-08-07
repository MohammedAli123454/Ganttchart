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
  onNodeMove?: (dragData: DragData, targetParentId: string | null, targetIndex: number) => Promise<void>,
  allNodes?: WBSNode[]
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

  // Helper function to find a node by ID in the tree
  const findNodeById = (nodes: WBSNode[], id: string): WBSNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to create detailed move message
  const createMoveMessage = (dragData: DragData, targetParentId: string | null): string => {
    if (!allNodes) return 'Moving task...';

    const draggedNode = findNodeById(allNodes, dragData.nodeId);
    const sourceParent = dragData.sourceParentId ? findNodeById(allNodes, dragData.sourceParentId) : null;
    const targetParent = targetParentId ? findNodeById(allNodes, targetParentId) : null;

    if (!draggedNode) return 'Moving task...';

    const taskName = `"${draggedNode.name}"`;
    
    // Same parent move
    if (dragData.sourceParentId === targetParentId) {
      if (sourceParent) {
        return `Repositioning ${taskName} within "${sourceParent.name}" WBS`;
      } else {
        return `Repositioning ${taskName} within the root WBS level`;
      }
    }
    
    // Different parent move
    const sourceDesc = sourceParent ? `"${sourceParent.name}"` : 'root level';
    const targetDesc = targetParent ? `"${targetParent.name}"` : 'root level';
    
    return `Moving ${taskName} from ${sourceDesc} to ${targetDesc} WBS`;
  };

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
    if (loadingDialog.isOpen) {
      e.preventDefault();
      return;
    }
    
    const dragData: DragData = { nodeId: node.id, sourceParentId: parentId, sourceIndex: index };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ ...dragState, isDragging: true });
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!onNodeMove || loadingDialog.isOpen) return;
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const dragDataString = e.dataTransfer.getData('application/json');
      if (!dragDataString) {
        console.warn('No drag data found');
        return;
      }
      
      const dragData: DragData = JSON.parse(dragDataString);
      if (dragData.nodeId === node.id) {
        console.warn('Cannot drop node on itself');
        return;
      }
      
      // Determine drop target based on whether node has children and is expanded
      let targetParentId: string | null;
      let targetIndex: number;
      
      if (node.children?.length && expanded) {
        // Dropping into an expanded parent node (as first child)
        targetParentId = node.id;
        targetIndex = 0;
      } else {
        // Dropping as sibling - dragged node should take the target node's position
        targetParentId = parentId;
        targetIndex = index;
      }

      // Create detailed loading message
      const moveMessage = createMoveMessage(dragData, targetParentId);
      setLoadingDialog({ isOpen: true, message: moveMessage, type: 'update' });

      await onNodeMove(dragData, targetParentId, targetIndex);
    } catch (error) {
      console.error('Error handling drop:', error);
    } finally {
      setDragState({ isDragging: false, dragOver: false });
      setLoadingDialog({ isOpen: false, message: '', type: 'update' });
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