import React, { useState, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { useWBSNodes, useCreateWBSNode, useUpdateWBSNode, useDeleteWBSNode, useMoveWBSNode } from '@/lib/hooks/use-wbs-nodes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingDialog, DeleteConfirmationDialog, LOADER_COLORS } from '@/components/wbs-dialogs';


interface WBSNode {
  id: string;
  name: string;
  children?: WBSNode[];
  parentId?: string;
}

interface DragData {
  nodeId: string;
  sourceParentId: string | null;
  sourceIndex: number;
}


const useWBSDatabase = (projectId: string) => {
  const { data: wbsData = [], isLoading, error } = useWBSNodes(projectId);
  const createNodeMutation = useCreateWBSNode();
  const updateNodeMutation = useUpdateWBSNode();
  const deleteNodeMutation = useDeleteWBSNode();
  const moveNodeMutation = useMoveWBSNode();

  const findParent = useCallback((nodes: WBSNode[], parentId: string): WBSNode | null => {
    for (const node of nodes) {
      if (node.id === parentId) return node;
      if (node.children) {
        const found = findParent(node.children, parentId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const addNode = useCallback(async (parentId: string | null, nodeData: Omit<WBSNode, 'id'>) => {
    const order = parentId 
      ? findParent(wbsData, parentId)?.children?.length || 0
      : wbsData.length;

    await createNodeMutation.mutateAsync({
      projectId,
      parentId: parentId || undefined,
      name: nodeData.name,
      order
    });
  }, [projectId, wbsData, createNodeMutation, findParent]);

  const editNode = useCallback(async (nodeId: string, updates: Partial<WBSNode>) => {
    await updateNodeMutation.mutateAsync({
      nodeId,
      data: { name: updates.name },
      projectId
    });
  }, [updateNodeMutation, projectId]);

  const deleteNode = useCallback(async (nodeId: string) => {
    await deleteNodeMutation.mutateAsync({ nodeId, projectId });
  }, [deleteNodeMutation, projectId]);

  const moveNode = useCallback(async (dragData: DragData, targetParentId: string | null, targetIndex: number) => {
    await moveNodeMutation.mutateAsync({
      data: {
        nodeId: dragData.nodeId,
        targetParentId: targetParentId || undefined,
        targetIndex
      },
      projectId
    });
  }, [moveNodeMutation, projectId]);

  return {
    wbsData,
    addNode,
    editNode,
    deleteNode,
    moveNode,
    isLoading,
    error,
    isCreating: createNodeMutation.isPending,
    isUpdating: updateNodeMutation.isPending,
    isDeleting: deleteNodeMutation.isPending,
    isMoving: moveNodeMutation.isPending
  };
};



const NodeContextMenu: React.FC<{
  children: React.ReactNode;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}> = ({ children, onAddChild, onEdit, onDelete, canDelete, disabled, open, onOpenChange }) => {
  if (disabled) return <>{children}</>;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 z-50" align="end" sideOffset={5}>
        <DropdownMenuItem onClick={onAddChild} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Add Child Task
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Task
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete} 
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Task
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface WBSNodeProps {
  node: WBSNode;
  level: number;
  index: number;
  parentId: string | null;
  onToggle?: (nodeId: string) => void;
  expanded: boolean;
  expandedNodes: Set<string>;
  onNodeAdd?: (parentId: string | null, node: Omit<WBSNode, 'id'>) => Promise<void>;
  onNodeEdit?: (nodeId: string, updates: Partial<WBSNode>) => Promise<void>;
  onNodeDelete?: (nodeId: string) => Promise<void>;
  onNodeMove?: (dragData: DragData, targetParentId: string | null, targetIndex: number) => Promise<void>;
  editable?: boolean;
  treeDisabled?: boolean;
}

const useNodeHandlers = (
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

const RightClickContextMenu: React.FC<{
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}> = ({ isOpen, position, onClose, onAddChild, onEdit, onDelete, canDelete }) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48"
        style={{
          left: Math.min(position.x, window.innerWidth - 200),
          top: Math.min(position.y, window.innerHeight - 150),
          transform: 'translate(0, 0)'
        }}
      >
        <button
          onClick={() => { onAddChild(); onClose(); }}
          className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center text-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Child Task
        </button>
        <button
          onClick={() => { onEdit(); onClose(); }}
          className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center text-sm"
        >
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Task
        </button>
        {canDelete && (
          <>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center text-sm text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Task
            </button>
          </>
        )}
      </div>
    </>
  );
};

const InlineAddInput: React.FC<{
  level: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  disabled?: boolean;
}> = ({ level, value, onChange, onSubmit, onCancel, disabled }) => (
  <div className="mb-1" style={{ marginLeft: `${(level + 1) * 24}px` }}>
    <div className="flex items-center p-3 bg-white border border-blue-300 rounded-lg shadow-sm">
      <div className="w-4 h-4 mr-2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
          else if (e.key === 'Escape') onCancel();
        }}
        onBlur={() => value.trim() ? onSubmit() : onCancel()}
        className="flex-1 p-2 border-0 outline-none text-sm font-medium text-gray-900 bg-transparent"
        placeholder="Enter task name..."
        autoFocus
        disabled={disabled}
      />
    </div>
  </div>
);

const WBSNodeComponent: React.FC<WBSNodeProps> = ({
  node,
  level,
  index,
  parentId,
  onToggle,
  expanded,
  expandedNodes,
  onNodeAdd,
  onNodeEdit,
  onNodeDelete,
  onNodeMove,
  editable = false,
  treeDisabled = false
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const hasChildren = Boolean(node.children?.length);
  const paddingLeft = level * 24;
  
  const handlers = useNodeHandlers(
    node, parentId, index, expanded, onToggle, onNodeAdd, onNodeEdit, onNodeDelete, onNodeMove
  );

  const dragHandlers = {
    onDragStart: editable ? handlers.handleDragStart : undefined,
    onDragEnd: () => handlers.setDragState({ isDragging: false, dragOver: false }),
    onDragOver: editable ? (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!handlers.dragState.dragOver) {
        handlers.setDragState({ ...handlers.dragState, dragOver: true });
      }
    } : undefined,
    onDragLeave: editable ? (e: React.DragEvent) => {
      const rect = nodeRef.current?.getBoundingClientRect();
      if (rect && (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
      )) {
        handlers.setDragState({ ...handlers.dragState, dragOver: false });
      }
    } : undefined,
    onDrop: editable ? handlers.handleDrop : undefined
  };

  if (handlers.isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2 mb-2 shadow-sm" style={{ marginLeft: `${paddingLeft}px` }}>
        <input
          type="text"
          value={handlers.editForm.name}
          onChange={(e) => handlers.setEditForm({ ...handlers.editForm, name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handlers.handleEdit();
            else if (e.key === 'Escape') {
              handlers.setEditForm({ name: node.name });
              handlers.setIsEditing(false);
            }
          }}
          onBlur={handlers.handleEdit}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="Enter task name..."
          autoFocus
        />
      </div>
    );
  }

  const nodeClasses = `flex items-center p-3 bg-white border border-gray-200 rounded-lg transition-all duration-150 group ${
    handlers.dragState.isDragging 
      ? 'opacity-50 cursor-grabbing' 
      : editable && !treeDisabled && !handlers.loadingDialog.isOpen
        ? 'hover:bg-gray-50 cursor-pointer' 
        : 'hover:bg-gray-50'
  } ${
    handlers.dragState.dragOver && editable && !treeDisabled && !handlers.loadingDialog.isOpen
      ? 'bg-blue-50 border-blue-300 shadow-md' 
      : ''
  } ${
    (treeDisabled || handlers.loadingDialog.isOpen) ? 'pointer-events-none opacity-50' : ''
  }`;

  return (
    <div className="mb-1">
      <div 
        ref={nodeRef}
        className={nodeClasses}
        style={{ marginLeft: `${paddingLeft}px` }}
        draggable={editable && !treeDisabled && !handlers.loadingDialog.isOpen}
        {...dragHandlers}
        onDoubleClick={editable ? (e: React.MouseEvent) => {
          e.stopPropagation();
          handlers.setEditForm({ name: node.name });
          handlers.setIsEditing(true);
        } : undefined}
        onContextMenu={editable ? handlers.handleRightClick : undefined}
      >
        <button
          onClick={handlers.handleToggle}
          className={`mr-2 p-1 rounded hover:bg-gray-200 transition-colors duration-150 ${
            hasChildren ? 'text-gray-600' : 'text-transparent cursor-default'
          }`}
          disabled={!hasChildren}
        >
          {hasChildren && expanded ? <ChevronDown size={16} /> :
           hasChildren ? <ChevronRight size={16} /> :
           <div className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900">{node.name}</span>
        </div>
        
          {editable && !treeDisabled && !handlers.loadingDialog.isOpen && (
            <NodeContextMenu
              onAddChild={handlers.handleShowInlineAdd}
              onEdit={() => handlers.setIsEditing(true)}
              onDelete={() => handlers.setDeleteConfirmation({ isOpen: true, isDeleting: false })}
              canDelete={level > 0}
              open={handlers.contextMenuOpen}
              onOpenChange={handlers.setContextMenuOpen}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                title="More options (or right-click node)"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </NodeContextMenu>
          )}
        </div>

      {hasChildren && expanded && (
        <div className="mt-1">
          {node.children!.map((child, childIndex) => (
            <WBSNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              index={childIndex}
              parentId={node.id}
              onToggle={onToggle}
              expanded={expandedNodes.has(child.id)}
              expandedNodes={expandedNodes}
              onNodeAdd={onNodeAdd}
              onNodeEdit={onNodeEdit}
              onNodeDelete={onNodeDelete}
              onNodeMove={onNodeMove}
              editable={editable}
              treeDisabled={treeDisabled}
            />
          ))}
          {handlers.showInlineAddInput && (
            <InlineAddInput
              level={level}
              value={handlers.newChildName}
              onChange={handlers.setNewChildName}
              onSubmit={handlers.handleInlineAddChild}
              onCancel={() => {
                handlers.setShowInlineAddInput(false);
                handlers.setNewChildName('');
              }}
              disabled={handlers.loadingDialog.isOpen}
            />
          )}
        </div>
      )}
      
      {!hasChildren && expanded && handlers.showInlineAddInput && (
        <div className="mt-1">
          <InlineAddInput
            level={level}
            value={handlers.newChildName}
            onChange={handlers.setNewChildName}
            onSubmit={handlers.handleInlineAddChild}
            onCancel={() => {
              handlers.setShowInlineAddInput(false);
              handlers.setNewChildName('');
            }}
            disabled={handlers.loadingDialog.isOpen}
          />
        </div>
      )}

      <LoadingDialog
        isOpen={handlers.loadingDialog.isOpen}
        message={handlers.loadingDialog.message}
        type={handlers.loadingDialog.type}
      />

      <DeleteConfirmationDialog
        isOpen={handlers.deleteConfirmation.isOpen}
        nodeName={node.name}
        onConfirm={handlers.handleDeleteConfirm}
        onCancel={() => handlers.setDeleteConfirmation({ isOpen: false, isDeleting: false })}
        isDeleting={handlers.deleteConfirmation.isDeleting}
      />

      <RightClickContextMenu
        isOpen={handlers.rightClickMenuOpen}
        position={handlers.rightClickPosition}
        onClose={() => handlers.setRightClickMenuOpen(false)}
        onAddChild={handlers.handleShowInlineAdd}
        onEdit={() => handlers.setIsEditing(true)}
        onDelete={() => handlers.setDeleteConfirmation({ isOpen: true, isDeleting: false })}
        canDelete={level > 0}
      />
    </div>
  );
};

interface WBSTreeProps {
  projectId: string;
  editable?: boolean;
}

const useWBSTreeState = (data: WBSNode[]) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const getAllNodeIds = useCallback((nodes: WBSNode[]): string[] => {
    return nodes.reduce<string[]>((ids, node) => {
      ids.push(node.id);
      if (node.children) {
        ids.push(...getAllNodeIds(node.children));
      }
      return ids;
    }, []);
  }, []);

  const expandAll = useCallback(() => {
    setExpandedNodes(new Set(getAllNodeIds(data)));
  }, [data, getAllNodeIds]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  return { expandedNodes, handleToggle, expandAll, collapseAll };
};

const WBSTree: React.FC<WBSTreeProps> = ({ projectId, editable = false }) => {
  const database = useWBSDatabase(projectId);
  const { expandedNodes, handleToggle, expandAll, collapseAll } = useWBSTreeState(database.wbsData);
  const [rootLoadingDialog, setRootLoadingDialog] = useState({
    isOpen: false,
    message: '',
    type: 'create' as keyof typeof LOADER_COLORS
  });

  const handleAddRootFromButton = async () => {
    if (database.addNode) {
      setRootLoadingDialog({ isOpen: true, message: 'Creating root task...', type: 'create' });
      try {
        await database.addNode(null, { name: "New WBS" });
      } finally {
        setRootLoadingDialog({ isOpen: false, message: '', type: 'create' });
      }
    }
  };

  if (database.isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading WBS data...</p>
        </div>
      </div>
    );
  }

  if (database.error) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading WBS data</h3>
          <p className="text-red-600 mt-1">
            {database.error instanceof Error ? database.error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  const buttonClass = "px-3 py-2 text-sm rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const isLoading = rootLoadingDialog.isOpen;

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Work Breakdown Structure</h2>
        <div className="flex space-x-2 flex-wrap">
          <button
            onClick={expandAll}
            disabled={isLoading}
            className={`${buttonClass} bg-gray-100 text-gray-700 hover:bg-gray-200`}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            disabled={isLoading}
            className={`${buttonClass} bg-gray-100 text-gray-700 hover:bg-gray-200`}
          >
            Collapse All
          </button>
          {editable && (
            <button
              onClick={handleAddRootFromButton}
              disabled={isLoading}
              className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-1`}
            >
              <Plus size={16} />
              <span>Add Root Task</span>
            </button>
          )}
        </div>
      </div>

      <div className={`bg-gray-50 rounded-lg p-4 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
        {database.wbsData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tasks found. {editable && 'Click "Add Root Task" to get started.'}
          </div>
        ) : (
          database.wbsData.map((node, index) => (
            <WBSNodeComponent
              key={node.id}
              node={node}
              level={0}
              index={index}
              parentId={null}
              onToggle={handleToggle}
              expanded={expandedNodes.has(node.id)}
              expandedNodes={expandedNodes}
              onNodeAdd={database.addNode}
              onNodeEdit={database.editNode}
              onNodeDelete={database.deleteNode}
              onNodeMove={database.moveNode}
              editable={editable && !isLoading}
              treeDisabled={isLoading}
            />
          ))
        )}
      </div>

      <LoadingDialog
        isOpen={rootLoadingDialog.isOpen}
        message={rootLoadingDialog.message}
        type={rootLoadingDialog.type}
      />
    </div>
  );
};

interface WBSDemoProps {
  projectId?: string;
}

const WBSDemo: React.FC<WBSDemoProps> = ({ projectId = "1" }) => {
  const [isEditable, setIsEditable] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border">
            <span className="text-sm font-medium">Edit Mode:</span>
            <button
              onClick={() => setIsEditable(!isEditable)}
              className={`px-3 py-1 text-sm rounded transition-colors duration-150 ${
                isEditable 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              {isEditable ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        <WBSTree projectId={projectId} editable={isEditable} />
      </div>
    </div>
  );
};

export default WBSDemo;