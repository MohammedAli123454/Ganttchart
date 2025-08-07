/**
 * Core WBS Node interface representing a single task in the work breakdown structure
 */
export interface WBSNode {
  id: string;               // Unique identifier for the node
  name: string;             // Display name/title of the task
  children?: WBSNode[];     // Optional array of child nodes for hierarchical structure
  parentId?: string;        // Optional parent node ID for relationship tracking
  isProjectRoot?: boolean;  // Flag indicating if this is the project root node
}

/**
 * Data structure for drag-and-drop operations containing source node information
 */
export interface DragData {
  nodeId: string;                   // ID of the node being dragged
  sourceParentId: string | null;    // ID of the source parent (null for root nodes)
  sourceIndex: number;              // Original position index within parent's children
}

/**
 * Props interface for individual WBS node components
 */
export interface WBSNodeProps {
  node: WBSNode;                    // The node data to render
  level: number;                    // Depth level in the tree hierarchy
  index: number;                    // Position index within parent's children array
  parentId: string | null;          // Parent node ID (null for root nodes)
  onToggle?: (nodeId: string) => void;  // Callback for expand/collapse operations
  expanded: boolean;                // Whether this node is currently expanded
  expandedNodes: Set<string>;       // Set of all currently expanded node IDs
  onNodeAdd?: (parentId: string | null, node: Omit<WBSNode, 'id'>) => Promise<void>;     // Add node callback
  onNodeEdit?: (nodeId: string, updates: Partial<WBSNode>) => Promise<void>;             // Edit node callback
  onNodeDelete?: (nodeId: string) => Promise<void>;                                      // Delete node callback
  onNodeMove?: (dragData: DragData, targetParentId: string | null, targetIndex: number) => Promise<void>; // Move node callback
  editable?: boolean;               // Whether editing operations are allowed
  treeDisabled?: boolean;           // Whether the entire tree is disabled
  allNodes?: WBSNode[];             // All nodes in the tree for context in loading messages
}

/**
 * Props interface for the main WBS Tree component
 */
export interface WBSTreeProps {
  projectId: string;        // Unique identifier for the project
  editable?: boolean;       // Whether the tree allows editing operations
}

/**
 * Props interface for the WBS Demo wrapper component
 */
export interface WBSDemoProps {
  projectId?: string;       // Optional project identifier (defaults to "1")
}