/**
 * WBS Tree Module Exports
 * 
 * Central export file for all Work Breakdown Structure tree components,
 * types, and related hooks. Provides a clean public API for consuming
 * the WBS functionality throughout the application.
 */

// Core UI Components
export { NodeContextMenu } from './wbs-node-context-menu';
export { RightClickContextMenu } from './wbs-right-click-menu';
export { InlineAddInput } from './wbs-inline-add-input';
export { WBSNodeComponent } from './wbs-node-component';

// TypeScript Type Definitions
export type { 
  WBSNode,          // Core node data structure
  DragData,         // Drag-and-drop operation data
  WBSNodeProps,     // Individual node component props
  WBSTreeProps,     // Main tree component props
  WBSDemoProps      // Demo wrapper component props
} from './types/wbs-types';

// Custom React Hooks
export { useWBSDatabase } from '@/lib/hooks/wbs/use-wbs-database';      // Database operations and state
export { useWBSTreeState } from '@/lib/hooks/wbs/use-wbs-tree-state';   // Tree expansion state management
export { useNodeHandlers } from '@/lib/hooks/wbs/use-node-handlers';     // Individual node event handlers