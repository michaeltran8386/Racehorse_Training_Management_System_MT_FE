import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { trainingApi } from "@/features/training/api";
import type { LiveSimulatorSession } from "@/features/training/types";
import { Badge } from "@/shared/components/ui/Badge";
import { LinkButton } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./TrainingMetrics.module.css";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { tr } from "@/shared/i18n/tr";

export default function LiveMonitorPage() {
  useScreenTranslation();
  const [sessions, setSessions] = useState<LiveSimulatorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const next = await trainingApi.getLiveSimulatorSessions();
        if (mounted) {
          setSessions(next);
          setOffline(false);
        }
      } catch {
        if (mounted) setOffline(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    // shortcut: poll mỗi 1 giây, chuyển sang Socket.IO khi tải thực tế vượt ngân sách API
    const timer = window.setInterval(() => void load(), 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader title="Live Session Telemetry" description="Biometrics sent by running simulator sessions" action={<LinkButton to="/training/calendar" tone="secondary" icon="arrowLeft">{tr("Master Calendar")}</LinkButton>} />

      {offline && (
        <div role="alert" style={{ padding: "0.75rem 1rem", borderRadius: "var(--r)", background: "var(--warn-bg)", color: "var(--warn)" }}>
          {tr(sessions.length ? "Live telemetry is temporarily unavailable. Showing the latest received data." : "Live telemetry is temporarily unavailable.")}
        </div>
      )}

      {loading ? (
        <p aria-live="polite">{tr("Loading live telemetry…")}</p>
      ) : offline && sessions.length === 0 ? null : sessions.length === 0 ? (
        <EmptyState icon="activity" title="No trial is running" description="Start a due trial to see live telemetry here." />
      ) : (
        <div className={styles.liveGrid}>
          {sessions.map((session) => {
            const snapshot = session.lastSnapshot;
            if (!snapshot || !snapshot.metrics || !snapshot.horse || !snapshot.track) {
              return (
                <article key={session.id} className={styles.liveCard}>
                  <Badge tone="info">{tr("Running")}</Badge>
                  <p style={{ marginBottom: 0 }}>{tr("Waiting for the first telemetry packet…")}</p>
                </article>
              );
            }
            const warning = Boolean(snapshot.alerts && Object.values(snapshot.alerts).some(Boolean));
            const speed = snapshot.metrics.velocity_mps;
            const covered = snapshot.track.covered_distance_m;
            const target = snapshot.track.target_distance_m;
            const progress = covered != null && target != null && target > 0
              ? Math.max(0, Math.min(100, Math.round((covered / target) * 100)))
              : null;

            return (
              <article key={session.id} className={`${styles.liveCard} ${warning ? styles.liveWarning : ""}`}>
                <div className={styles.liveHeading}>
                  <div>
                    <h2 className={styles.itemTitle}>
                      <Link to={`/horses/${snapshot.horse.horse_id}`} style={{ color: "inherit" }}>{snapshot.horse.microchip_id ?? snapshot.horse.horse_id}</Link>
                    </h2>
                    <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)" }}>
                      {tr(snapshot.track.surface)} · {tr(snapshot.track.track_condition)} · {snapshot.sim_time_s != null ? `${Math.round(snapshot.sim_time_s)}s` : "—"}
                    </span>
                  </div>
                  <Badge tone={warning ? "warn" : "ok"}>{warning ? tr("Warning") : tr("Running")}</Badge>
                </div>

                <div className={styles.liveMetrics}>
                  <Metric label="Current speed" value={speed != null ? `${(speed * 3.6).toFixed(1)} km/h` : "—"} />
                  <Metric label="Heart rate" value={snapshot.metrics.heart_rate_bpm != null ? `${Math.round(snapshot.metrics.heart_rate_bpm)} bpm` : "—"} warning={warning} />
                  <Metric label="Stamina" value={snapshot.metrics.stamina_pct != null ? `${Math.round(snapshot.metrics.stamina_pct)}%` : "—"} />
                  <Metric label="Body temperature" value={snapshot.metrics.body_temp_c != null ? `${snapshot.metrics.body_temp_c.toFixed(1)} °C` : "—"} />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span>{covered ?? "—"}m / {target ?? "—"}m</span>
                    <strong>{progress == null ? "—" : `${progress}%`}</strong>
                  </div>
                  {progress != null && <div className={styles.track}>
                    <div className={styles.trackFill} style={{ width: `${progress}%`, background: warning ? "var(--warn)" : "var(--ok)" }} />
                  </div>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className={`${styles.liveMetric} ${warning ? styles.metricWarning : ""}`}>
      <div className={styles.metricLabel}>{tr(label)}</div>
      <strong className={styles.metricValue}>{value}</strong>
    </div>
  );
}
