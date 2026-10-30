import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { trainingApi } from "@/features/training/api";
import type { LiveSimulatorSession } from "@/features/training/types";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { tr } from "@/shared/i18n/tr";

export default function LiveMonitorPage() {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brand)" }} />
            <h1 style={{ margin: 0, fontSize: "var(--fs-h1)", fontWeight: 700 }}>{tr("Live Session Telemetry")}</h1>
          </div>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)" }}>{tr("Biometrics sent by running simulator sessions")}</p>
        </div>
        <Link to="/training/calendar"><Button tone="secondary">{tr("← Master Calendar")}</Button></Link>
      </div>

      {offline && (
        <div role="alert" style={{ padding: "0.75rem 1rem", borderRadius: "var(--r)", background: "var(--warn-bg)", color: "var(--warn)" }}>
          {tr("Live telemetry is temporarily unavailable. Showing the latest received data.")}
        </div>
      )}

      {loading ? (
        <p aria-live="polite">{tr("Loading live telemetry…")}</p>
      ) : sessions.length === 0 ? (
        <EmptyState icon="activity" title="No trial is running" description="Start a due trial to see live telemetry here." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
          {sessions.map((session) => {
            const snapshot = session.lastSnapshot;
            if (!snapshot || !snapshot.metrics || !snapshot.horse || !snapshot.track) {
              return (
                <article key={session.id} style={{ padding: "1.5rem", background: "var(--surface)", borderRadius: "var(--radius-card)", border: "1px solid var(--border)" }}>
                  <Badge tone="info">{tr("Running")}</Badge>
                  <p style={{ marginBottom: 0 }}>{tr("Waiting for the first telemetry packet…")}</p>
                </article>
              );
            }
            const warning = Boolean(snapshot.alerts && Object.values(snapshot.alerts).some(Boolean));
            const speedKmh = (snapshot.metrics.velocity_mps ?? 0) * 3.6;
            const progress = (snapshot.track.target_distance_m ?? 0) > 0
              ? Math.min(100, Math.round(((snapshot.track.covered_distance_m ?? 0) / snapshot.track.target_distance_m) * 100))
              : 0;

            return (
              <article key={session.id} style={{ padding: "1.5rem", background: "var(--surface)", borderRadius: "var(--radius-card)", border: warning ? "2px solid var(--warn)" : "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "var(--fs-section)" }}>
                      <Link to={`/horses/${snapshot.horse.horse_id}`} style={{ color: "inherit" }}>{snapshot.horse.microchip_id ?? snapshot.horse.horse_id}</Link>
                    </h2>
                    <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)" }}>
                      {snapshot.track.surface} · {snapshot.track.track_condition} · {Math.round(snapshot.sim_time_s ?? 0)}s
                    </span>
                  </div>
                  <Badge tone={warning ? "warn" : "ok"}>{warning ? tr("Warning") : tr("Running")}</Badge>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
                  <Metric label="Current speed" value={`${speedKmh.toFixed(1)} km/h`} />
                  <Metric label="Heart rate" value={`${Math.round(snapshot.metrics.heart_rate_bpm ?? 0)} bpm`} warning={warning} />
                  <Metric label="Stamina" value={`${Math.round(snapshot.metrics.stamina_pct ?? 0)}%`} />
                  <Metric label="Body temperature" value={`${(snapshot.metrics.body_temp_c ?? 0).toFixed(1)} °C`} />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span>{snapshot.track.covered_distance_m ?? 0}m / {snapshot.track.target_distance_m ?? 0}m</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div style={{ height: 8, background: "var(--surface-sunken)", borderRadius: 4 }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: warning ? "var(--warn)" : "var(--ok)", borderRadius: 4 }} />
                  </div>
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
    <div style={{ padding: "0.9rem", background: warning ? "var(--warn-bg)" : "var(--surface-sunken)", borderRadius: "var(--r)", textAlign: "center" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)" }}>{tr(label)}</div>
      <strong style={{ display: "block", marginTop: "0.25rem", fontSize: "var(--fs-section)", color: warning ? "var(--warn)" : "var(--text-main)" }}>{value}</strong>
    </div>
  );
}
