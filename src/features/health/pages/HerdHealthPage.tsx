import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./HerdHealthPage.module.css";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Segmented } from "@/shared/components/ui/Segmented";
import { SkeletonCards } from "@/shared/components/ui/Skeleton";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { messageFor } from "@/shared/lib/messages";
import { formatDate, formatDateTime, formatTime } from "@/shared/lib/format";
import { HEALTH_STATUS } from "@/shared/lib/status";
import type { HealthStatus } from "@/shared/types/enums";
import { getStalls, getZones } from "@/features/stable/api";
import type { Stall, Zone } from "@/features/stable/types";
import { GridCell, ZoneGrid } from "@/features/stable/components/ZoneGrid";
import { getHealthBoard, type HealthBoardHorse, type HealthBoardResponse } from "../api";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import { DataTable, type Column } from "@/shared/components/ui/DataTable";

import { tr } from "@/shared/i18n/tr";
type Group = HealthBoardHorse["healthGroup"];

/** 4 nhóm màu (Flow 3 §4.1). Ngựa Ngừng quản lý không có trên sơ đồ (BE đã loại). */
const GROUP: Record<Group, { label: string; color: string; bg: string }> = {
  QUALIFIED: { label: "Fit to work", color: "var(--ok)", bg: "var(--ok-bg)" },
  OBSERVATION: { label: "Under observation", color: "var(--warn)", bg: "var(--warn-bg)" },
  INJURED: { label: "Injured", color: "var(--danger)", bg: "var(--danger-bg)" },
  ISOLATED: { label: "Isolated", color: "var(--violet)", bg: "var(--violet-bg)" },
};
const GROUP_ORDER: Group[] = ["QUALIFIED", "OBSERVATION", "INJURED", "ISOLATED"];
const REFRESH_MS = 60_000;

/** SC-3.01 Sơ đồ sức khỏe đàn ngựa (P1-14): CM, HT, VET. Dữ liệu thật từ BE, lỗi thì hiện lỗi (không dùng dữ liệu giả). */
export default function HerdHealthPage() {
  useScreenTranslation();
  const user = useCurrentUser();
  const isVet = user.role === "VETERINARIAN";

  const [board, setBoard] = useState<HealthBoardResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [view, setView] = useState<"cards" | "stalls">("cards");
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const groups = useMemo(() => GROUP_ORDER.filter((group) => params.getAll("status").includes(group)), [params]);
  const lock = params.get("lock");
  const lockFilter = lock === "LOCKED" || lock === "UNLOCKED" ? lock : "ALL";
  const overdueOnly = params.get("overdue") === "1";

  function setFilter(key: string, value?: string, replace = false) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace });
  }
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState("");
  const [zoneRetry, setZoneRetry] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBoard(await getHealthBoard());
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  // Chế độ Theo chuồng: bắt buộc chọn 1 khu.
  useEffect(() => {
    if (view !== "stalls" || zones.length > 0) return;
    let cancelled = false;
    setZoneLoading(true);
    setZoneError("");
    getZones()
      .then((z) => {
        if (cancelled) return;
        setZones(z);
        setZoneId((cur) => cur || z[0]?.id || "");
        if (z.length === 0) setZoneLoading(false);
      })
      .catch((err) => {
        if (!cancelled) { setZoneError(messageFor(err)); setZoneLoading(false); }
      });
    return () => { cancelled = true; };
  }, [view, zones.length, zoneRetry]);

  useEffect(() => {
    if (view !== "stalls" || !zoneId) return;
    let cancelled = false;
    setZoneLoading(true);
    setZoneError("");
    setStalls([]);
    getStalls({ zoneId })
      .then((data) => { if (!cancelled) setStalls(data); })
      .catch((err) => { if (!cancelled) setZoneError(messageFor(err)); })
      .finally(() => { if (!cancelled) setZoneLoading(false); });
    return () => { cancelled = true; };
  }, [view, zoneId, updatedAt, zoneRetry]);

  const horses = useMemo(() => board?.data ?? [], [board]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return horses.filter(
      (h) =>
        (groups.length === 0 || groups.includes(h.healthGroup)) &&
        (lockFilter === "ALL" || (lockFilter === "LOCKED") === h.isMedicalLocked) &&
        (!overdueOnly || h.hasOverduePreventive) &&
        (!q || h.name.toLowerCase().includes(q) || (h.horseCode ?? "").toLowerCase().includes(q)),
    );
  }, [horses, groups, lockFilter, overdueOnly, search]);
  const byId = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);
  const visible = useMemo(() => new Set(filtered.map((h) => h.id)), [filtered]);
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  const filtersOn = groups.length > 0 || lockFilter !== "ALL" || overdueOnly || !!search;

  function clearFilters() {
    const next = new URLSearchParams(params);
    for (const key of ["status", "lock", "overdue", "search"]) next.delete(key);
    setParams(next);
  }

  function toggleGroup(g: Group) {
    const next = new URLSearchParams(params);
    next.delete("status");
    for (const group of GROUP_ORDER) {
      if (groups.includes(group) !== (group === g)) next.append("status", group);
    }
    setParams(next);
  }

  const s = board?.summary;
  const cards: Array<{ key: string; label: string; value: number; color: string; onClick: () => void; on: boolean }> = s
    ? [
        ...GROUP_ORDER.map((g) => ({
          key: g,
          label: GROUP[g].label,
          value: { QUALIFIED: s.qualifiedCount, OBSERVATION: s.observationCount, INJURED: s.injuredCount, ISOLATED: s.isolatedCount }[g],
          color: GROUP[g].color,
          onClick: () => toggleGroup(g),
          on: groups.includes(g),
        })),
        {
          key: "LOCK",
          label: "Training Lock",
          value: s.lockedCount,
          color: "var(--danger)",
          onClick: () => setFilter("lock", lockFilter === "LOCKED" ? undefined : "LOCKED"),
          on: lockFilter === "LOCKED",
        },
        {
          key: "OVERDUE",
          label: "Preventive care overdue",
          value: s.overdueCount,
          color: "var(--warn)",
          onClick: () => setFilter("overdue", overdueOnly ? undefined : "1"),
          on: overdueOnly,
        },
      ]
    : [];

  // Danh sách dạng bảng 10 dòng/trang (thay cho lưới thẻ cuộn dài), xếp theo nhóm sức khỏe.
  const rows = useMemo(
    () => [...filtered].sort((x, y) => GROUP_ORDER.indexOf(x.healthGroup) - GROUP_ORDER.indexOf(y.healthGroup) || x.name.localeCompare(y.name)),
    [filtered],
  );
  const columns: Column<HealthBoardHorse>[] = [
    {
      key: "horse",
      header: tr("Horse"),
      render: (h) => (
        <span style={{ display: "grid", gap: 2 }}>
          <strong>{h.name}</strong>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
            {h.horseCode ?? "—"} {tr("· Stall")} {h.stallCode ?? "—"}
          </span>
        </span>
      ),
    },
    {
      key: "group",
      header: tr("Health status"),
      width: 150,
      render: (h) => {
        const g = GROUP[h.healthGroup];
        return <span className={styles.horseStatus} style={{ background: g.bg, color: g.color }}>{tr(g.label)}</span>;
      },
    },
    {
      key: "flags",
      header: tr("Training Lock"),
      width: 150,
      render: (h) => (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          {h.isMedicalLocked ? <Badge tone="danger" icon="lock">{tr("Locked")}</Badge> : <span style={{ color: "var(--text-muted)" }}>—</span>}
          {h.hasOverduePreventive && (
            <span title={tr("Preventive care overdue")} style={{ color: "var(--warn)", display: "inline-flex" }}>
              <Icon name="bell" size={16} />
              <span className="sr-only">{tr("Preventive care overdue")}</span>
            </span>
          )}
        </span>
      ),
    },
    { key: "injuries", header: tr("Open injuries"), width: 120, align: "right", render: (h) => h.openInjuries.length },
    { key: "exam", header: tr("Last exam"), width: 130, hideOnNarrow: true, render: (h) => (h.latestRecord ? formatDate(h.latestRecord.examinationDate) : "—") },
  ];

  function panel(h: HealthBoardHorse) {
    const g = GROUP[h.healthGroup];
    return (
      <Modal
        title={h.name}
        subtitle={`${h.horseCode} ${tr("· Stall")} ${h.stallCode ?? "—"}`}
        width={560}
        onClose={() => setSelectedId(null)}
        foot={
          <>
            <LinkButton to={`/medical/horses/${h.id}`} tone="secondary">{tr("Open medical profile")}</LinkButton>
            {isVet &&
              (h.isMedicalLocked ? (
                <Badge tone="danger" icon="lock">{tr("Locked")}</Badge>
              ) : (
                <LinkButton to={`/medical/locks?horseId=${encodeURIComponent(h.id)}&action=place`} tone="primary">{tr("Place Training Lock")}</LinkButton>
              ))}
          </>
        }
      >
      <div className={styles.panel}>
        <span style={{ background: g.bg, color: g.color, borderRadius: "var(--r-sm)", padding: "2px 10px", justifySelf: "start" }}>
          {[...new Set([tr(g.label), tr(HEALTH_STATUS[h.status as HealthStatus]?.label ?? h.status)])].join(" · ")}
        </span>
        <section>
          <strong>{tr("Training Lock")}</strong>
          {h.lock ? (
            <div style={{ fontSize: "var(--fs-body)" }}>
              {tr("Placed {{date}} by {{vet}}", { date: formatDateTime(h.lock.lockedAt), vet: h.lock.veterinarianName ?? "—" })}
              <br />
              {tr("Review date:")} {h.lock.recheckDate ? formatDate(h.lock.recheckDate) : "—"}
            </div>
          ) : (
            <div style={{ fontSize: "var(--fs-body)" }}>{tr("None")}</div>
          )}
        </section>
        <section>
          <strong>{tr("Latest medical record")}</strong>
          <div style={{ fontSize: "var(--fs-body)" }}>
            {h.latestRecord ? `${formatDate(h.latestRecord.examinationDate)} – ${h.latestRecord.diagnosis}` : tr("None")}
          </div>
        </section>
        <section>
          <strong>{tr("Open injuries")}</strong>
          <div style={{ fontSize: "var(--fs-body)" }}>
            {h.openInjuries.length === 0 ? tr("None") : h.openInjuries.map((i) => `${i.zone} (${tr(i.stage.charAt(0) + i.stage.slice(1).toLowerCase())})`).join(", ")}
          </div>
        </section>
        <section>
          <strong>{tr("Preventive care due (30 days)")}</strong>
          <div style={{ fontSize: "var(--fs-body)", display: "grid", gap: 2 }}>
            {h.preventiveDue.length === 0
              ? tr("None")
              : h.preventiveDue.map((p) => (
                  <span key={`${p.name}-${p.dueDate}`} style={{ color: p.overdue ? "var(--danger)" : undefined }}>
                    {p.name}: {formatDate(p.dueDate)}
                    {p.overdue ? ` (${tr("overdue")})` : ""}
                  </span>
                ))}
          </div>
        </section>
        <section>
          <strong>{tr("Groom observation (last 24 h)")}</strong>
          <div style={{ fontSize: "var(--fs-body)" }}>
            {h.latestObservation
              ? `${h.latestObservation.text} — ${h.latestObservation.groomName ?? "Groom"}, ${formatTime(h.latestObservation.at)}`
              : tr("None")}
          </div>
        </section>
      </div>
      </Modal>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PageHeader
        title={tr("Herd health")}
        description={updatedAt ? tr("Updated at {{time}}", { time: formatTime(updatedAt) }) : undefined}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Segmented
              label={tr("View")}
              items={[
                { id: "cards", label: tr("List") },
                { id: "stalls", label: tr("By stall") },
              ]}
              active={view}
              onChange={(next) => { if (next === view) return; if (next === "stalls") setZoneLoading(true); setView(next); }}
            />
            {isVet && (
              <LinkButton to="/medical/locks" tone="secondary">{tr("Training Locks")}</LinkButton>
            )}
          </div>
        }
      />

      {error && (
        <Alert tone="danger" title={tr("Could not load data.")} action={<Button size="sm" onClick={() => void load()}>{tr("Try again")}</Button>}>
          {error}
        </Alert>
      )}

      {s && (
        <div className={styles.summary}>
          {cards.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={c.on}
              onClick={c.onClick}
              style={{
                minWidth: 150,
                padding: "10px 14px",
                textAlign: "left",
                borderRadius: "var(--r-lg)",
                background: "var(--surface)",
                border: `${c.on ? 2 : 1}px solid ${c.on ? c.color : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{tr(c.label)}</div>
              <div style={{ fontSize: "var(--fs-kpi)", fontWeight: 700, color: c.color }}>{c.value}</div>
            </button>
          ))}
        </div>
      )}

      <div className={styles.filters}>
        <div style={{ width: 240 }}>
          <Input placeholder={tr("Horse name or code")} aria-label={tr("Find a horse")} value={search} onChange={(e) => setFilter("search", e.target.value, true)} />
        </div>
        <div style={{ width: 170 }}>
          <Select
            aria-label={tr("Training Lock")}
            value={lockFilter}
            onChange={(e) => setFilter("lock", e.target.value === "ALL" ? undefined : e.target.value)}
            options={[
              { value: "ALL", label: tr("Lock: all") },
              { value: "LOCKED", label: tr("Locked") },
              { value: "UNLOCKED", label: tr("Not locked") },
            ]}
          />
        </div>
        {view === "stalls" && zones.length > 0 && (
          <div style={{ width: 200 }}>
            <Select
              aria-label={tr("Barn zone")}
              value={zoneId}
              onChange={(e) => { setZoneLoading(true); setZoneId(e.target.value); }}
              options={zones.map((z) => ({ value: z.id, label: z.name }))}
            />
          </div>
        )}
        <Checkbox checked={overdueOnly} onChange={(checked) => setFilter("overdue", checked ? "1" : undefined)} label={tr("Preventive care overdue")} />
        {filtersOn && (
          <Button tone="ghost" size="sm" onClick={clearFilters}>{tr("Clear filters")}</Button>
        )}
      </div>

      <div className={styles.board}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <SkeletonCards count={4} />
          ) : !board && error ? null : horses.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", border: "2px dashed var(--border)", borderRadius: "var(--r-lg)" }}>{tr("No horses yet.")}</div>
          ) : filtered.length === 0 && view === "cards" ? (
            <div style={{ padding: 40, textAlign: "center", border: "2px dashed var(--border)", borderRadius: "var(--r-lg)" }}>
              {tr("No horse matches the filters.")}
            </div>
          ) : view === "cards" ? (
            <DataTable
              caption={tr("Herd health")}
              columns={columns}
              rows={rows}
              rowKey={(h) => h.id}
              selectedKey={selectedId}
              onRowClick={(h) => setSelectedId(h.id)}
              noun="horses"
            />
          ) : zoneLoading ? (
            <SkeletonCards count={4} />
          ) : zoneError ? (
            <Alert tone="danger" title={tr("Could not load data.")} action={<Button size="sm" onClick={() => setZoneRetry((value) => value + 1)}>{tr("Try again")}</Button>}>
              {zoneError}
            </Alert>
          ) : (
            (() => {
              const zone = zones.find((z) => z.id === zoneId);
              if (!zone) return <div style={{ padding: 40, textAlign: "center" }}>{tr("No barn zones yet.")}</div>;
              return (
                <ZoneGrid
                  zone={zone}
                  stalls={stalls}
                  renderCell={(st) => {
                    const a = st.allocations.find((allocation) => allocation.isActive);
                    const h = a ? byId.get(a.horse.id) : undefined;
                    if (!h) {
                      return (
                        <GridCell
                          code={st.code}
                          look={a
                            ? { title: a.horse.name, subtitle: tr("Health status unavailable") }
                            : st.status === "MAINTENANCE"
                              ? { title: tr("Maintenance"), striped: true }
                              : st.status === "INACTIVE"
                                ? { title: tr("Inactive"), striped: true }
                                : st.status === "OCCUPIED"
                                  ? { title: tr("Occupied"), subtitle: tr("Health status unavailable") }
                                  : { title: tr("Empty"), dashed: true }}
                        />
                      );
                    }
                    const g = GROUP[h.healthGroup];
                    return (
                      <GridCell
                        code={st.code}
                        selected={h.id === selectedId}
                        look={{ title: h.name, subtitle: tr(g.label), bg: g.bg, fg: g.color, locked: h.isMedicalLocked, dimmed: !visible.has(h.id) }}
                        onClick={() => setSelectedId(h.id)}
                      />
                    );
                  }}
                />
              );
            })()
          )}
        </div>
        {selected && panel(selected)}
      </div>
    </div>
  );
}
