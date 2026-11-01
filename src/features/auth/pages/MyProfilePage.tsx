import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { useAuth, useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Switch } from "@/shared/components/ui/Switch";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useToast } from "@/shared/components/ui/Toast";
import { formatDate, formatDateTime, padCount } from "@/shared/lib/format";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import { NOTIFY_META, notifyLock, PERMISSIONS, ROLE_LABEL } from "@/shared/lib/permissions";
import { ACCOUNT_STATUS } from "@/shared/lib/status";
import { updateNotification, updateProfile } from "../api";
import styles from "./ProfilePages.module.css";
import { fullNameError } from "@/shared/lib/name";

import { tr } from "@/shared/i18n/tr";
// Design 1.15: hồ sơ cá nhân — dùng chung cho cả 5 vai trò, mỗi người chỉ thấy hồ sơ của mình.
export default function MyProfilePage() {
  useScreenTranslation();
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const { isVietnamese, t } = useAppLanguage();
  const navigate = useNavigate();
  const toast = useToast();

  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [saving, setSaving] = useState(false);

  const granted = PERMISSIONS.filter((p) => user.permissions[p.key]).length;
  const status = ACCOUNT_STATUS[user.status];
  const VN_PHONE_RE = /^0[35789]\d{8}$/;

  async function onSave() {
    if (fullNameError(fullName)) {
      setNameError(fullNameError(fullName));
      return;
    }
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (cleanPhone && !VN_PHONE_RE.test(cleanPhone)) {
      setPhoneError(t("phoneValidation.error"));
      return;
    }
    setSaving(true);
    setNameError("");
    setPhoneError("");
    try {
      const res = await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      setUser(res.user);
      toast.show(isVietnamese ? "Đã lưu thông tin." : "Details saved.", "ok");
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setSaving(false);
    }
  }

  async function onNotify(key: (typeof NOTIFY_META)[number]["key"], value: boolean) {
    try {
      const res = await updateNotification(key, value);
      setUser(res.user);
      toast.show("Notification setting saved.", "ok");
    } catch (err) {
      toast.show(messageFor(err), "danger");
    }
  }

  return (
    <>
      <PageHeader
        title={tr("Your details and how you are reached.")}
        description={tr("Name and contact details are yours to change. Role and permissions belong to the Club Manager.")}
      />

      <div className={styles.profileGrid}>
        <div className={styles.stack}>
          <Card title={tr("Personal details")}>
            <div className={styles.twoCols}>
              <Field label={tr("Full name")} required error={nameError}>
                <Input
                  icon="user"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setNameError("");
                  }}
                />
              </Field>
              <Field label={isVietnamese ? "Số điện thoại" : tr("Phone")} error={phoneError} hint={t("phoneValidation.hint")}>
                <Input
                  autoComplete="tel"
                  maxLength={15}
                  placeholder="0901 234 567"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError("");
                  }}
                />
              </Field>
              <Field label={tr("Club email")} hint={tr("The sign-in address is changed by the Club Manager")}>
                <Input icon="mail" value={user.email} disabled readOnly />
              </Field>
              <Field label={tr("Role")}>
                <Tooltip label={tr("Only the Club Manager can change a role.")} placement="bottom" block>
                  <Input value={tr(ROLE_LABEL[user.role])} disabled readOnly />
                </Tooltip>
              </Field>
            </div>
          </Card>

          <Card title={tr("Notifications")} subtitle={tr("Saved as soon as they are switched")}>
            <div className={styles.stack}>
              {NOTIFY_META.map((n) => {
                const lock = notifyLock(user.role, n.key);
                return (
                  <div key={n.key} className={styles.notify}>
                    <div>
                      <strong>{tr(n.name)}</strong>
                      <span>{tr(n.note)}</span>
                    </div>
                    <Switch
                      label={tr(n.name)}
                      checked={lock.locked ? Boolean(lock.value) : user.notify[n.key]}
                      blockedReason={lock.locked && lock.reason ? tr(lock.reason) : undefined}
                      onChange={(v) => void onNotify(n.key, v)}
                    />
                  </div>
                );
              })}
              <div style={{ paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                <Button
                  tone="ghost"
                  size="sm"
                  block
                  icon="settings"
                  onClick={() => navigate("/notifications/settings")}
                >
                  {tr("Manage advanced notification preferences (Push, Email, SMS) →")}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className={styles.stack}>
          <Card title={tr("Account")}>
            <div className={styles.stack}>
              <div className={styles.identity}>
                <Avatar name={user.fullName} size={42} />
                <div>
                  <strong>{user.fullName}</strong>
                  <span>
                    {tr(ROLE_LABEL[user.role])} {tr("· since")}{" "}{formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
              <div className={styles.rows}>
                <div>
                  <span>{tr("Status")}</span>
                  <Badge tone={status.tone}>{tr(status.label)}</Badge>
                </div>
                <div>
                  <span>{tr("Permissions")}</span>
                  <b className={styles.num}>{tr("{{count}} granted", { count: padCount(granted) })}</b>
                </div>
                <div>
                  <span>{tr("Last sign-in")}</span>
                  <b>{user.lastActive ? formatDateTime(user.lastActive) : "—"}</b>
                </div>
              </div>
              <Button tone="secondary" size="sm" block icon="key" onClick={() => navigate("/profile/password")}>
                {tr("Change password")}
              </Button>
            </div>
          </Card>

          <Card title={tr("Save")}>
            <div className={styles.stack}>
              <Button block icon="check" disabled={saving} onClick={onSave}>
                {saving ? tr("Saving…") : tr("Save details")}
              </Button>
              <p className={styles.note}>
                {tr("Changing a name is written to the Audit Log because it appears on Training Plans and medical records.")}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
