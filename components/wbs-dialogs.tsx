import React from 'react';
import { BeatLoader, BarLoader } from 'react-spinners';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const LOADER_COLORS = {
  create: '#3b82f6',
  update: '#6b7280',
  delete: '#ef4444'
} as const;

export const LoadingDialog: React.FC<{
  isOpen: boolean;
  message: string;
  type: keyof typeof LOADER_COLORS;
}> = ({ isOpen, message, type }) => {
  if (!isOpen) return null;
  const color = LOADER_COLORS[type];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <BeatLoader color={color} size={12} margin={2} />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">{message}</p>
        <div className="mt-4">
          <BarLoader color={color} width="100%" height={3} />
        </div>
      </div>
    </div>
  );
};

export const DeleteConfirmationDialog: React.FC<{
  isOpen: boolean;
  nodeName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ isOpen, nodeName, onConfirm, onCancel, isDeleting }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onCancel()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete WBS Task</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete &quot;{nodeName}&quot;? This action cannot be undone and will also remove all child tasks.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? (
            <>
              <BeatLoader size={8} color="white" />
              <span className="ml-2">Deleting...</span>
            </>
          ) : (
            'Delete'
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export { LOADER_COLORS };