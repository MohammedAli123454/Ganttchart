/**
 * Node Context Menu Component
 * 
 * Dropdown menu component that provides quick access to node actions.
 * Triggered by clicking the "more options" button that appears on hover.
 * Offers the same functionality as the right-click context menu.
 */

import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Props interface for NodeContextMenu component
 */
interface NodeContextMenuProps {
  children: React.ReactNode;      // Trigger element (usually the "more options" button)
  onAddChild: () => void;         // Handler for adding child tasks
  onEdit: () => void;             // Handler for editing the current node
  onDelete: () => void;           // Handler for deleting the current node
  canDelete: boolean;             // Whether delete option should be shown (false for root nodes)
  disabled?: boolean;             // Whether the menu should be disabled
  open?: boolean;                 // Controlled open state
  onOpenChange?: (open: boolean) => void; // Handler for open state changes
}

/**
 * NodeContextMenu Component
 * 
 * Provides a dropdown menu with common node actions. Renders as a standard
 * dropdown menu attached to a trigger element (typically a button).
 * 
 * Features:
 * - Add child task functionality
 * - Edit current task
 * - Delete task (only for non-root nodes)
 * - Proper keyboard navigation and accessibility
 */
export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({ 
  children, 
  onAddChild, 
  onEdit, 
  onDelete, 
  canDelete, 
  disabled, 
  open, 
  onOpenChange 
}) => {
  // Return trigger element without menu functionality if disabled
  if (disabled) return <>{children}</>;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 z-50" align="end" sideOffset={5}>
        {/* Add child task option */}
        <DropdownMenuItem onClick={onAddChild} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Add Child Task
        </DropdownMenuItem>
        
        {/* Edit task option */}
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Task
        </DropdownMenuItem>
        
        {/* Delete task option - only shown for non-root nodes */}
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