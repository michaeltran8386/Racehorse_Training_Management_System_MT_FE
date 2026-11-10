import { useState } from "react";
import type { ReactNode } from "react";
import { Field } from "@/shared/components/form/Field";
import { Textarea } from "@/shared/components/form/Textarea";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";

import { tr } from "@/shared/i18n/tr";
interface ReasonConfirmModalProps {
  title: string;
  subtitle?: string;
  tone?: "danger" | "warn";
  confirmLabel: string;
  cancelLabel: string;
  reasonHint: string; // lý do sẽ hiện ở đâu (tab Locked, màn đăng nhập, email…)
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  children?: ReactNode; // hậu quả của hành động
}

// Hộp xác nhận kèm ô "Reason" (bắt buộc 10–300 ký tự — khớp backend):
// dùng cho từ chối, khóa, vô hiệu hóa tài khoản.
export function ReasonConfirmModal({ reasonHint, onConfirm, children, ...rest }: ReasonConfirmModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const confirm = () => {
    const text = reason.trim();
    if (text.length < 10) {
      setError(tr("Reason must be 10 to 300 characters."));
      return;
    }
    onConfirm(text);
  };

  return (
    <ConfirmModal {...rest} onConfirm={confirm}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        {children && <div>{children}</div>}
        <Field label={tr("Reason")} required hint={reasonHint} error={error || undefined}>
          <Textarea
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
          />
        </Field>
      </div>
    </ConfirmModal>
  );
}
