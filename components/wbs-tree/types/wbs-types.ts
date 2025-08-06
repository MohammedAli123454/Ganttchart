export interface WBSNode {
  id: string;
  name: string;
  children?: WBSNode[];
  parentId?: string;
}

export interface DragData {
  nodeId: string;
  sourceParentId: string | null;
  sourceIndex: number;
}

export interface WBSNodeProps {
  node: WBSNode;
  level: number;
  index: number;
  parentId: string | null;
  onToggle?: (nodeId: string) => void;
  expanded: boolean;
  expandedNodes: Set<string>;
  onNodeAdd?: (parentId: string | null, node: Omit<WBSNode, 'id'>) => Promise<void>;
  onNodeEdit?: (nodeId: string, updates: Partial<WBSNode>) => Promise<void>;
  onNodeDelete?: (nodeId: string) => Promise<void>;
  onNodeMove?: (dragData: DragData, targetParentId: string | null, targetIndex: number) => Promise<void>;
  editable?: boolean;
  treeDisabled?: boolean;
}

export interface WBSTreeProps {
  projectId: string;
  editable?: boolean;
}

export interface WBSDemoProps {
  projectId?: string;
}