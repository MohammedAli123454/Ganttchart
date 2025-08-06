import { useCallback } from 'react';
import { useWBSNodes, useCreateWBSNode, useUpdateWBSNode, useDeleteWBSNode, useMoveWBSNode } from '@/lib/hooks/use-wbs-nodes';
import type { WBSNode, DragData } from '@/components/wbs-tree/types/wbs-types';

export const useWBSDatabase = (projectId: string) => {
  const { data: wbsData = [], isLoading, error } = useWBSNodes(projectId);
  const createNodeMutation = useCreateWBSNode();
  const updateNodeMutation = useUpdateWBSNode();
  const deleteNodeMutation = useDeleteWBSNode();
  const moveNodeMutation = useMoveWBSNode();

  const findParent = useCallback((nodes: WBSNode[], parentId: string): WBSNode | null => {
    for (const node of nodes) {
      if (node.id === parentId) return node;
      if (node.children) {
        const found = findParent(node.children, parentId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const addNode = useCallback(async (parentId: string | null, nodeData: Omit<WBSNode, 'id'>) => {
    const order = parentId 
      ? findParent(wbsData, parentId)?.children?.length || 0
      : wbsData.length;

    await createNodeMutation.mutateAsync({
      projectId,
      parentId: parentId || undefined,
      name: nodeData.name,
      order
    });
  }, [projectId, wbsData, createNodeMutation, findParent]);

  const editNode = useCallback(async (nodeId: string, updates: Partial<WBSNode>) => {
    await updateNodeMutation.mutateAsync({
      nodeId,
      data: { name: updates.name },
      projectId
    });
  }, [updateNodeMutation, projectId]);

  const deleteNode = useCallback(async (nodeId: string) => {
    await deleteNodeMutation.mutateAsync({ nodeId, projectId });
  }, [deleteNodeMutation, projectId]);

  const moveNode = useCallback(async (dragData: DragData, targetParentId: string | null, targetIndex: number) => {
    await moveNodeMutation.mutateAsync({
      data: {
        nodeId: dragData.nodeId,
        targetParentId: targetParentId || undefined,
        targetIndex
      },
      projectId
    });
  }, [moveNodeMutation, projectId]);

  return {
    wbsData,
    addNode,
    editNode,
    deleteNode,
    moveNode,
    isLoading,
    error,
    isCreating: createNodeMutation.isPending,
    isUpdating: updateNodeMutation.isPending,
    isDeleting: deleteNodeMutation.isPending,
    isMoving: moveNodeMutation.isPending
  };
};