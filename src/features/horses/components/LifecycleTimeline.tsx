import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/form/Input";
import { Icon } from "@/shared/components/ui/Icon";
import { formatDateTime } from "@/shared/lib/format";
import type { TimelineCategory, TimelineEvent } from "../types";

import { tr } from "@/shared/i18n/tr";
const PAGE = 30;

const GROUPS: Array<{ id: TimelineCategory; label: string; iconName: string; managerOnly?: boolean }> = [
  { id: "IDENTITY", label: "Profile", iconName: "clipboard" },
  { id: "STATUS", label: "Status", iconName: "refresh" },
  { id: "STALL", label: "Stall", iconName: "home" },
  { id: "CARE", label: "Care", iconName: "droplet" },
  { id: "OWNERSHIP", label: "Ownership", iconName: "users", managerOnly: true },
  { id: "MEDICAL", label: "Medical", iconName: "stethoscope" },
  { id: "TRAINING", label: "Training", iconName: "activity" },
  { id: "TOURNAMENT", label: "Racing", iconName: "trophy" },
];

/** Tab 6 Dòng thời gian (P1-13): lọc nhóm (chọn nhiều), khoảng ngày, Tải thêm 30 mục mỗi lần. */
export function LifecycleTimeline({ events, isManager }: { events: TimelineEvent[]; isManager: boolean }) {
  const groups = GROUPS.filter((g) => !g.managerOnly || isManager);
  const [selected, setSelected] = useState<TimelineCategory[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const end = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    return events.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return (selected.length === 0 || selected.includes(e.category)) && t >= start && t <= end;
    });
  }, [events, selected, from, to]);

  function toggle(id: TimelineCategory) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));
    setShown(PAGE);
  }

  const getIconName = (c: TimelineCategory) => GROUPS.find((g) => g.id === c)?.iconName ?? "pin";

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {groups.map((g) => {
          const on = selected.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(g.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: "var(--r)",
                border: `1px solid ${on ? "var(--brand)" : "var(--border)"}`,
                background: on ? "var(--brand-surface)" : "var(--surface)",
                color: on ? "var(--brand-700)" : "var(--ink-secondary)",
                fontWeight: on ? 600 : 500,
                cursor: "pointer",
                fontSize: "var(--fs-body)",
              }}
            >
              <Icon name={g.iconName} size={13} />
              <span>{tr(g.label)}</span>
            </button>
          );
        })}
        <div style={{ width: 150 }}>
          <Input type="date" aria-label={tr("From date")} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div style={{ width: 150 }}>
          <Input type="date" aria-label={tr("To date")} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(selected.length > 0 || from || to) && (
          <Button
            tone="ghost"
            size="sm"
            onClick={() => {
              setSelected([]);
              setFrom("");
              setTo("");
            }}
          >
            {tr("Clear filters")}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--ink-muted)", margin: 0 }}>{tr("No events yet.")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.slice(0, shown).map((evt) => (
            <div
              key={evt.id}
              style={{ display: "flex", gap: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--brand-surface)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--brand-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={getIconName(evt.category)} size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <strong style={{ fontSize: "var(--fs-body)" }}>{evt.title}</strong>
                    {evt.badgeTone && <Badge tone={evt.badgeTone}>{GROUPS.find((g) => g.id === evt.category)?.label ?? evt.category}</Badge>}
                  </div>
                  <span style={{ fontSize: "var(--fs-body)", color: "var(--ink-muted)" }}>{formatDateTime(evt.timestamp)}</span>
                </div>
                <div style={{ fontSize: "var(--fs-body)", marginTop: 4 }}>
                  {evt.description}
                  {evt.actor && <span style={{ color: "var(--ink-muted)" }}> · by {evt.actor}</span>}
                </div>
                {evt.link && (
                  <Link to={evt.link} style={{ fontSize: "var(--fs-body)" }}>
                    {tr("View details")}
                  </Link>
                )}
              </div>
            </div>
          ))}
          {shown < filtered.length && (
            <Button tone="secondary" onClick={() => setShown((n) => n + PAGE)}>
              {tr("Load more ({{count}} left)", { count: filtered.length - shown })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
