import { useState } from "react";
import type { FormEvent } from "react";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { ApiError } from "@/shared/lib/api";
import { formatDateTime } from "@/shared/lib/format";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import { ROLE_LABEL } from "@/shared/lib/permissions";
import { ACCOUNT_STATUS } from "@/shared/lib/status";
import type { AccountStatus, PublicAccount } from "@/shared/types/auth";
import { updateAccount } from "../api";
import styles from "./EditAccountModal.module.css";
import { fullNameError } from "@/shared/lib/name";
import { VN_PHONE_RE, normalizeVnPhone } from "@/shared/lib/phone";

import { tr } from "@/shared/i18n/tr";
// Chỉ xóa hẳn được tài khoản chưa từng hoạt động (khớp backend); tài khoản đã dùng thì vô hiệu hóa.
const DELETABLE: AccountStatus[] = ["INVITED", "PENDING_EMAIL", "REJECTED"];

interface EditAccountModalProps {
  account: PublicAccount;
  isSelf: boolean;
  isLastManager: boolean; // Club Manager hoạt động cuối cùng
  onClose: () => void;
  onSaved: (account: PublicAccount) => void;
  onDeactivate: () => void; // mở hộp xác nhận vô hiệu hóa (trang cha lo)
  onDelete: () => void; // mở hộp xác nhận xóa hẳn (trang cha lo)
  onUnlock?: () => void; // mở hộp xác nhận mở khóa (trang cha lo)
}

// Club Manager sửa họ tên + số điện thoại của một tài khoản, xem ai mời / ai đổi trạng thái gần nhất,
// và (vùng cuối) vô hiệu hóa hoặc xóa hẳn tài khoản. Email và vai trò chỉ để xem.
export function EditAccountModal({ account, isSelf, isLastManager, onClose, onSaved, onDeactivate, onDelete, onUnlock }: EditAccountModalProps) {
  const { isVietnamese, t } = useAppLanguage();
  const [fullName, setFullName] = useState(account.fullName);
  const [phone, setPhone] = useState(account.phone);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const status = ACCOUNT_STATUS[account.status];
  const unchanged = fullName.trim() === account.fullName && phone.trim() === account.phone;
  const deletable = DELETABLE.includes(account.status);
  const canDeactivate = account.status === "ACTIVE" || account.status === "LOCKED";
  const removeBlocked = isSelf
    ? (isVietnamese ? "Bạn không thể thao tác trên tài khoản của chính mình. Hãy nhờ một Quản trị viên khác." : "You cannot do this to your own account. Ask another Club Manager.")
    : isLastManager
      ? (isVietnamese ? "Câu lạc bộ phải duy trì ít nhất một Quản trị viên hoạt động." : "The club must keep at least one active Club Manager.")
      : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (fullNameError(fullName)) return setErrors({ fullName: fullNameError(fullName) });

    const cleanPhone = normalizeVnPhone(phone.trim());
    if (cleanPhone && !VN_PHONE_RE.test(cleanPhone)) {
      return setErrors({ phone: t("phoneValidation.error") });
    }

    setBusy(true);
    setErrors({});
    try {
      const res = await updateAccount(account.id, { fullName: fullName.trim(), phone: cleanPhone });
      onSaved(res.account);
    } catch (err) {
      const field = err instanceof ApiError ? err.data.field : undefined;
      if (field === "fullName" || field === "phone") setErrors({ [field]: messageFor(err) });
      else setErrors({ form: messageFor(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={tr("Edit account")} subtitle={`${tr(ROLE_LABEL[account.role])} · ${account.email}`} width={500} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <dl className={styles.facts}>
          <dt>{tr("Status")}</dt>
          <dd>
            <Badge tone={status.tone}>{status.label}</Badge>
          </dd>
          <dt>{tr("Joined")}</dt>
          <dd>{formatDateTime(account.createdAt)}</dd>
          {account.statusChangedBy && account.statusChangedAt && (
            <>
              <dt>{account.status === "LOCKED" ? tr("Locked by") : tr("Last change")}</dt>
              <dd>
                {account.statusChangedBy} · {formatDateTime(account.statusChangedAt)}
              </dd>
            </>
          )}
          {account.status === "LOCKED" ? (
            <>
              <dt>{tr("Lock reason")}</dt>
              <dd>{account.statusReason ? account.statusReason : tr("No reason specified")}</dd>
            </>
          ) : account.statusReason ? (
            <>
              <dt>{tr("Reason")}</dt>
              <dd>{account.statusReason}</dd>
            </>
          ) : null}
          {account.invitedBy && (
            <>
              <dt>{tr("Invited by")}</dt>
              <dd>
                {account.invitedBy} · {formatDateTime(account.createdAt)}
              </dd>
            </>
          )}
          {account.requestCode && (
            <>
              <dt>{tr("Request")}</dt>
              <dd>
                {account.requestCode}
                {account.requestedAt ? ` · ${formatDateTime(account.requestedAt)}` : ""}
              </dd>
            </>
          )}
        </dl>

        {errors.form && <span className={styles.formError}>{errors.form}</span>}
        <Field label={tr("Full name")} required error={errors.fullName}>
          <Input icon="user" value={fullName} data-autofocus onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label={isVietnamese ? "Số điện thoại" : tr("Phone")} error={errors.phone} hint={t("phoneValidation.hint")}>
          <Input type="tel" autoComplete="off" maxLength={15} placeholder="0901234567" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhone((v) => normalizeVnPhone(v))} />
        </Field>
        <Field label={tr("Club email")} hint={tr("The email is the sign-in name, so it cannot be changed here.")}>
          <Input icon="mail" value={account.email} readOnly disabled />
        </Field>

        <div className={styles.buttons}>
          <Button tone="secondary" size="sm" onClick={onClose} disabled={busy}>
            {tr("Cancel")}
          </Button>
          <Button type="submit" size="sm" icon="check" disabled={busy || unchanged}>
            {busy ? tr("Saving…") : tr("Save changes")}
          </Button>
        </div>

        {deletable && (
          <div className={styles.danger}>
            <p className={styles.dangerText}>
              <strong>{tr("Delete this account")}</strong>
              {tr("It has never been used, so it can be removed for good.")}
            </p>
            <Button tone="danger" size="sm" icon="trash" disabled={busy} onClick={onDelete}>
              {tr("Delete")}
            </Button>
          </div>
        )}
        {canDeactivate && (
          <div className={styles.danger}>
            <p className={styles.dangerText}>
              <strong>{tr("Deactivate this account")}</strong>
              {tr("Sign-in stops and every session ends. Its records stay in place; it can be reactivated later.")}
            </p>
            <Button tone="danger" size="sm" icon="ban" disabled={busy} blockedReason={removeBlocked} onClick={onDeactivate}>
              {tr("Deactivate")}
            </Button>
          </div>
        )}
        {account.status === "LOCKED" && onUnlock && (
          <div className={styles.danger}>
            <p className={styles.dangerText}>
              <strong>{tr("Unlock this account")}</strong>
              {tr("The account is currently locked. Unlocking will allow the user to sign in again.")}
            </p>
            <Button tone="secondary" size="sm" icon="unlock" disabled={busy} onClick={onUnlock}>
              {tr("Unlock")}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
