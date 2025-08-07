/**
 * Work Breakdown Structure (WBS) Tree Component
 * 
 * This module provides a comprehensive WBS tree implementation with drag-and-drop functionality,
 * inline editing, and full CRUD operations. It serves as the main entry point for managing
 * hierarchical project task structures.
 */

import React, { useState } from 'react';
import { Plus, HelpCircle, X } from 'lucide-react';
import { LoadingDialog, LOADER_COLORS } from '@/components/wbs-dialogs';
import { WBSNodeComponent } from '@/components/wbs-tree/wbs-node-component';
import { type WBSTreeProps, type WBSDemoProps, type WBSNode } from '@/components/wbs-tree/types/wbs-types';
import { useWBSDatabase } from '@/lib/hooks/wbs/use-wbs-database';
import { useWBSTreeState } from '@/lib/hooks/wbs/use-wbs-tree-state';
import { useProject } from '@/lib/hooks/useProjects';


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
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  
  // The project root node is now part of the database WBS data
  const virtualRootData = React.useMemo(() => {
    if (database.isLoading) return [];
    return database.wbsData;
  }, [database.wbsData, database.isLoading]);
  
  const { expandedNodes, handleToggle, expandAll, collapseAll } = useWBSTreeState(virtualRootData);
  
  // Ensure project root is expanded by default
  React.useEffect(() => {
    if (virtualRootData.length > 0) {
      // Find the project root node (isProjectRoot flag or first root node)
      const projectRootNode = virtualRootData.find(node => node.isProjectRoot) || virtualRootData[0];
      if (projectRootNode && !expandedNodes.has(projectRootNode.id)) {
        handleToggle(projectRootNode.id);
      }
    }
  }, [virtualRootData, expandedNodes, handleToggle]);
  
  // Local state for root-level task creation loading indicator
  const [rootLoadingDialog, setRootLoadingDialog] = useState({
    isOpen: false,
    message: '',
    type: 'create' as keyof typeof LOADER_COLORS
  });

  // State for right-click context menu
  const [rightClickMenuOpen, setRightClickMenuOpen] = useState(false);
  const [rightClickPosition, setRightClickPosition] = useState({ x: 0, y: 0 });

  // State for WBS information dialog
  const [wbsInfoOpen, setWbsInfoOpen] = useState(false);

  /**
   * Handles creation of root-level tasks from the right-click menu.
   * Shows loading state during creation and handles errors gracefully.
   */
  const handleAddRootFromMenu = async () => {
    if (database.addNode) {
      setRootLoadingDialog({ isOpen: true, message: 'Creating root task...', type: 'create' });
      try {
        await database.addNode(null, { name: "New WBS" });
        setRightClickMenuOpen(false);
      } finally {
        setRootLoadingDialog({ isOpen: false, message: '', type: 'create' });
      }
    }
  };

  /**
   * Handles right-click on the tree container to show context menu
   */
  const handleTreeRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRightClickPosition({ x: e.clientX, y: e.clientY });
    setRightClickMenuOpen(true);
  };

  // Loading state - shows spinner while data is being fetched
  if (database.isLoading || projectLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading project data...</p>
        </div>
      </div>
    );
  }

  // Error state - displays user-friendly error message when data loading fails
  if (database.error || projectError) {
    const error = database.error || projectError;
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading project data</h3>
          <p className="text-red-600 mt-1">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  // Shared button styles for consistent UI appearance
  const buttonClass = "px-3 py-2 text-sm rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const isLoading = rootLoadingDialog.isOpen;

  return (
    <div className="w-full mx-auto p-4">
      <div className="flex gap-6">
        {/* Left sidebar with controls */}
        <div className="w-64 flex-shrink-0">
          <div className="space-y-4">
            {/* Tree navigation controls */}
            <div className="space-y-2">
              <button
                onClick={expandAll}
                disabled={isLoading}
                className={`w-full ${buttonClass} bg-gray-100 text-gray-700 hover:bg-gray-200`}
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                disabled={isLoading}
                className={`w-full ${buttonClass} bg-gray-100 text-gray-700 hover:bg-gray-200`}
              >
                Collapse All
              </button>
              <button
                onClick={() => setWbsInfoOpen(true)}
                className={`w-full ${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
                title="Learn about Work Breakdown Structure"
              >
                <HelpCircle size={16} className="inline mr-2" />
                WBS Definition
              </button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1">
          {/* Header with title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 ml-4">Work Breakdown Structure</h2>
          </div>

          {/* Main tree container - disabled during loading operations */}
          <div 
            className={`bg-white rounded-lg p-4 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
            onContextMenu={editable && !isLoading ? handleTreeRightClick : undefined}
          >
        {virtualRootData.length === 0 ? (
          // Empty state message
          <div className="text-center py-8 text-gray-500 min-h-32">
            Loading project...
          </div>
        ) : (
          // Render WBS nodes directly, including project root node
          virtualRootData.map((node: WBSNode, index: number) => (
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
              editable={editable && !isLoading && !node.isProjectRoot}
              treeDisabled={isLoading}
              allNodes={database.wbsData}
            />
          ))
        )}
          </div>
        </div>
      </div>

      {/* Loading dialog for root task creation operations */}
      <LoadingDialog
        isOpen={rootLoadingDialog.isOpen}
        message={rootLoadingDialog.message}
        type={rootLoadingDialog.type}
      />

      {/* Right-click context menu for adding root tasks */}
      {rightClickMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setRightClickMenuOpen(false)}
            onContextMenu={(e) => e.preventDefault()}
          />
          
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48"
            style={{
              left: Math.min(rightClickPosition.x, window.innerWidth - 200),
              top: Math.min(rightClickPosition.y, window.innerHeight - 100),
              transform: 'translate(0, 0)'
            }}
          >
            <button
              onClick={handleAddRootFromMenu}
              disabled={isLoading}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Root Task
            </button>
          </div>
        </>
      )}

      {/* WBS Information Dialog */}
      {wbsInfoOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setWbsInfoOpen(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">What is a Work Breakdown Structure (WBS)?</h3>
                <button
                  onClick={() => setWbsInfoOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-600" />
                </button>
              </div>

              {/* Dialog Content */}
              <div className="p-6 space-y-6">
                {/* Definition */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Definition</h4>
                  <p className="text-gray-700 leading-relaxed">
                    A Work Breakdown Structure (WBS) is a hierarchical decomposition of a project into smaller, 
                    more manageable components. It organizes and defines the total scope of the project by breaking 
                    it down into deliverable-oriented tasks and subtasks.
                  </p>
                </div>

                {/* Key Benefits */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Key Benefits</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span><strong>Clear Project Scope:</strong> Defines exactly what work needs to be done and prevents scope creep</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span><strong>Better Planning:</strong> Enables accurate time and resource estimation for each work package</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span><strong>Task Assignment:</strong> Makes it easy to assign responsibilities to team members</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span><strong>Progress Tracking:</strong> Provides a framework for monitoring project completion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span><strong>Risk Management:</strong> Helps identify potential risks at the task level</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span><strong>Communication:</strong> Creates a common understanding among all stakeholders</span>
                    </li>
                  </ul>
                </div>


                {/* Best Practices */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Best Practices</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Keep tasks at a manageable size (typically 8-80 hours of work)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Focus on deliverables and outcomes, not just activities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Use clear, action-oriented task names</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Involve your team in creating the WBS for better buy-in</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Review and update the WBS as the project evolves</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* Dialog Footer */}
              <div className="border-t border-gray-200 p-6">
                <button
                  onClick={() => setWbsInfoOpen(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Got it, let's build our WBS!
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * WBSDemo Component
 * 
 * Demo wrapper component that provides the WBS tree functionality.
 * 
 * @param projectId - Project identifier (defaults to "1" for demo purposes)
 */
const WBSDemo: React.FC<WBSDemoProps> = ({ projectId = "1" }) => {
  return (
    <div className="w-full bg-white">
      {/* Main WBS tree component */}
      <WBSTree projectId={projectId} editable={true} />
    </div>
  );
};

export default WBSDemo;