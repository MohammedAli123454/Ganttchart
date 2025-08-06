import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface RightClickContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const RightClickContextMenu: React.FC<RightClickContextMenuProps> = ({ 
  isOpen, 
  position, 
  onClose, 
  onAddChild, 
  onEdit, 
  onDelete, 
  canDelete 
}) => {
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