import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Textarea } from "@/shared/components/form/Textarea";
import { Field } from "@/shared/components/form/Field";
import { useAppLanguage } from "@/shared/lib/language";
import { ApiError } from "@/shared/lib/api";
import { messageFor } from "@/shared/lib/messages";
import { localizeServerText, tr } from "@/shared/i18n/tr";
import { respondHandover } from "../api";

export default function HandoverResponsePage() {
  useTranslation();
  const { isVietnamese } = useAppLanguage();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineField, setShowDeclineField] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    action: "ACCEPT" | "REJECT";
    planDeadlineAt?: string;
    days?: number;
  } | null>(null);

  if (!token) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 16px" }}>
        <Alert tone="danger">{tr("Invalid or missing handover verification token.")}</Alert>
      </div>
    );
  }

  async function handleResponse(action: "ACCEPT" | "REJECT") {
    if (busy || !token) return;
    if (action === "REJECT" && !showDeclineField) {
      setShowDeclineField(true);
      return;
    }
    if (action === "REJECT" && !declineReason.trim()) {
      setError(tr("Please enter a decline reason to notify the Club Manager."));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await respondHandover({
        token,
        action,
        declineReason: action === "REJECT" ? declineReason.trim() : undefined,
      });
      setResult({
        success: true,
        message: res.message,
        action,
        planDeadlineAt: res.planDeadlineAt,
        days: res.days,
      });
    } catch (err) {
      if (err instanceof ApiError) setError(messageFor(err));
      else setError(tr("Could not process handover request. It may have expired after 48h."));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div style={{ maxWidth: 520, margin: "60px auto", padding: "0 16px" }}>
        <Card pad={24}>
          <div style={{ textAlign: "center", display: "grid", gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem", color: result.action === "ACCEPT" ? "var(--success)" : "var(--text)" }}>
              {result.action === "ACCEPT" ? tr("Horse handover accepted successfully") : tr("Horse handover declined")}
            </h2>
            <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.5 }}>
              {localizeServerText(result.message)}
            </p>

            {result.action === "ACCEPT" && result.planDeadlineAt && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--surface-sunken)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border-soft)",
                  textAlign: "left",
                  fontSize: "var(--fs-body)",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--primary)", marginBottom: 4 }}>
                  {tr("Training plan SLA deadline:")}
                </div>
                <div>{tr("Time limit:")} <strong>{tr("{{days}} days (72 hours)", { days: result.days || 3 })}</strong></div>
                <div>{tr("Due before:")} <strong>{new Date(result.planDeadlineAt).toLocaleString(isVietnamese ? "vi-VN" : "en-US")}</strong></div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
              <Button tone="primary" onClick={() => navigate("/training/plans")}>
                {tr("Go to Training Plans")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: "0 16px" }}>
      <Card pad={24}>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.25rem" }}>
              {tr("Confirm horse handover")}
            </h2>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: "var(--fs-caption)", lineHeight: 1.5 }}>
              {tr("The Club Manager has assigned this horse to you. Please accept or decline within 48 hours of receiving this notification.")}
            </p>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}

          <div
            style={{
              padding: "12px 14px",
              background: "var(--surface-sunken)",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border-soft)",
              fontSize: "var(--fs-caption)",
              color: "var(--text-2)",
              lineHeight: 1.5,
            }}
          >
            <strong>{tr("SLA deadline notice:")}</strong> {tr("Once accepted, a fixed 3-day (72-hour) deadline applies to assess fitness and activate the official training plan.")}
          </div>

          {showDeclineField && (
            <Field label={tr("Reason for declining handover")} required>
              <Textarea
                rows={3}
                placeholder={tr("Enter reason (e.g. workload full, reassignment needed...)")}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </Field>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Button
              tone={showDeclineField ? "danger" : "secondary"}
              disabled={busy}
              onClick={() => handleResponse("REJECT")}
            >
              {busy ? tr("Processing…") : showDeclineField ? tr("Confirm decline") : tr("Decline handover")}
            </Button>
            <Button
              tone="primary"
              disabled={busy}
              onClick={() => handleResponse("ACCEPT")}
            >
              {busy ? tr("Processing…") : tr("Accept horse")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
