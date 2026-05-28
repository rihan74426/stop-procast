"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

/**
 * ConfirmModal — reusable confirmation dialog.
 * Replaces all window.confirm() usage.
 *
 * Usage:
 *   <ConfirmModal
 *     open={show}
 *     onClose={() => setShow(false)}
 *     onConfirm={handleDelete}
 *     title="Delete project?"
 *     description="This cannot be undone."
 *     confirmLabel="Delete"
 *     confirmVariant="danger"
 *     loading={deleting}
 *   />
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  loading = false,
}) {
  const { t } = useI18n();

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-5">
        {description && (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t("common_cancel")}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
