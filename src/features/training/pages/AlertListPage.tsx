import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Field } from "@/shared/components/form/Field";
import { Modal } from "@/shared/components/ui/Modal";
import { Textarea } from "@/shared/components/form/Textarea";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { formatDateTime } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { trainingApi } from "../api";
import { EXERCISE_TYPE_LABEL } from "../types";
import type { TrainingAlert } from "../types";

import { tr } from "@/shared/i18n/tr";
import styles from "./TrainingActivity.module.css";
/** FR-2.14: buổi tập có dấu hiệu bất thường. HT và VET xem; chỉ VET ghi nhận. */
export default function AlertListPage() {
  useScreenTranslation();
  const user = useCurrentUser();
  const toast = useToast();
  // Q-0.04: chỉ Bác sĩ thú y (còn bật công tắc ackAlerts) ghi nhận cảnh báo; HT chỉ xem.
  const isVet = user.role === "VETERINARIAN" && !!user.permissions.ackAlerts;

  const [alerts, setAlerts] = useState<TrainingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<TrainingAlert | null>(null);
  const [vetNotes, setVetNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setAlerts(await trainingApi.getAlerts());
    } catch (err) {
      setLoadError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const handleConfirmAck = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const updated = await trainingApi.acknowledgeAlert(selected.id, vetNotes.trim());
      setAlerts((current) => current.map((alert) => alert.id === updated.id ? updated : alert));
      toast.show("Alert acknowledged.", "ok");
      setSelected(null);
      setVetNotes("");
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Abnormal-sign Alerts" description="Raised when the Head Trainer records abnormal signs after a workout. The Veterinarian reviews and responds." action={(user.role === "HEAD_TRAINER" || user.role === "CLUB_MANAGER") ? <LinkButton to="/training/calendar" tone="secondary" icon="arrowLeft">{tr("Training schedule")}</LinkButton> : undefined} />

      <div className={styles.list}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>{tr("Loading alerts...")}</div>
        ) : loadError ? (
          <Alert tone="danger" title={tr("Could not load data")}>
            {loadError} <Button size="sm" tone="secondary" onClick={() => void loadAlerts()}>{tr("Try again")}</Button>
          </Alert>
        ) : alerts.length === 0 ? (
          <EmptyState title={tr("No alerts")} description={tr("No abnormal signs have been recorded after workouts.")} />
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`${styles.alertCard} ${alert.acknowledgedByVet ? "" : styles.alertPending}`}>
              <div className={styles.cardHeading}>
                <div className={styles.alertIdentity}>
                  <span className={styles.cardTitle}>
                    <Link to={`/medical/horses/${alert.horseId}`} className={styles.horseLink}>
                      {alert.horseName}
                    </Link>
                  </span>
                  <span className={styles.metadata}>
                    {tr(EXERCISE_TYPE_LABEL[alert.sessionType])} · {alert.sessionDate} {tr("· reported")}{" "}{formatDateTime(alert.createdAt)}
                  </span>
                </div>
                <Badge tone={alert.acknowledgedByVet ? "ok" : "danger"}>
                  {alert.acknowledgedByVet ? tr("Vet acknowledged") : tr("Pending vet review")}
                </Badge>
              </div>
              <div style={{ fontSize: "var(--fs-body)" }}>{alert.message}</div>
              {alert.vetNotes && (
                <div className={styles.note}>
                  <strong>{tr("Veterinarian:")}</strong> {alert.vetNotes}
                </div>
              )}
              {isVet && !alert.acknowledgedByVet && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button tone="primary" onClick={() => setSelected(alert)}>{tr("Review & respond")}</Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selected && (
        <Modal
          onClose={() => setSelected(null)}
          title={tr(`Response for ${selected.horseName}`)}
          foot={
            <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
              <Button tone="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              <Button tone="primary" onClick={() => void handleConfirmAck()} disabled={submitting || vetNotes.trim().length < 2}>
                Save response
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className={styles.note}>
              <strong>{tr("Reported:")}</strong> {selected.message}
            </div>
            <Field label={tr("Clinical notes")} required hint={tr("If treatment is needed, create a medical record or Training Lock in the medical module.")}>
              <Textarea rows={3} maxLength={1000} value={vetNotes} onChange={(e) => setVetNotes(e.target.value)} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
