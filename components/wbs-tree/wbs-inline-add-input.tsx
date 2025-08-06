import React from 'react';

interface InlineAddInputProps {
  level: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

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