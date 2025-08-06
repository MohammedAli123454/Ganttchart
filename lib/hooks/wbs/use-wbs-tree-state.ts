import { useState, useCallback } from 'react';
import type { WBSNode } from '@/components/wbs-tree/types/wbs-types';

export const useWBSTreeState = (data: WBSNode[]) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const getAllNodeIds = useCallback((nodes: WBSNode[]): string[] => {
    return nodes.reduce<string[]>((ids, node) => {
      ids.push(node.id);
      if (node.children) {
        ids.push(...getAllNodeIds(node.children));
      }
      return ids;
    }, []);
  }, []);

  const expandAll = useCallback(() => {
    setExpandedNodes(new Set(getAllNodeIds(data)));
  }, [data, getAllNodeIds]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  return { expandedNodes, handleToggle, expandAll, collapseAll };
};