import { useState, type ReactNode } from "react";
import { tr } from "@/shared/i18n/tr";
import styles from "./FitnessChart.module.css";

// Bộ biểu đồ SVG tự vẽ cho SC-2.07 (không thêm thư viện). Mỗi biểu đồ chỉ một trục tung:
// chỉ số khác đơn vị thì tách biểu đồ riêng, không chồng lên nhau.

export interface ChartSeries {
  key: string;
  label: string;
  color: string; // var(--chart-sN), giữ đúng thứ tự
}

const W = 520;
const H = 220;
const PAD = { left: 44, right: 12, top: 12, bottom: 28 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => n <= s) ?? 10) * p;
}

function Legend({ series, force }: { series: ChartSeries[]; force?: boolean }) {
  if (series.length < 2 && !force) return null;
  return (
    <ul className={styles.legend}>
      {series.map((s) => (
        <li key={s.key}>
          <span className={styles.swatch} style={{ background: s.color }} aria-hidden="true" />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {subtitle && <p className={styles.cardSub}>{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Tooltip({ leftPct, children }: { leftPct: number; children: ReactNode }) {
  return (
    <div className={styles.tooltip} style={{ left: `clamp(0px, calc(${leftPct}% - var(--chart-tip-width) / 2), calc(100% - var(--chart-tip-width)))` }} role="status">
      {children}
    </div>
  );
}

// ---------- Đường ----------
export interface LinePoint {
  id: string;
  t: number; // mốc thời gian (ms)
  label: string; // ngày hiển thị
  values: Record<string, number | null>;
  alert?: boolean;
}

export function LineChart({
  points,
  series,
  from,
  to,
  yMax,
  unit,
  bands = [],
  xTicks,
  onPointClick,
}: {
  points: LinePoint[];
  series: ChartSeries[];
  from: number;
  to: number;
  yMax?: number;
  unit: string;
  bands?: { from: number; to: number }[];
  xTicks: { t: number; label: string }[];
  onPointClick?: (id: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const span = Math.max(1, to - from);
  const x = (t: number) => PAD.left + ((t - from) / span) * PLOT_W;
  const all = points.flatMap((p) => series.map((s) => p.values[s.key]).filter((v): v is number => v != null));
  const max = yMax ?? niceMax(Math.max(0, ...all) * 1.1);
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  const yTicks = [0, max / 2, max];
  const hp = hover != null ? points[hover] : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    let best = -1;
    let bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p.t) - vx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best >= 0 && bestD < 40 ? best : null);
  };

  return (
    <div className={styles.plot}>
      <Legend series={series} />
      <div className={styles.svgWrap}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={styles.svg}
          role="img"
          aria-label={series.map((s) => s.label).join(", ")}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onClick={() => hp && onPointClick?.(hp.id)}
          style={{ cursor: hp && onPointClick ? "pointer" : "default" }}
        >
          {bands.map((b) => {
            const a = Math.max(from, b.from);
            const c = Math.min(to, b.to);
            return c > a ? <rect key={b.from} x={x(a)} y={PAD.top} width={x(c) - x(a)} height={PLOT_H} className={styles.band} /> : null;
          })}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={styles.grid} />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className={styles.axisText}>
                {Math.round(v * 10) / 10}
              </text>
            </g>
          ))}
          {xTicks.map((tk) => (
            <text key={tk.t} x={x(tk.t)} y={H - 8} textAnchor="middle" className={styles.axisText}>
              {tk.label}
            </text>
          ))}
          {hp && <line x1={x(hp.t)} x2={x(hp.t)} y1={PAD.top} y2={PAD.top + PLOT_H} className={styles.crosshair} />}
          {series.map((s) => {
            const pts = points.filter((p) => p.values[s.key] != null);
            const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t)},${y(p.values[s.key]!)}`).join(" ");
            return (
              <g key={s.key}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p) => (
                  <circle
                    key={p.id}
                    cx={x(p.t)}
                    cy={y(p.values[s.key]!)}
                    r={p === hp ? 5 : 4}
                    fill={s.color}
                    className={p.alert ? styles.alertDot : styles.dot}
                  />
                ))}
              </g>
            );
          })}
        </svg>
        {hp && (
          <Tooltip leftPct={(x(hp.t) / W) * 100}>
            <strong>{hp.label}</strong>
            {series.map((s) => (
              <span key={s.key} className={styles.tipRow}>
                <span className={styles.swatch} style={{ background: s.color }} aria-hidden="true" />
                {s.label}: <b>{hp.values[s.key] ?? "—"}</b> {hp.values[s.key] != null ? unit : ""}
              </span>
            ))}
            {hp.alert && <span className={styles.tipAlert}>{tr("Abnormal signs recorded")}</span>}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ---------- Cột / cột chồng ----------
export interface BarDatum {
  key: string;
  label: string; // nhãn trục ngang
  title: string; // tiêu đề tooltip
  values: Record<string, number>;
}

export function BarChart({
  bars,
  series,
  unit,
  format = (v) => String(v),
  width = W,
  showLegend,
}: {
  bars: BarDatum[];
  series: ChartSeries[];
  unit: string;
  format?: (v: number) => string;
  width?: number; // khung rộng (cả hàng) dùng viewBox rộng hơn để chữ không phóng to
  showLegend?: boolean; // biểu đồ chồng: luôn hiện chú thích kể cả khi chỉ có 1 loại
}) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = bars.map((b) => series.reduce((a, s) => a + (b.values[s.key] ?? 0), 0));
  const max = niceMax(Math.max(0, ...totals) * 1.05);
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  const slot = (width - PAD.left - PAD.right) / Math.max(1, bars.length);
  const bw = Math.max(6, Math.min(36, slot * 0.6));
  const step = Math.max(1, Math.ceil(bars.length / 8)); // tối đa ~8 nhãn trục ngang
  const hb = hover != null ? bars[hover] : null;

  return (
    <div className={styles.plot}>
      <Legend series={series} force={showLegend} />
      <div className={styles.svgWrap}>
        <svg viewBox={`0 0 ${width} ${H}`} className={styles.svg} role="img" aria-label={series.map((s) => s.label).join(", ")} onMouseLeave={() => setHover(null)}>
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} className={styles.grid} />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className={styles.axisText}>
                {format(v)}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            let acc = 0;
            const segs = series
              .map((s) => ({ s, v: b.values[s.key] ?? 0 }))
              .filter((d) => d.v > 0);
            return (
              <g key={b.key} onMouseEnter={() => setHover(i)} opacity={hover == null || hover === i ? 1 : 0.55}>
                {/* vùng bắt chuột rộng hơn cột */}
                <rect x={cx - slot / 2} y={PAD.top} width={slot} height={PLOT_H} fill="transparent" />
                {segs.map(({ s, v }, j) => {
                  const top = y(acc + v);
                  const h = y(acc) - top;
                  acc += v;
                  const last = j === segs.length - 1;
                  // khe 2px giữa các đoạn chồng; giữ góc vuông theo hệ thống (--r = 0)
                  return <rect key={s.key} x={cx - bw / 2} y={top + (last ? 0 : 1)} width={bw} height={Math.max(0, h - (last ? 0 : 2))} fill={s.color} />;
                })}
                {i % step === 0 && (
                  <text x={cx} y={H - 8} textAnchor="middle" className={styles.axisText}>
                    {b.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hb && (
          <Tooltip leftPct={((PAD.left + slot * hover! + slot / 2) / width) * 100}>
            <strong>{hb.title}</strong>
            {series
              .filter((s) => (hb.values[s.key] ?? 0) > 0 || series.length === 1)
              .map((s) => (
                <span key={s.key} className={styles.tipRow}>
                  {series.length > 1 && <span className={styles.swatch} style={{ background: s.color }} aria-hidden="true" />}
                  {s.label}: <b>{format(hb.values[s.key] ?? 0)}</b> {unit}
                </span>
              ))}
            {series.length > 1 && (
              <span className={styles.tipRow}>
                {tr("Total")}: <b>{format(totals[hover!])}</b> {unit}
              </span>
            )}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ---------- Vòng tròn (radial gauge) ----------
export function RadialGauge({
  label,
  value,
  max,
  display,
  caption,
  marker,
  tone = "var(--chart-s1)",
}: {
  label: string;
  value: number | null;
  max: number;
  display: string;
  caption?: ReactNode;
  marker?: number; // vạch mốc (VD 100% = bằng trung bình)
  tone?: string;
}) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const ARC = 0.75; // cung 270°
  const frac = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  const markerAngle = marker != null ? -225 + (Math.min(marker, max) / max) * 270 : null;
  return (
    <div className={styles.gauge}>
      <svg viewBox="0 0 120 120" className={styles.gaugeSvg} role="img" aria-label={`${label}: ${display}`}>
        <g transform="rotate(135 60 60)">
          <circle cx="60" cy="60" r={R} className={styles.gaugeTrack} strokeDasharray={`${C * ARC} ${C}`} />
          {value != null && <circle cx="60" cy="60" r={R} fill="none" stroke={tone} strokeWidth="10" strokeDasharray={`${C * ARC * frac} ${C}`} />}
        </g>
        {markerAngle != null && (
          <line
            x1={60 + (R - 8) * Math.cos((markerAngle * Math.PI) / 180)}
            y1={60 + (R - 8) * Math.sin((markerAngle * Math.PI) / 180)}
            x2={60 + (R + 8) * Math.cos((markerAngle * Math.PI) / 180)}
            y2={60 + (R + 8) * Math.sin((markerAngle * Math.PI) / 180)}
            className={styles.gaugeMarker}
          />
        )}
        <text x="60" y="64" textAnchor="middle" className={styles.gaugeValue}>
          {display}
        </text>
      </svg>
      <div className={styles.gaugeText}>
        <span className={styles.gaugeLabel}>{label}</span>
        {caption && <span className={styles.gaugeCaption}>{caption}</span>}
      </div>
    </div>
  );
}
