import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./TrainingMetrics.module.css";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { messageFor } from "@/shared/lib/messages";
import { HEALTH_STATUS } from "@/shared/lib/status";
import type { HealthStatus } from "@/shared/types/enums";
import { getHorses } from "@/features/horses/api";
import { clubParts, trainingApi } from "../api";
import { BarChart, ChartCard, LineChart, RadialGauge } from "../components/FitnessChart";
import type { BarDatum, ChartSeries, LinePoint } from "../components/FitnessChart";
import { EXERCISE_TYPE_LABEL } from "../types";
import type { ExerciseType, FitnessData } from "../types";

import { tr } from "@/shared/i18n/tr";
import { formatNumber, formatScore } from "@/shared/lib/format";
const RANGES = [4, 12, 26];
const PAGE_SIZE = 10;
const DAY = 24 * 3600_000;
const SERIES_COLORS = ["var(--chart-s1)", "var(--chart-s2)", "var(--chart-s3)", "var(--chart-s4)", "var(--chart-s5)"];
const MAX_TYPES = 4; // loại bài thứ 5 trở đi gộp vào "Khác"

const shortDate = (iso: string) => {
  const d = clubParts(iso).date;
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
};

/** Tuần (theo weeklyLoad) x quãng đường (km) theo loại bài; loại ít gặp gộp "Other". */
function weeklyDistance(data: FitnessData): { bars: BarDatum[]; series: ChartSeries[] } {
  const totals = new Map<ExerciseType, number>();
  for (const p of data.points) totals.set(p.workoutType, (totals.get(p.workoutType) ?? 0) + p.distanceMeters);
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const top = ranked.length > MAX_TYPES + 1 ? ranked.slice(0, MAX_TYPES) : ranked;
  const series: ChartSeries[] = top.map((k, i) => ({ key: k, label: tr(EXERCISE_TYPE_LABEL[k] ?? k), color: SERIES_COLORS[i] }));
  if (ranked.length > top.length) series.push({ key: "other", label: tr("Other"), color: SERIES_COLORS[MAX_TYPES] });
  const bars = data.weeklyLoad.map((w) => {
    const start = Date.parse(w.weekStart);
    const values: Record<string, number> = {};
    for (const p of data.points) {
      const t = Date.parse(p.date);
      if (t < start || t >= start + 7 * DAY) continue;
      const key = top.includes(p.workoutType) ? p.workoutType : "other";
      values[key] = (values[key] ?? 0) + p.distanceMeters / 1000;
    }
    return { key: w.weekStart, label: shortDate(w.weekStart), title: tr("Week of {{date}}", { date: clubParts(w.weekStart).date }), values };
  });
  return { bars, series };
}

function formatTime(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  return `${String(m).padStart(2, "0")}:${(seconds - m * 60).toFixed(1).padStart(4, "0")}`;
}

/** SC-2.07 Biểu đồ thể lực ngựa (CM, HT, VET, OWNER ngựa sở hữu). */
export default function FitnessChartPage() {
  useScreenTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [horses, setHorses] = useState<{ value: string; label: string }[]>([]);
  const [weeks, setWeeks] = useState(12);
  const [data, setData] = useState<FitnessData | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const latest = useRef(0);

  useEffect(() => {
    getHorses({ limit: 100 })
      .then((res) => {
        setHorses(
          res.items
            .filter((h) => h.status !== "RETIRED")
            .map((h) => ({ value: h.id, label: `${h.name} (${h.horseCode ?? ""})` })),
        );
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const requestId = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const res = await trainingApi.getFitness(id, weeks);
      if (requestId === latest.current) {
        setData(res);
        setLoadedAt(Date.now());
      }
    } catch (err) {
      if (requestId === latest.current) setError(messageFor(err));
    } finally {
      if (requestId === latest.current) setLoading(false);
    }
  }, [id, weeks]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <Alert tone="danger" title={tr("Could not load data")}>
        {error} <Button size="sm" tone="secondary" onClick={() => void load()}>{tr("Try again")}</Button>
      </Alert>
    );
  }
  if (loading || !data) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>{tr("Loading fitness data...")}</div>;

  const to = loadedAt;
  const from = to - weeks * 7 * 24 * 3600_000;
  const statusCfg = HEALTH_STATUS[data.horse.status as HealthStatus] ?? { label: data.horse.status, tone: "neutral" };
  const rows = [...data.points].reverse();
  const s = data.summary;
  const openResult = (workoutId: string) => navigate(`/training/sessions/${workoutId}/result`);
  const linePoints: LinePoint[] = data.points.map((p) => ({
    id: p.workoutId,
    t: Date.parse(p.date),
    label: `${clubParts(p.date).date} · ${tr(EXERCISE_TYPE_LABEL[p.workoutType] ?? p.workoutType)}`,
    values: { speed: p.avgSpeedKmh, peak: p.maxHeartRate, recovery: p.recoveryHeartRate, score: p.performanceScore },
    alert: p.hasAlert,
  }));
  const xTicks = Array.from({ length: 5 }, (_, i) => {
    const t = from + ((to - from) * i) / 4;
    return { t, label: shortDate(new Date(t).toISOString()) };
  });
  const bands = data.lockPeriods.map((l) => ({ from: Date.parse(l.from), to: l.to ? Date.parse(l.to) : to }));
  const lineProps = { points: linePoints, from, to, xTicks, bands, onPointClick: openResult };
  const loadBars: BarDatum[] = data.weeklyLoad.map((w) => ({ key: w.weekStart, label: shortDate(w.weekStart), title: tr("Week of {{date}}", { date: clubParts(w.weekStart).date }), values: { load: w.load } }));
  const distance = weeklyDistance(data);
  // Tải 7 ngày so với trung bình 4 tuần: 100% = bằng trung bình; trên 130% là tăng đột ngột.
  const loadRatio = s.loadChangePct != null ? 100 + s.loadChangePct : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <PageHeader title={tr("Fitness") + " – " + data.horse.name} action={<><Badge tone={statusCfg.tone as never}>{statusCfg.label}</Badge>{data.horse.isMedicalLocked && <Badge tone="danger" icon="lock">{tr("Training Lock")}</Badge>}<LinkButton to={`/horses/${data.horse.id}`} tone="secondary">{tr("Horse profile")}</LinkButton></>} />

      <Card pad={16}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          {horses.length > 0 && (
            <div style={{ minWidth: 260, maxWidth: 360, width: "100%" }}>
              <SearchSelect
                aria-label={tr("Switch horse")}
                value={id}
                onChange={(newId) => newId && navigate(`/horses/${newId}/fitness`)}
                options={horses}
              />
            </div>
          )}
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {RANGES.map((w) => (
              <Button key={w} size="sm" tone={weeks === w ? "primary" : "secondary"} aria-pressed={weeks === w} onClick={() => { if (w !== weeks) { setLoading(true); setPage(1); setWeeks(w); } }}>
                {w} {tr("weeks")}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className={styles.fitnessMetrics}>
        <Card pad={16}>
          <div style={{ fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>{tr("Best average speed")}</div>
          <div style={{ fontSize: "var(--fs-kpi)", fontWeight: 700 }}>{s.bestAvgSpeed ? tr(`${s.bestAvgSpeed.value} km/h`) : "—"}</div>
          {s.bestAvgSpeed && <div style={{ fontSize: "var(--fs-caption)" }}>{clubParts(s.bestAvgSpeed.date).date}</div>}
        </Card>
        <Card pad={16}>
          <RadialGauge label={tr("Avg performance (last 4)")} value={s.avgScoreLast4} max={10} display={s.avgScoreLast4 != null ? String(s.avgScoreLast4) : "—"} caption={tr("out of 10")} tone="var(--chart-s3)" />
        </Card>
        <Card pad={16}>
          <RadialGauge
            label={tr("Load, last 7 days")}
            value={loadRatio}
            max={200}
            marker={100}
            tone={loadRatio != null && loadRatio > 130 ? "var(--warn)" : "var(--chart-s1)"}
            display={formatNumber(s.load7d, 2)}
            caption={
              s.loadChangePct == null ? tr("No 4-week average yet") : (
                <span style={{ color: s.loadChangePct > 30 ? "var(--warn)" : undefined }}>
                  {s.loadChangePct >= 0 ? "+" : ""}{s.loadChangePct}% {tr("vs 4-week average")}
                </span>
              )
            }
          />
        </Card>
        <Card pad={16}>
          <div style={{ fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>{tr("Avg HR after 10 min (last 4)")}</div>
          <div style={{ fontSize: "var(--fs-kpi)", fontWeight: 700 }}>{s.avgRecoveryLast4 != null ? tr(`${s.avgRecoveryLast4} bpm`) : "—"}</div>
        </Card>
      </div>

      {data.points.length === 0 ? (
        <Card pad={16}>
          <EmptyState title={tr("No completed workouts to chart yet.")} />
        </Card>
      ) : (
        <>
          {data.points.length < 3 && (
            <div style={{ fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>{tr("At least 3 workouts are needed to see a trend.")}</div>
          )}
          <div className={styles.chartGrid}>
            <ChartCard title={tr("Average speed")} subtitle={tr("km/h per workout. Click a point to open the result.")}>
              <LineChart {...lineProps} unit="km/h" series={[{ key: "speed", label: tr("Avg speed"), color: "var(--chart-s1)" }]} />
            </ChartCard>
            <ChartCard title={tr("Heart rate")} subtitle={tr("bpm. A lower HR after 10 min means faster recovery.")}>
              <LineChart
                {...lineProps}
                unit="bpm"
                series={[
                  { key: "peak", label: tr("Peak HR"), color: "var(--chart-s4)" },
                  { key: "recovery", label: tr("HR 10 min"), color: "var(--chart-s1)" },
                ]}
              />
            </ChartCard>
            <ChartCard title={tr("Performance")} subtitle={tr("Score per workout, 0–10.")}>
              <LineChart {...lineProps} unit="/10" yMax={10} series={[{ key: "score", label: tr("Performance"), color: "var(--chart-s3)" }]} />
            </ChartCard>
            <ChartCard title={tr("Weekly load")} subtitle={tr("Total training load per week.")}>
              <BarChart bars={loadBars} unit="" series={[{ key: "load", label: tr("Load"), color: "var(--chart-s1)" }]} />
            </ChartCard>
          </div>
          <ChartCard title={tr("Weekly distance by workout type")} subtitle={tr("km per week, split by workout type.")}>
            <BarChart bars={distance.bars} series={distance.series} unit="km" width={1080} showLegend format={(v) => String(Math.round(v * 10) / 10)} />
          </ChartCard>
          {data.lockPeriods.length > 0 && (
            <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{tr("Red bands: Training Lock periods. Click a point to open the result.")}</div>
          )}
        </>
      )}

      {rows.length > 0 && (
        <Card pad={16}>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-sunken)" }}>
                  {["Date", "Type", "Distance", "Time", "Avg speed", "Peak HR", "HR 10 min", "Performance", "Load"].map((h) => (
                    <th key={h} style={{ padding: "0.6rem 0.75rem" }}>{tr(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => (
                  <tr key={p.workoutId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <Link to={`/training/sessions/${p.workoutId}/result`}>{clubParts(p.date).date}</Link>
                      {p.hasAlert && <Badge tone="danger">!</Badge>}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{EXERCISE_TYPE_LABEL[p.workoutType] ? tr(EXERCISE_TYPE_LABEL[p.workoutType]) : p.workoutType}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{p.distanceMeters} m</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{formatTime(p.timeSeconds)}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{formatNumber(p.avgSpeedKmh, 2)}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{p.maxHeartRate ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{p.recoveryHeartRate ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{formatScore(p.performanceScore, 2)}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{formatNumber(p.load, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} noun="workouts" onPage={setPage} />}
        </Card>
      )}
    </div>
  );
}
