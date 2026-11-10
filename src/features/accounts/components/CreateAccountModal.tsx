import { useState } from "react";
import type { FormEvent } from "react";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { ApiError } from "@/shared/lib/api";
import { messageFor } from "@/shared/lib/messages";
import { EMAIL_PLACEHOLDER } from "@/shared/lib/brand";
import { ROLE_LABEL } from "@/shared/lib/permissions";
import type { PublicAccount, Role } from "@/shared/types/auth";
import { createAccount } from "../api";
import { fullNameError } from "@/shared/lib/name";

import { tr } from "@/shared/i18n/tr";
import { EMAIL_RE } from "@/shared/lib/email";

// Club Manager có thể tạo/mời nhân viên hoặc chủ ngựa.
const CREATABLE_ROLES: Role[] = ["HEAD_TRAINER", "VETERINARIAN", "GROOM", "HORSE_OWNER", "CLUB_MANAGER"];

interface CreateAccountModalProps {
  onClose: () => void;
  onCreated: (account: PublicAccount) => void;
}

// Club Manager mời nhân viên hoặc chủ ngựa: tài khoản ở trạng thái INVITED, người được mời nhận email để đặt mật khẩu.
export function CreateAccountModal({ onClose, onCreated }: CreateAccountModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("HEAD_TRAINER");
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const mail = email.trim().toLowerCase();
    const found: typeof errors = {};
    if (fullNameError(fullName)) found.name = fullNameError(fullName);
    if (!mail) found.email = tr("Email is required.");
    else if (!EMAIL_RE.test(mail)) found.email = tr("Email must be a @gmail.com address.");
    if (found.name || found.email) return setErrors(found);

    setBusy(true);
    setErrors({});
    try {
      const res = await createAccount({ fullName: fullName.trim(), email: mail, role });
      onCreated(res.account);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_TAKEN") setErrors({ email: messageFor(err) });
      else setErrors({ form: messageFor(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={tr("Create account")}
      subtitle={tr("An invitation email will be sent to activate the account.")}
      width={460}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {errors.form && <span style={{ color: "var(--danger)", fontSize: "var(--fs-caption)" }}>{errors.form}</span>}
        <Field label={tr("Full name")} required error={errors.name}>
          <Input icon="user" placeholder="John Doe" value={fullName} data-autofocus onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label={tr("Email")} required error={errors.email}>
          <Input type="email" icon="mail" placeholder={EMAIL_PLACEHOLDER} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={tr("Role")} required>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={CREATABLE_ROLES.map((r) => ({ value: r, label: tr(ROLE_LABEL[r]) }))}
          />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9 }}>
          <Button tone="secondary" size="sm" onClick={onClose} disabled={busy}>
            {tr("Cancel")}
          </Button>
          <Button type="submit" size="sm" icon="mail" disabled={busy}>
            {busy ? tr("Sending…") : tr("Send invitation")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
