/**
 * WBS Demo Video Component
 * 
 * An interactive animated demonstration showing how to use the WBS tree
 * Simulates adding, editing, moving, and deleting nodes with step-by-step narration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Play, Pause, RotateCcw } from 'lucide-react';

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
  parentId?: string;
  isProjectRoot?: boolean;
  isExpanded?: boolean;
  isHighlighted?: boolean;
  isEditing?: boolean;
  isNew?: boolean;
}

interface DemoStep {
  id: number;
  title: string;
  description: string;
  duration: number;
  action: (nodes: DemoNode[]) => DemoNode[];
}

const WBSDemoVideo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [nodes, setNodes] = useState<DemoNode[]>([]);
  const [progress, setProgress] = useState(0);

  // Initial demo data
  const initialNodes: DemoNode[] = [
    {
      id: 'project-1',
      name: 'E-Commerce Website',
      isProjectRoot: true,
      isExpanded: true,
      children: []
    }
  ];

  // Demo steps with animations
  const demoSteps: DemoStep[] = [
    {
      id: 1,
      title: 'Starting with Project Root',
      description: 'Every WBS starts with your project name as the root node',
      duration: 2000,
      action: (nodes) => [...initialNodes]
    },
    {
      id: 2,
      title: 'Adding Main Categories',
      description: 'Right-click to add major work categories',
      duration: 3000,
      action: (nodes) => [
        {
          ...nodes[0],
          children: [
            { id: 'design-1', name: 'Design Phase', parentId: 'project-1', isNew: true, isHighlighted: true }
          ]
        }
      ]
    },
    {
      id: 3,
      title: 'Adding More Categories',
      description: 'Continue adding main categories to organize your work',
      duration: 3000,
      action: (nodes) => [
        {
          ...nodes[0],
          children: [
            { ...nodes[0].children![0], isNew: false, isHighlighted: false },
            { id: 'dev-1', name: 'Development Phase', parentId: 'project-1', isNew: true, isHighlighted: true }
          ]
        }
      ]
    },
    {
      id: 4,
      title: 'Completing Main Structure',
      description: 'Add all major categories to complete the main structure',
      duration: 3000,
      action: (nodes) => [
        {
          ...nodes[0],
          children: [
            { id: 'design-1', name: 'Design Phase', parentId: 'project-1' },
            { id: 'dev-1', name: 'Development Phase', parentId: 'project-1' },
            { id: 'test-1', name: 'Testing Phase', parentId: 'project-1', isNew: true, isHighlighted: true }
          ]
        }
      ]
    },
    {
      id: 5,
      title: 'Adding Subtasks',
      description: 'Click the menu button to add subtasks to any category',
      duration: 4000,
      action: (nodes) => [
        {
          ...nodes[0],
          children: [
            {
              id: 'design-1',
              name: 'Design Phase',
              parentId: 'project-1',
              isExpanded: true,
              isHighlighted: true,
              children: [
                { id: 'ui-1', name: 'UI/UX Design', parentId: 'design-1', isNew: true }
              ]
            },
            { id: 'dev-1', name: 'Development Phase', parentId: 'project-1' },
            { id: 'test-1', name: 'Testing Phase', parentId: 'project-1' }
          ]
        }
      ]
    },
    {
      id: 6,
      title: 'Adding More Subtasks',
      description: 'Continue breaking down tasks into manageable pieces',
      duration: 3000,
      action: (nodes) => [
        {
          ...nodes[0],
          children: [
            {
              id: 'design-1',
              name: 'Design Phase',
              parentId: 'project-1',
              isExpanded: true,
              children: [
                { id: 'ui-1', name: 'UI/UX Design', parentId: 'design-1' },
                { id: 'db-1', name: 'Database Design', parentId: 'design-1', isNew: true, isHighlighted: true }
              ]
            },
            { id: 'dev-1', name: 'Development Phase', parentId: 'project-1' },
            { id: 'test-1', name: 'Testing Phase', parentId: 'project-1' }
          ]
        }
      ]
    },
    {
      id: 7,
      title: 'Editing Task Names',
      description: 'Double-click any task to edit its name',
      duration: 3000,
      action: (nodes) => [
        {
          ...nodes[0],
          children: [
            {
              id: 'design-1',
              name: 'Design Phase',
              parentId: 'project-1',
              isExpanded: true,
              children: [
                { id: 'ui-1', name: 'UI/UX Design', parentId: 'design-1' },
                { id: 'db-1', name: 'Database Architecture', parentId: 'design-1', isEditing: true, isHighlighted: true }
              ]
            },
            { id: 'dev-1', name: 'Development Phase', parentId: 'project-1' },
            { id: 'test-1', name: 'Testing Phase', parentId: 'project-1' }
          ]
        }
      ]
    },
    {
      id: 8,
      title: 'Expanding Development Phase',
      description: 'Click the expand button to add subtasks to Development',
      duration: 3000,
      action: (nodes) => [
        {
          ...nodes[0],
          children: [
            {
              id: 'design-1',
              name: 'Design Phase',
              parentId: 'project-1',
              isExpanded: true,
              children: [
                { id: 'ui-1', name: 'UI/UX Design', parentId: 'design-1' },
                { id: 'db-1', name: 'Database Architecture', parentId: 'design-1' }
              ]
            },
            {
              id: 'dev-1',
              name: 'Development Phase',
              parentId: 'project-1',
              isExpanded: true,
              isHighlighted: true,
              children: [
                { id: 'frontend-1', name: 'Frontend Development', parentId: 'dev-1', isNew: true }
              ]
            },
            { id: 'test-1', name: 'Testing Phase', parentId: 'project-1' }
          ]
        }
      ]
    },
    {
      id: 9,
      title: 'Complete WBS Structure',
      description: 'Your WBS is now organized with clear hierarchy and manageable tasks',
      duration: 3000,
      action: (nodes) => [
        {
          ...nodes[0],
          children: [
            {
              id: 'design-1',
              name: 'Design Phase',
              parentId: 'project-1',
              isExpanded: true,
              children: [
                { id: 'ui-1', name: 'UI/UX Design', parentId: 'design-1' },
                { id: 'db-1', name: 'Database Architecture', parentId: 'design-1' }
              ]
            },
            {
              id: 'dev-1',
              name: 'Development Phase',
              parentId: 'project-1',
              isExpanded: true,
              children: [
                { id: 'frontend-1', name: 'Frontend Development', parentId: 'dev-1' },
                { id: 'backend-1', name: 'Backend Development', parentId: 'dev-1', isNew: true, isHighlighted: true }
              ]
            },
            { id: 'test-1', name: 'Testing Phase', parentId: 'project-1' }
          ]
        }
      ]
    }
  ];

  // Auto-play demo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentStep < demoSteps.length) {
      interval = setInterval(() => {
        const currentStepData = demoSteps[currentStep];
        setNodes(currentStepData.action(nodes));
        setProgress((currentStep + 1) / demoSteps.length * 100);
        
        setTimeout(() => {
          setCurrentStep(prev => prev + 1);
        }, currentStepData.duration);
      }, 100);
    } else if (currentStep >= demoSteps.length) {
      setIsPlaying(false);
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentStep]);

  // Initialize demo
  useEffect(() => {
    setNodes(initialNodes);
  }, []);

  const handlePlay = () => {
    if (currentStep >= demoSteps.length) {
      handleReset();
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setProgress(0);
    setNodes(initialNodes);
  };

  // Render demo node
  const renderDemoNode = (node: DemoNode, level: number = 0) => {
    const hasChildren = Boolean(node.children?.length);
    const paddingLeft = level * 24;

    return (
      <div key={node.id} className="mb-1">
        {/* Node container */}
        <div 
          className={`flex items-center p-2 rounded-lg transition-all duration-500 ${
            node.isHighlighted 
              ? 'bg-blue-100 border-2 border-blue-300 shadow-md' 
              : node.isNew 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-white border border-gray-200'
          }`}
          style={{ marginLeft: `${paddingLeft}px` }}
        >
          {/* Expand/collapse button */}
          <button className={`mr-2 p-1 rounded transition-colors ${hasChildren ? 'text-gray-600' : 'text-transparent'}`}>
            {hasChildren && node.isExpanded ? <ChevronDown size={16} /> :
             hasChildren ? <ChevronRight size={16} /> :
             <div className="w-4 h-4" />}
          </button>
          
          {/* Node content */}
          <div className="flex-1 min-w-0">
            {node.isEditing ? (
              <input
                type="text"
                value={node.name}
                className="w-full p-1 border border-blue-300 rounded bg-white"
                readOnly
              />
            ) : (
              <span className={`text-gray-900 ${
                hasChildren || node.isProjectRoot ? 'font-bold' : 'font-medium'
              }`}>
                {node.name}
              </span>
            )}
          </div>
          
          {/* Actions menu */}
          {!node.isProjectRoot && (
            <button className="h-8 w-8 p-0 opacity-60 hover:opacity-100 text-gray-500">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Child nodes */}
        {hasChildren && node.isExpanded && (
          <div className="mt-1">
            {node.children!.map(child => renderDemoNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Demo Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Play'} Demo
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="flex-1 mx-4">
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <span className="text-sm text-gray-600">
          Step {Math.min(currentStep + 1, demoSteps.length)} of {demoSteps.length}
        </span>
      </div>

      {/* Current step info */}
      {currentStep < demoSteps.length && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-1">{demoSteps[currentStep]?.title}</h4>
          <p className="text-blue-700 text-sm">{demoSteps[currentStep]?.description}</p>
        </div>
      )}

      {/* Demo WBS Tree */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[300px]">
        <h3 className="font-semibold text-gray-900 mb-3">WBS Demo - Interactive Tutorial</h3>
        <div className="space-y-1">
          {nodes.map(node => renderDemoNode(node))}
          {nodes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Click "Play Demo" to see how to build a WBS tree!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WBSDemoVideo;