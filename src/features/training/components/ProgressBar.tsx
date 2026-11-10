
import { Link } from "react-router-dom";
import { tr } from "@/shared/i18n/tr";

export interface ProgressBarProps {
  done: number;
  total: number;
  due?: number;
  overdue?: number;
  /** Trang mở khi bấm dòng "Trễ ghi kết quả" (chi tiết giáo án, lọc sẵn các buổi trễ). */
  overdueHref?: string;
}

/** Thanh tiến độ giáo án (T1): Hoàn thành / Tổng buổi, hiển thị Đúng tiến độ & Trễ ghi kết quả. */
export function ProgressBar({ done, total, due, overdue, overdueHref }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const onTrackPct = due != null && due > 0 ? Math.round((done / due) * 100) : null;
  const overdueCount = overdue ?? (due != null ? Math.max(0, due - done) : 0);

  const titleParts = [
    `${tr("Progress")}: ${pct}% (${done}/${total})`,
  ];
  if (onTrackPct != null) {
    titleParts.push(`${tr("On schedule")}: ${onTrackPct}% (${done}/${due})`);
  }
  if (overdueCount > 0) {
    titleParts.push(`${tr("Overdue results")}: ${overdueCount} ${tr("session(s)")}`);
  }

  return (
    <div title={titleParts.join(" · ")} style={{ minWidth: 120 }}>
      <div style={{ height: 6, background: "var(--surface-sunken)", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: "var(--brand)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "var(--fs-caption, 12px)",
          color: "var(--text-muted)",
          marginTop: 2,
          gap: "4px",
        }}
      >
        <span>{total > 0 ? `${pct}% (${done}/${total})` : tr("No sessions yet")}</span>
        {onTrackPct != null && (
          <span style={{ fontSize: "11px", opacity: 0.85 }} title={`${tr("On schedule")}: ${onTrackPct}% (${done}/${due})`}>
            {tr("On track")}: {onTrackPct}%
          </span>
        )}
      </div>
      {overdueCount > 0 && (
        <div style={{ fontSize: "11px", color: "var(--danger)", marginTop: 2, fontWeight: 600 }}>
          {overdueHref ? (
            <Link
              to={overdueHref}
              title={tr("Open the overdue workouts")}
              style={{ color: "inherit", textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              {tr("Overdue results")}: {overdueCount} {tr("session(s)")}
            </Link>
          ) : (
            <>
              {tr("Overdue results")}: {overdueCount} {tr("session(s)")}
            </>
          )}
        </div>
      )}
    </div>
  );
}
