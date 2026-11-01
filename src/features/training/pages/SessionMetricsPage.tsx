import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./TrainingMetrics.module.css";
import { Card } from "@/shared/components/ui/Card";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Paged } from "@/shared/components/ui/Pagination";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { messageFor } from "@/shared/lib/messages";
import { getHorses } from "@/features/horses/api";
import { todayClub, trainingApi } from "../api";
import { sessionButtons } from "../components/sessionRules";
import { EXERCISE_TYPE_LABEL, SESSION_STATUS_LABEL, SESSION_STATUS_TONE } from "../types";
import type { ExerciseSession } from "../types";

import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";

function minusDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Kết quả buổi tập: HT thấy các buổi đang chờ ghi kết quả (đã tới giờ, hoặc Bỏ lỡ trong 7 ngày)
 * và các kết quả 14 ngày gần nhất; mọi vai trò được vào có lối mở Biểu đồ thể lực (SC-2.07).
 */
export default function SessionMetricsPage() {
  useScreenTranslation();
  useAppLanguage();
  const user = useCurrentUser();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [horses, setHorses] = useState<{ value: string; label: string }[]>([]);
  const [horseId, setHorseId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayClub();
    Promise.all([trainingApi.getSessions({ from: minusDays(today, 14), to: today }), getHorses({ limit: 100 })])
      .then(([rows, hs]) => {
        setSessions(rows);
        setHorses(hs.items.map((h) => ({ value: h.id, label: `${h.name} (${h.horseCode ?? ""})` })));
        setHorseId(hs.items[0]?.id ?? "");
      })
      .catch((err) => setError(messageFor(err)))
      .finally(() => setLoading(false));
  }, []);

  const pending = sessions.filter((s) => sessionButtons(s, user.role).record);
  const recent = sessions.filter((s) => s.status === "COMPLETED").reverse();

  const totalSessionsCount = sessions.length;
  const completedSessionsCount = recent.length;
  const scoredSessions = recent.filter((s) => s.result?.performanceScore != null);
  const avgScore =
    scoredSessions.length > 0
      ? (
          scoredSessions.reduce((acc, s) => acc + (s.result?.performanceScore || 0), 0) /
          scoredSessions.length
        ).toFixed(1)
      : "—";
  const pendingCount = pending.length;

  const TableHead = () => (
    <thead>
      <tr style={{ borderBottom: "2px solid var(--border)", color: "var(--muted)", fontSize: "var(--fs-sm)", textAlign: "left" }}>
        <th style={{ padding: "0.6rem 0.75rem" }}>{tr("Date & Time")}</th>
        <th style={{ padding: "0.6rem 0.75rem" }}>{tr("Horse")}</th>
        <th style={{ padding: "0.6rem 0.75rem" }}>{tr("Exercise & Distance")}</th>
        <th style={{ padding: "0.6rem 0.75rem" }}>{tr("Status")}</th>
        <th style={{ padding: "0.6rem 0.75rem" }}>{tr("Performance Score")}</th>
        <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>{tr("Action")}</th>
      </tr>
    </thead>
  );

  const Row = ({ s, action }: { s: ExerciseSession; action: string }) => (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>{s.sessionDate} {s.startTime}</td>
      <td style={{ padding: "0.6rem 0.75rem" }}><strong>{s.horseName}</strong></td>
      <td style={{ padding: "0.6rem 0.75rem" }}>{tr(EXERCISE_TYPE_LABEL[s.sessionType])} · {s.targetDistanceMeters} m × {s.repetitions}</td>
      <td style={{ padding: "0.6rem 0.75rem" }}><Badge tone={SESSION_STATUS_TONE[s.status]}>{tr(SESSION_STATUS_LABEL[s.status])}</Badge></td>
      <td style={{ padding: "0.6rem 0.75rem", fontWeight: 700, color: s.result?.performanceScore != null && s.result.performanceScore >= 7 ? "var(--brand-700)" : "inherit" }}>
        {s.result?.performanceScore != null ? `${s.result.performanceScore}/10` : "—"}
      </td>
      <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
        <LinkButton to={`/training/sessions/${s.id}/result`} size="sm" tone="secondary">{tr(action)}</LinkButton>
      </td>
    </tr>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <PageHeader title="Session Metrics" description="Log workout performance, biometric telemetry, and abnormal health indicators." action={(user.role === "HEAD_TRAINER" || user.role === "VETERINARIAN") ? <LinkButton to="/training/alerts" tone="secondary">{tr("Abnormal-sign alerts")}</LinkButton> : undefined} />

      {/* KPI Stats Overview */}
      <div className={styles.metrics}>
        <KpiTile
          label={tr("Recent Sessions (14d)")}
          value={String(totalSessionsCount)}
          caption={tr("Total scheduled workouts")}
        />
        <KpiTile
          label={tr("Completed Workouts")}
          value={String(completedSessionsCount)}
          caption={tr("Results recorded in log")}
          accent={completedSessionsCount > 0}
        />
        <KpiTile
          label={tr("Avg Performance Score")}
          value={avgScore !== "—" ? `${avgScore}/10` : "—"}
          caption={tr("Based on trainer ratings")}
          accent={avgScore !== "—" && Number(avgScore) >= 7}
        />
        <KpiTile
          label={tr("Pending Records")}
          value={String(pendingCount)}
          caption={tr("Awaiting result entry")}
        />
      </div>

      <Card pad={16}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600 }}>{tr("Fitness chart for:")}</span>
          <div className={styles.selector}>
            <SearchSelect aria-label={tr("Horse")} value={horseId} onChange={setHorseId} options={horses} />
          </div>
          {horseId ? <LinkButton to={`/horses/${horseId}/fitness`} tone="primary">{tr("Open chart")}</LinkButton> : <Button tone="primary" disabled>{tr("Open chart")}</Button>}
        </div>
      </Card>

      {error && <Alert tone="danger" title={tr("Could not load data")}>{error}</Alert>}

      {user.role === "HEAD_TRAINER" && (
        <Card pad={16} className={styles.tableCard}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "var(--fs-body-lg)" }}>{tr("Waiting for a result ({{count}})", { count: pending.length })}</h2>
          {loading ? null : pending.length === 0 ? (
            <EmptyState title={tr("Nothing to record right now.")} />
          ) : (
            <Paged items={pending} noun="workouts">{(items) => (
              <div className={styles.tableScroll}><table className={styles.table}>
                <TableHead />
                <tbody>{items.map((s) => <Row key={s.id} s={s} action="Record result" />)}</tbody>
              </table></div>
            )}</Paged>
          )}
        </Card>
      )}

      <Card pad={16} className={styles.tableCard}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "var(--fs-body-lg)" }}>{tr("Results – last 14 days ({{count}})", { count: recent.length })}</h2>
        {loading ? (
          <div style={{ color: "var(--text-muted)" }}>{tr("Loading...")}</div>
        ) : recent.length === 0 ? (
          <EmptyState title={tr("No results in the last 14 days.")} />
        ) : (
          <Paged items={recent} noun="workouts">{(items) => (
            <div className={styles.tableScroll}><table className={styles.table}>
              <TableHead />
              <tbody>{items.map((s) => <Row key={s.id} s={s} action="View result" />)}</tbody>
            </table></div>
          )}</Paged>
        )}
      </Card>
    </div>
  );
}
