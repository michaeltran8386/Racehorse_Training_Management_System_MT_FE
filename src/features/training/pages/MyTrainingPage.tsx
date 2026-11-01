import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Tabs } from "@/shared/components/ui/Tabs";
import { messageFor } from "@/shared/lib/messages";
import { todayClub, trainingApi } from "../api";
import { EXERCISE_TYPE_LABEL, isHeavy, SESSION_STATUS_LABEL, SESSION_STATUS_TONE, TRACK_LABEL } from "../types";
import type { ExerciseSession } from "../types";

import { tr } from "@/shared/i18n/tr";
import styles from "./TrainingActivity.module.css";
const REFRESH_MS = 5 * 60 * 1000;

function plusDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** SC-2.08 Lịch tập của tôi (GROOM): buổi được phân công, tự làm mới mỗi 5 phút. */
export default function MyTrainingPage() {
  useScreenTranslation();
  const [tab, setTab] = useState("today");
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const latest = useRef(0);

  const today = todayClub();
  const range =
    tab === "today" ? { from: today, to: today } : tab === "tomorrow" ? { from: plusDays(today, 1), to: plusDays(today, 1) } : { from: today, to: plusDays(today, 7) };

  const load = useCallback(async () => {
    const requestId = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const rows = await trainingApi.getSessions({ from: range.from, to: range.to });
      if (requestId === latest.current) setSessions(rows);
    } catch (err) {
      if (requestId === latest.current) setError(messageFor(err));
    } finally {
      if (requestId === latest.current) setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <div className={styles.page}>
      <PageHeader title="My training schedule" action={<Button size="sm" tone="secondary" onClick={() => void load()}>{tr("Refresh")}</Button>} />

      <Tabs
        items={[
          { id: "today", label: "Today" },
          { id: "tomorrow", label: "Tomorrow" },
          { id: "week", label: "Next 7 days" },
        ]}
        active={tab}
        onChange={(t) => {
          if (t === tab) return;
          setTab(t);
          setLoading(true);
        }}
      />
      {error && <Alert tone="danger" title={tr("Could not load data")} action={<Button size="sm" tone="secondary" onClick={() => void load()}>{tr("Try again")}</Button>}>{error}</Alert>}
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>{tr("Loading...")}</div>
      ) : error ? null : sessions.length === 0 ? (
        <EmptyState title={tab === "today" ? tr("You have no workouts assigned today.") : tr("No workouts assigned in this period.")} />
      ) : (
        sessions.map((s) => {
          const blocked = s.status === "BLOCKED";
          const cancelled = s.status === "CANCELLED";
          return (
            <Card key={s.id} pad={20}>
              <div className={`${styles.session} ${blocked ? styles.blocked : ""} ${cancelled ? styles.cancelled : ""}`}>
                <div className={styles.cardHeading}>
                  <strong className={styles.cardTitle}>
                    {tab === "week" ? `${s.sessionDate.slice(5)} ` : ""}{s.startTime} · {s.horseName}
                  </strong>
                  <Badge tone={SESSION_STATUS_TONE[s.status]}>{SESSION_STATUS_LABEL[s.status]}</Badge>
                </div>
                <div className={styles.metadata}>
                  {tr("Stall")}{" "}{s.stallCode ?? "—"} · {tr(EXERCISE_TYPE_LABEL[s.sessionType])}{" "}
                  {isHeavy(s.sessionType, s.intensity) && <Badge tone="danger">{tr("Heavy")}</Badge>} · {s.targetDistanceMeters} m × {s.repetitions} ·{" "}
                  {tr(TRACK_LABEL[s.trackType])} {tr("· Jockey:")}{" "}{s.jockeyName || "—"}
                </div>
                {blocked && (
                  <div className={styles.warning}>
                    {tr("Blocked by a veterinary Training Lock – do not take the horse to the track.")}
                  </div>
                )}
                {open === s.id ? (
                  <div className={styles.note}>
                    <div><strong>{tr("Instructions:")}</strong> {s.notes || "—"}</div>
                    {s.status === "COMPLETED" && (
                      <Link to={`/training/sessions/${s.id}/result`}>{tr("View result")}</Link>
                    )}
                  </div>
                ) : null}
                <div style={{ marginTop: "0.5rem" }}>
                  <Button size="sm" tone="ghost" onClick={() => setOpen(open === s.id ? null : s.id)}>
                    {open === s.id ? tr("Hide details") : tr("Details")}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
