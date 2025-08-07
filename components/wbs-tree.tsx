/**
 * Work Breakdown Structure (WBS) Tree Component
 * 
 * This module provides a comprehensive WBS tree implementation with drag-and-drop functionality,
 * inline editing, and full CRUD operations. It serves as the main entry point for managing
 * hierarchical project task structures.
 */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { LoadingDialog, LOADER_COLORS } from '@/components/wbs-dialogs';
import { WBSNodeComponent } from '@/components/wbs-tree/wbs-node-component';
import { type WBSTreeProps, type WBSDemoProps, type WBSNode } from '@/components/wbs-tree/types/wbs-types';
import { useWBSDatabase } from '@/lib/hooks/wbs/use-wbs-database';
import { useWBSTreeState } from '@/lib/hooks/wbs/use-wbs-tree-state';

/**
 * WBSTree Component
 * 
 * Main component for rendering a Work Breakdown Structure tree with full CRUD capabilities.
 * Supports hierarchical task management, drag-and-drop reordering, and real-time updates.
 * 
 * @param projectId - Unique identifier for the project containing the WBS data
 * @param editable - Controls whether the tree allows editing operations (default: false)
 */
const WBSTree: React.FC<WBSTreeProps> = ({ projectId, editable = false }) => {
  // Database operations and state management
  const database = useWBSDatabase(projectId);
  const { expandedNodes, handleToggle, expandAll, collapseAll } = useWBSTreeState(database.wbsData);
  
  // Local state for root-level task creation loading indicator
  const [rootLoadingDialog, setRootLoadingDialog] = useState({
    isOpen: false,
    message: '',
    type: 'create' as keyof typeof LOADER_COLORS
  });

  /**
   * Handles creation of root-level tasks from the main action button.
   * Shows loading state during creation and handles errors gracefully.
   */
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

  // Loading state - shows spinner while data is being fetched
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

  // Error state - displays user-friendly error message when data loading fails
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

  // Shared button styles for consistent UI appearance
  const buttonClass = "px-3 py-2 text-sm rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const isLoading = rootLoadingDialog.isOpen;

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Header section with title and action buttons */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Work Breakdown Structure</h2>
        <div className="flex space-x-2 flex-wrap">
          {/* Tree navigation controls */}
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
          {/* Root task creation button - only visible in edit mode */}
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

      {/* Main tree container - disabled during loading operations */}
      <div className={`bg-gray-50 rounded-lg p-4 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
        {database.wbsData.length === 0 ? (
          // Empty state message
          <div className="text-center py-8 text-gray-500">
            No tasks found. {editable && 'Click "Add Root Task" to get started.'}
          </div>
        ) : (
          // Render root nodes recursively - each node renders its own children
          database.wbsData.map((node: WBSNode, index: number) => (
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
              allNodes={database.wbsData}
            />
          ))
        )}
      </div>

      {/* Loading dialog for root task creation operations */}
      <LoadingDialog
        isOpen={rootLoadingDialog.isOpen}
        message={rootLoadingDialog.message}
        type={rootLoadingDialog.type}
      />
    </div>
  );
};

/**
 * WBSDemo Component
 * 
 * Demo wrapper component that provides a toggle for edit mode functionality.
 * Useful for testing and demonstration purposes, showing how the tree behaves
 * in both read-only and editable states.
 * 
 * @param projectId - Project identifier (defaults to "1" for demo purposes)
 */
const WBSDemo: React.FC<WBSDemoProps> = ({ projectId = "1" }) => {
  const [isEditable, setIsEditable] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        {/* Edit mode toggle control */}
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
        {/* Main WBS tree component */}
        <WBSTree projectId={projectId} editable={isEditable} />
      </div>
    </div>
  );
};

export default WBSDemo;