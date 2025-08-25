"use client";

import React from "react";
import { Modal, Text } from "@shopify/polaris";

interface DeleteConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  loading = false,
  title = "Delete item?",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
}) => {
  return (
    <>
      {/* Inline style override for modal background */}
      <style>
        {`
          .Polaris-Backdrop {
            backdrop-filter: blur(1px);
            -webkit-backdrop-filter: blur(6px);
            background-color: rgba(255, 255, 255, 0.01); /* Transparent but triggers blur */
          }
        `}
      </style>

      <Modal
        open={open}
        onClose={onClose}
        title={title}
        primaryAction={{
          content: confirmText,
          onAction: onConfirm,
          destructive: true,
          loading: loading,
        }}
        secondaryActions={[
          {
            content: cancelText,
            onAction: onClose,
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">{message}</Text>
        </Modal.Section>
      </Modal>
    </>
  );
};

export default DeleteConfirmationModal;