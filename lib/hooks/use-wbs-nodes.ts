import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface WBSNode {
  id: string;
  name: string;
  children?: WBSNode[];
  parentId?: string;
}

interface CreateWBSNodeData {
  projectId: string;
  parentId?: string;
  name: string;
  order?: number;
}

interface UpdateWBSNodeData {
  name?: string;
  parentId?: string;
  order?: number;
}

interface MoveWBSNodeData {
  nodeId: string;
  targetParentId?: string;
  targetIndex: number;
}

// Fetch WBS nodes for a project
export function useWBSNodes(projectId: string) {
  return useQuery({
    queryKey: ['wbs-nodes', projectId],
    queryFn: async (): Promise<WBSNode[]> => {
      const response = await fetch(`/api/wbs-nodes?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch WBS nodes');
      }
      return response.json();
    },
    enabled: !!projectId,
  });
}

// Create a new WBS node
export function useCreateWBSNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWBSNodeData): Promise<WBSNode> => {
      const response = await fetch('/api/wbs-nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create WBS node');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch WBS nodes for the project
      queryClient.invalidateQueries({ queryKey: ['wbs-nodes', variables.projectId] });
    },
  });
}

// Update a WBS node
export function useUpdateWBSNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nodeId, data }: { nodeId: string; data: UpdateWBSNodeData; projectId: string }): Promise<WBSNode> => {
      const response = await fetch(`/api/wbs-nodes/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update WBS node');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch WBS nodes for the project
      queryClient.invalidateQueries({ queryKey: ['wbs-nodes', variables.projectId] });
    },
  });
}

// Delete a WBS node
export function useDeleteWBSNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nodeId }: { nodeId: string; projectId: string }): Promise<void> => {
      const response = await fetch(`/api/wbs-nodes/${nodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete WBS node');
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch WBS nodes for the project
      queryClient.invalidateQueries({ queryKey: ['wbs-nodes', variables.projectId] });
    },
  });
}

// Move a WBS node
export function useMoveWBSNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data }: { data: MoveWBSNodeData; projectId: string }): Promise<void> => {
      const response = await fetch('/api/wbs-nodes/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to move WBS node');
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch WBS nodes for the project
      queryClient.invalidateQueries({ queryKey: ['wbs-nodes', variables.projectId] });
    },
  });
}