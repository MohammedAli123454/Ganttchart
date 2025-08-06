import React, { useRef } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingDialog, DeleteConfirmationDialog } from '@/components/wbs-dialogs';
import { NodeContextMenu } from './wbs-node-context-menu';
import { RightClickContextMenu } from './wbs-right-click-menu';
import { InlineAddInput } from './wbs-inline-add-input';
import { useNodeHandlers } from '@/lib/hooks/wbs/use-node-handlers';
import { WBSNodeProps } from './types/wbs-types';

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

export { WBSNodeComponent };