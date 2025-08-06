import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NodeContextMenuProps {
  children: React.ReactNode;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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