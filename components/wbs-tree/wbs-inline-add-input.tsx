/**
 * Inline Add Input Component
 * 
 * Specialized input component for adding new child tasks directly within the tree.
 * Appears with proper indentation matching the tree hierarchy and provides
 * keyboard shortcuts for quick task creation and cancellation.
 */

import React from 'react';

/**
 * Props interface for InlineAddInput component
 */
interface InlineAddInputProps {
  level: number;                          // Tree depth level for proper indentation
  value: string;                          // Current input value
  onChange: (value: string) => void;      // Handler for input value changes
  onSubmit: () => void;                   // Handler for task creation (Enter key or blur)
  onCancel: () => void;                   // Handler for cancellation (Escape key)
  disabled?: boolean;                     // Whether input should be disabled
}

/**
 * InlineAddInput Component
 * 
 * Renders an input field for adding new child tasks directly within the tree structure.
 * Automatically positions with correct indentation and provides intuitive keyboard
 * controls for task creation workflow.
 * 
 * Key features:
 * - Proper hierarchical indentation based on tree level
 * - Enter key to submit new task
 * - Escape key to cancel operation
 * - Blur submission (creates task when focus is lost with content)
 * - Auto-focus for immediate typing
 * - Visual distinction with blue border
 */
export const InlineAddInput: React.FC<InlineAddInputProps> = ({ 
  level, 
  value, 
  onChange, 
  onSubmit, 
  onCancel, 
  disabled 
}) => (
  <div className="mb-1" style={{ marginLeft: `${(level + 1) * 24}px` }}>
    <div className="flex items-center p-3 bg-white border border-blue-300 rounded-lg shadow-sm">
      {/* Spacer to align with tree structure (no expand/collapse button for new items) */}
      <div className="w-4 h-4 mr-2" />
      
      {/* Input field for new task name */}
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