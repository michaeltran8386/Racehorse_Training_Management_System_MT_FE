import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/shared/components/ui/Icon";
import type { Stall, Zone } from "../types";

import { tr } from "@/shared/i18n/tr";
const BASE: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 76,
  borderRadius: "var(--r-lg)",
  padding: "8px 10px",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: "var(--fs-body)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  cursor: "pointer",
  position: "relative",
};

export interface CellLook {
  title: ReactNode;
  subtitle?: ReactNode;
  bg?: string;
  fg?: string;
  dashed?: boolean;
  striped?: boolean;
  locked?: boolean;
  impounded?: boolean;
  mine?: boolean;
  dimmed?: boolean;
  flash?: boolean;
}

/** Một ô chuồng trên lưới. */
export function GridCell({
  code,
  look,
  selected,
  onClick,
}: {
  code: string;
  look: CellLook;
  selected?: boolean;
  onClick?: () => void;
}) {
  const style: CSSProperties = {
    ...BASE,
    background: look.striped
      ? "repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 6px, var(--border) 6px, var(--border) 12px)"
      : (look.bg ?? BASE.background),
    color: look.fg,
    borderStyle: look.dashed ? "dashed" : "solid",
    borderWidth: look.mine || look.locked || look.impounded || selected ? 2 : 1,
    borderColor: selected
      ? "var(--brand)"
      : look.impounded
        ? "var(--danger)"
        : look.locked
          ? "var(--warn)"
          : look.mine
            ? "var(--ok)"
            : "var(--border)",
    opacity: look.dimmed ? 0.35 : 1,
    boxShadow: look.flash ? "0 0 0 4px var(--warn-bg), 0 0 0 6px var(--warn)" : undefined,
    transition: "box-shadow 0.3s ease",
  };
  return (
    <button type="button" style={style} onClick={onClick} title={code}>
      <span style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "var(--fs-caption)" }}>
        {code}
        <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
          {look.locked && <Icon name="lock" size={12} />}
          {look.impounded && <Icon name="shield-alert" size={12} />}
        </span>
      </span>
      <strong style={{ fontSize: "var(--fs-body)" }}>{look.title}</strong>
      {look.subtitle && <span style={{ fontSize: "var(--fs-caption)", opacity: 0.8 }}>{look.subtitle}</span>}
      {look.mine && (
        <span style={{ position: "absolute", right: 6, bottom: 4, fontSize: "var(--fs-caption)", fontWeight: 700, color: "var(--ok)" }}>
          {tr("Mine")}
        </span>
      )}
    </button>
  );
}

/**
 * Lưới Số hàng × Số cột của một khu (SC-1.04, SC-3.01 chế độ Theo chuồng). Vị trí chưa khai báo ô hiện mờ,
 * không bấm được. Ô chưa có vị trí (dữ liệu cũ) xếp sau lưới.
 */
export function ZoneGrid({
  zone,
  stalls,
  renderCell,
}: {
  zone: Pick<Zone, "rows" | "cols">;
  stalls: Stall[];
  renderCell: (stall: Stall) => ReactNode;
}) {
  const byPos = new Map(stalls.filter((s) => s.row && s.col).map((s) => [`${s.row}-${s.col}`, s]));
  const unplaced = stalls.filter((s) => !s.row || !s.col);
  const cells: ReactNode[] = [];
  for (let r = 1; r <= zone.rows; r++) {
    for (let c = 1; c <= zone.cols; c++) {
      const s = byPos.get(`${r}-${c}`);
      cells.push(
        s ? (
          <div key={s.id}>{renderCell(s)}</div>
        ) : (
          <div
            key={`empty-${r}-${c}`}
            aria-hidden="true"
            style={{ minHeight: 76, borderRadius: "var(--r-lg)", border: "1px dashed var(--border)", opacity: 0.35 }}
          />
        ),
      );
    }
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${zone.cols}, minmax(110px, 1fr))`,
          gap: 10,
          minWidth: zone.cols * 120,
        }}
      >
        {cells}
      </div>
      {unplaced.length > 0 && (
        <>
          <p style={{ margin: "16px 0 8px", fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>
            {tr("Stalls without a grid position (set Row / Column in the stall catalogue):")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 110px), 1fr))", gap: 10 }}>
            {unplaced.map((s) => (
              <div key={s.id}>{renderCell(s)}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
