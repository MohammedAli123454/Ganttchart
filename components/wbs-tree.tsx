import React, { useState, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { useWBSNodes, useCreateWBSNode, useUpdateWBSNode, useDeleteWBSNode, useMoveWBSNode } from '@/lib/hooks/use-wbs-nodes';

// Types
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

// Database-enabled WBS management hook
const useWBSDatabase = (projectId: string) => {
  const { data: wbsData = [], isLoading, error } = useWBSNodes(projectId);
  const createNodeMutation = useCreateWBSNode();
  const updateNodeMutation = useUpdateWBSNode();
  const deleteNodeMutation = useDeleteWBSNode();
  const moveNodeMutation = useMoveWBSNode();

  const addNode = useCallback(async (parentId: string | null, nodeData: Omit<WBSNode, 'id'>) => {
    // Calculate order for new node
    let order = 0;
    if (parentId) {
      // Find parent and count its children
      const findParent = (nodes: WBSNode[]): WBSNode | null => {
        for (const node of nodes) {
          if (node.id === parentId) return node;
          if (node.children) {
            const found = findParent(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      const parent = findParent(wbsData);
      order = parent?.children?.length || 0;
    } else {
      order = wbsData.length;
    }

    await createNodeMutation.mutateAsync({
      projectId,
      parentId: parentId || undefined,
      name: nodeData.name,
      order
    });
  }, [projectId, wbsData, createNodeMutation]);

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


// Add Dialog Component
const AddNodeDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
  title: string;
}> = ({ isOpen, onClose, onAdd, title }) => {
  const [nodeName, setNodeName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nodeName.trim()) {
      onAdd(nodeName.trim());
      setNodeName('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter task name..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            autoFocus
          />
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!nodeName.trim()}
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Context Menu Component
const ContextMenu: React.FC<{
  x: number;
  y: number;
  onClose: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}> = ({ x, y, onClose, onAddChild, onEdit, onDelete, canDelete }) => {
  React.useEffect(() => {
    const handleClick = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50 min-w-[150px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onAddChild(); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
      >
        <Plus size={14} />
        <span>Add Child</span>
      </button>
      <button
        onClick={() => { onEdit(); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
      >
        <Edit2 size={14} />
        <span>Edit</span>
      </button>
      {canDelete && (
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </button>
      )}
    </div>
  );
};

// WBS Node Component
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
}

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
  editable = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: node.name
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dragState, setDragState] = useState({
    isDragging: false,
    dragOver: false
  });

  const nodeRef = useRef<HTMLDivElement>(null);
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = level * 24;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle && hasChildren) {
      onToggle(node.id);
    }
  };

  const handleEdit = async () => {
    if (onNodeEdit && editForm.name.trim()) {
      await onNodeEdit(node.id, { name: editForm.name.trim() });
      setIsEditing(false);
    } else if (!editForm.name.trim()) {
      setEditForm({ name: node.name });
      setIsEditing(false);
    }
  };

  const handleAddChild = async (name: string) => {
    if (onNodeAdd) {
      const newNode = {
        name: name,
        parentId: node.id
      };
      await onNodeAdd(node.id, newNode);
      if (onToggle && !expanded) {
        onToggle(node.id);
      }
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation();
    setEditForm({ name: node.name });
    setIsEditing(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!editable) return;
    
    const dragData: DragData = {
      nodeId: node.id,
      sourceParentId: parentId,
      sourceIndex: index
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ ...dragState, isDragging: true });
  };

  const handleDragEnd = () => {
    setDragState({ isDragging: false, dragOver: false });
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (!dragState.dragOver) {
      setDragState({ ...dragState, dragOver: true });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!editable) return;
    
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect && (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )) {
      setDragState({ ...dragState, dragOver: false });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!editable || !onNodeMove) return;
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const dragData: DragData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (dragData.nodeId === node.id) {
        setDragState({ isDragging: false, dragOver: false });
        return;
      }
      
      if (hasChildren && expanded) {
        await onNodeMove(dragData, node.id, (node.children?.length || 0));
      } else {
        await onNodeMove(dragData, parentId, index + 1);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
    
    setDragState({ isDragging: false, dragOver: false });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleAddChildFromContext = async () => {
    if (onNodeAdd) {
      const newNode = {
        name: "New WBS",
        parentId: node.id
      };
      await onNodeAdd(node.id, newNode);
      if (onToggle && !expanded) {
        onToggle(node.id);
      }
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2 mb-2 shadow-sm" style={{ marginLeft: `${paddingLeft}px` }}>
        <input
          type="text"
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEdit();
            } else if (e.key === 'Escape') {
              setEditForm({ name: node.name });
              setIsEditing(false);
            }
          }}
          onBlur={handleEdit}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="Enter task name..."
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="mb-1">
      <div 
        ref={nodeRef}
        className={`flex items-center p-3 bg-white border border-gray-200 rounded-lg transition-all duration-150 ${
          dragState.isDragging 
            ? 'opacity-50 cursor-grabbing' 
            : editable 
              ? 'hover:bg-gray-50 cursor-pointer' 
              : 'hover:bg-gray-50'
        } ${
          dragState.dragOver && editable 
            ? 'bg-blue-50 border-blue-300 shadow-md' 
            : ''
        }`}
        style={{ marginLeft: `${paddingLeft}px` }}
        draggable={editable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={handleRightClick}
        onDoubleClick={handleDoubleClick}
      >
 
        
        <button
          onClick={handleToggle}
          className={`mr-2 p-1 rounded hover:bg-gray-200 transition-colors duration-150 ${
            hasChildren ? 'text-gray-600' : 'text-transparent cursor-default'
          }`}
          disabled={!hasChildren}
        >
          {hasChildren && expanded ? (
            <ChevronDown size={16} />
          ) : hasChildren ? (
            <ChevronRight size={16} />
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900">{node.name}</span>
        </div>
      </div>

      <AddNodeDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddChild}
        title="Add New Task"
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onAddChild={handleAddChildFromContext}
          onEdit={() => setIsEditing(true)}
          onDelete={() => onNodeDelete && onNodeDelete(node.id)}
          canDelete={level > 0}
        />
      )}

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
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main WBS Tree Component
interface WBSTreeProps {
  projectId: string;
  editable?: boolean;
}

const WBSTree: React.FC<WBSTreeProps> = ({
  projectId,
  editable = false
}) => {
  const {
    wbsData: data,
    addNode: onNodeAdd,
    editNode: onNodeEdit,
    deleteNode: onNodeDelete,
    moveNode: onNodeMove,
    isLoading,
    error
  } = useWBSDatabase(projectId);

  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
  const [showAddRootDialog, setShowAddRootDialog] = useState(false);

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

  const expandAll = () => {
    const getAllNodeIds = (nodes: WBSNode[]): string[] => {
      let ids: string[] = [];
      nodes.forEach(node => {
        ids.push(node.id);
        if (node.children) {
          ids = ids.concat(getAllNodeIds(node.children));
        }
      });
      return ids;
    };
    setExpandedNodes(new Set(getAllNodeIds(data)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleAddRoot = async (name: string) => {
    if (onNodeAdd) {
      const newNode = {
        name: name
      };
      await onNodeAdd(null, newNode);
    }
  };

  const handleAddRootFromButton = async () => {
    if (onNodeAdd) {
      const newNode = {
        name: "New WBS"
      };
      await onNodeAdd(null, newNode);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading WBS data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading WBS data</h3>
          <p className="text-red-600 mt-1">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Work Breakdown Structure</h2>
        <div className="flex space-x-2 flex-wrap">
          <button
            onClick={expandAll}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-150"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-150"
          >
            Collapse All
          </button>
          {editable && (
            <button
              onClick={handleAddRootFromButton}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-150 flex items-center space-x-1"
            >
              <Plus size={16} />
              <span>Add Root Task</span>
            </button>
          )}
        </div>
      </div>

      <AddNodeDialog
        isOpen={showAddRootDialog}
        onClose={() => setShowAddRootDialog(false)}
        onAdd={handleAddRoot}
        title="Add New Root Task"
      />

      <div className="bg-gray-50 rounded-lg p-4">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tasks found. {editable && 'Click "Add Root Task" to get started.'}
          </div>
        ) : (
          data.map((node, index) => (
            <WBSNodeComponent
              key={node.id}
              node={node}
              level={0}
              index={index}
              parentId={null}
              onToggle={handleToggle}
              expanded={expandedNodes.has(node.id)}
              expandedNodes={expandedNodes}
              onNodeAdd={onNodeAdd}
              onNodeEdit={onNodeEdit}
              onNodeDelete={onNodeDelete}
              onNodeMove={onNodeMove}
              editable={editable}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Demo Component with Database Integration
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

        <WBSTree
          projectId={projectId}
          editable={isEditable}
        />
      </div>
    </div>
  );
};

export default WBSDemo;