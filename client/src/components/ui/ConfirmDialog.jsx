import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-4">
        <div
          className={`p-2.5 rounded-[2px] shrink-0 ${
            confirmVariant === 'danger'
              ? 'bg-[#F9ECEB] text-[#A4493D] border border-[#A4493D]/30'
              : 'bg-[#F7F3EC] text-[#B08D57] border border-[#B08D57]/30'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-[#7A726A] leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#DDD8CF]">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          size="sm"
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={confirmVariant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          disabled={isLoading}
          size="sm"
          className="flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
