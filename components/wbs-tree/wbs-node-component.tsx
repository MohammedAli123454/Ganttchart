/**
 * WBS Node Component
 * 
 * Recursive component representing individual nodes in the Work Breakdown Structure tree.
 * Handles rendering, editing, drag-and-drop, and all node-specific interactions.
 * Each node can contain children and supports full CRUD operations.
 */

import React, { useRef } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingDialog, DeleteConfirmationDialog } from '@/components/wbs-dialogs';
import { NodeContextMenu } from './wbs-node-context-menu';
import { RightClickContextMenu } from './wbs-right-click-menu';
import { InlineAddInput } from './wbs-inline-add-input';
import { useNodeHandlers } from '@/lib/hooks/wbs/use-node-handlers';
import { WBSNodeProps } from './types/wbs-types';

/**
 * WBSNodeComponent
 * 
 * Individual node component that renders a single WBS task with all its functionality.
 * Supports hierarchical nesting, drag-and-drop reordering, inline editing, and context menus.
 * 
 * @param node - The WBS node data containing id, name, and optional children
 * @param level - Depth level in the tree hierarchy (0 = root)
 * @param index - Position index within parent's children array
 * @param parentId - ID of the parent node (null for root nodes)
 * @param onToggle - Callback for expand/collapse operations
 * @param expanded - Whether this node is currently expanded
 * @param expandedNodes - Set of all currently expanded node IDs
 * @param onNodeAdd - Callback for adding new child nodes
 * @param onNodeEdit - Callback for editing node properties
 * @param onNodeDelete - Callback for deleting nodes
 * @param onNodeMove - Callback for drag-and-drop operations
 * @param editable - Whether editing operations are allowed
 * @param treeDisabled - Whether the entire tree is disabled during operations
 */
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
  treeDisabled = false,
  allNodes
}) => {
  // DOM reference for drag-and-drop boundary calculations
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Node state calculations
  const hasChildren = Boolean(node.children?.length);
  const paddingLeft = level * 24; // Visual indentation based on hierarchy level
  const isProjectRoot = Boolean(node.isProjectRoot);
  const isNodeEditable = editable && !isProjectRoot; // Project root nodes are not editable
  
  // Custom hook that manages all node-specific event handlers and state
  const handlers = useNodeHandlers(
    node, parentId, index, expanded, onToggle, onNodeAdd, onNodeEdit, onNodeDelete, onNodeMove, allNodes
  );

  /**
   * Drag and drop event handlers configuration
   * Only active when editable mode is enabled and not project root
   */
  const dragHandlers = {
    onDragStart: isNodeEditable ? handlers.handleDragStart : undefined,
    onDragEnd: () => handlers.setDragState({ isDragging: false, dragOver: false }),
    onDragOver: isNodeEditable ? (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!handlers.dragState.dragOver) {
        handlers.setDragState({ ...handlers.dragState, dragOver: true });
      }
    } : undefined,
    onDragLeave: isNodeEditable ? (e: React.DragEvent) => {
      // Check if mouse has truly left the node boundaries to avoid flickering
      const rect = nodeRef.current?.getBoundingClientRect();
      if (rect && (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
      )) {
        handlers.setDragState({ ...handlers.dragState, dragOver: false });
      }
    } : undefined,
    onDrop: isNodeEditable ? handlers.handleDrop : undefined
  };

  // Inline editing mode - replaces normal node display with editable input
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
              // Cancel editing and restore original name
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

  /**
   * Dynamic CSS classes for node styling based on current state
   * Handles dragging, hover, disabled states, and drop zone highlighting
   */
  const nodeClasses = `flex items-center p-2 bg-white border border-gray-200 rounded-lg transition-all duration-150 group ${
    handlers.dragState.isDragging 
      ? 'opacity-50 cursor-grabbing' 
      : isNodeEditable && !treeDisabled && !handlers.loadingDialog.isOpen
        ? 'hover:bg-gray-50 cursor-pointer' 
        : 'hover:bg-gray-50'
  } ${
    handlers.dragState.dragOver && isNodeEditable && !treeDisabled && !handlers.loadingDialog.isOpen
      ? 'bg-blue-50 border-blue-300 shadow-md' 
      : ''
  } ${
    (treeDisabled || handlers.loadingDialog.isOpen) ? 'pointer-events-none opacity-50' : ''
  }`;

  return (
    <div className="mb-1">
      {/* Main node container with drag-and-drop functionality */}
      <div 
        ref={nodeRef}
        className={nodeClasses}
        style={{ marginLeft: `${paddingLeft}px` }}
        draggable={isNodeEditable && !treeDisabled && !handlers.loadingDialog.isOpen}
        {...dragHandlers}
        onDoubleClick={isNodeEditable ? (e: React.MouseEvent) => {
          e.stopPropagation();
          handlers.setEditForm({ name: node.name });
          handlers.setIsEditing(true);
        } : undefined}
        onContextMenu={isNodeEditable ? handlers.handleRightClick : undefined}
      >
        {/* Expand/collapse button - shows chevron for nodes with children */}
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
        
        {/* Node content - task name */}
        <div className="flex-1 min-w-0">
          <span className={`text-gray-900 ${
            hasChildren || isProjectRoot ? 'font-bold' : 'font-medium'
          }`}>
            {node.name}
          </span>
        </div>
        
        {/* Actions menu - only visible in edit mode and on hover, not for project root */}
        {isNodeEditable && !treeDisabled && !handlers.loadingDialog.isOpen && (
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

      {/* Child nodes - rendered recursively when expanded */}
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
              editable={editable && !Boolean(child.isProjectRoot)}
              treeDisabled={treeDisabled}
              allNodes={allNodes}
            />
          ))}
          {/* Inline input for adding new child tasks */}
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
      
      {/* Inline input for leaf nodes (nodes without children) when adding first child */}
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

      {/* Loading dialog for node-specific operations (add, edit, delete, move) */}
      <LoadingDialog
        isOpen={handlers.loadingDialog.isOpen}
        message={handlers.loadingDialog.message}
        type={handlers.loadingDialog.type}
      />

      {/* Delete confirmation dialog with loading state */}
      <DeleteConfirmationDialog
        isOpen={handlers.deleteConfirmation.isOpen}
        nodeName={node.name}
        onConfirm={handlers.handleDeleteConfirm}
        onCancel={() => handlers.setDeleteConfirmation({ isOpen: false, isDeleting: false })}
        isDeleting={handlers.deleteConfirmation.isDeleting}
      />

      {/* Right-click context menu with same actions as dropdown menu */}
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