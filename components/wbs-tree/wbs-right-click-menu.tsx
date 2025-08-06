/**
 * Right-Click Context Menu Component
 * 
 * Custom context menu that appears when right-clicking on WBS nodes.
 * Provides the same functionality as the dropdown menu but with native
 * right-click interaction. Positioned absolutely at the cursor location.
 */

import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

/**
 * Props interface for RightClickContextMenu component
 */
interface RightClickContextMenuProps {
  isOpen: boolean;                        // Whether the menu is currently visible
  position: { x: number; y: number };     // Absolute position for menu placement
  onClose: () => void;                    // Handler to close the menu
  onAddChild: () => void;                 // Handler for adding child tasks
  onEdit: () => void;                     // Handler for editing the current node
  onDelete: () => void;                   // Handler for deleting the current node
  canDelete: boolean;                     // Whether delete option should be shown
}

/**
 * RightClickContextMenu Component
 * 
 * Custom context menu that renders at the cursor position when right-clicking nodes.
 * Features intelligent positioning to stay within viewport bounds and backdrop
 * click handling for dismissal.
 * 
 * Key features:
 * - Absolute positioning at cursor location
 * - Viewport boundary detection and adjustment
 * - Backdrop click dismissal
 * - Same actions as dropdown menu
 * - Proper z-index layering
 */
export const RightClickContextMenu: React.FC<RightClickContextMenuProps> = ({ 
  isOpen, 
  position, 
  onClose, 
  onAddChild, 
  onEdit, 
  onDelete, 
  canDelete 
}) => {
  // Don't render anything if menu is closed
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for click-outside dismissal */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Context menu positioned at cursor location */}
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48"
        style={{
          // Smart positioning to keep menu within viewport bounds
          left: Math.min(position.x, window.innerWidth - 200),
          top: Math.min(position.y, window.innerHeight - 150),
          transform: 'translate(0, 0)'
        }}
      >
        {/* Add child task option */}
        <button
          onClick={() => { onAddChild(); onClose(); }}
          className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center text-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Child Task
        </button>
        
        {/* Edit task option */}
        <button
          onClick={() => { onEdit(); onClose(); }}
          className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center text-sm"
        >
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Task
        </button>
        
        {/* Delete task option - only for non-root nodes */}
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