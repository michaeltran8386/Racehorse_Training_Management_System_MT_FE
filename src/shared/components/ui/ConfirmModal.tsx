import type { ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { tr, trNode } from "@/shared/i18n/tr";
import styles from "./ConfirmModal.module.css";

interface ConfirmModalProps {
  title: string;
  subtitle?: string;
  tone?: "danger" | "warn" | "info";
  callout?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  confirmIcon?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmModal({
  title, subtitle, tone = "danger", callout, confirmLabel, cancelLabel,
  confirmIcon, busy, onConfirm, onCancel, children,
}: ConfirmModalProps) {
  return (
    <Modal
      title={title}
      subtitle={subtitle}
      tone={tone === "info" ? undefined : tone}
      onClose={busy ? undefined : onCancel}
      foot={
        <>
          <Button tone="secondary" disabled={busy} onClick={onCancel}>{cancelLabel}</Button>
          <Button tone={tone === "danger" ? "danger" : "primary"} icon={confirmIcon} disabled={busy} onClick={onConfirm}>
            {busy ? tr("Processing...") : confirmLabel}
          </Button>
        </>
      }
    >
      {callout && <div className={styles.callout}>{trNode(callout)}</div>}
      {children && <div className={styles.content}>{trNode(children)}</div>}
    </Modal>
  );
}
