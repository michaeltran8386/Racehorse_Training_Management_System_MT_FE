import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./StableMapPage.module.css";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Modal } from "@/shared/components/ui/Modal";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { HealthBadge } from "@/shared/components/ui/HealthBadge";
import { Segmented } from "@/shared/components/ui/Segmented";
import { Select } from "@/shared/components/form/Select";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { Field } from "@/shared/components/form/Field";
import { Textarea } from "@/shared/components/form/Textarea";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { messageFor } from "@/shared/lib/messages";
import { formatDate, formatTime } from "@/shared/lib/format";
import type { HealthStatus } from "@/shared/types/enums";
import { getStalls, getZones, setStallStatus } from "../api";
import type { SettableStallStatus, Stall, Zone } from "../types";
import { STALL_STATUS_LABEL } from "../types";
import { GridCell, ZoneGrid, type CellLook } from "../components/ZoneGrid";
import { AssignStallDialog, ReturnStallDialog, TransferStallDialog } from "../components/StallDialogs";
import { StallDialog, ZoneDialog } from "../components/StallZoneModals";
import { HEALTH_STATUS } from "@/shared/lib/status";
import { HORSE_STATUS_COLOR, allocationOf, useStallCounts } from "../stallUtils";

import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
const REFRESH_MS = 60_000;
const settableStatuses: SettableStallStatus[] = ["AVAILABLE", "MAINTENANCE", "INACTIVE"];
const stallStatusOptions = settableStatuses.map((value) => ({ value, label: STALL_STATUS_LABEL[value] }));

type Dialog = "assign" | "transfer" | "return" | null;

/** SC-1.04 Sơ đồ chuồng trại: CM, HT, VET, GROOM (OWNER bị chặn ở route và BE). */
export default function StableMapPage() {
  useScreenTranslation();
  useAppLanguage(); // subscribe to language changes so tr() placeholder re-renders
  const user = useCurrentUser();
  const canManage = user.role === "CLUB_MANAGER" || user.role === "HEAD_TRAINER";
  const canSetStatus = user.role === "CLUB_MANAGER";
  const isGroom = user.role === "GROOM";

  const [zones, setZones] = useState<Zone[] | null>(null);
  const [zoneId, setZoneId] = useState("");
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [onlyMine, setOnlyMine] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [stallModalOpen, setStallModalOpen] = useState(false);
  const [statusChange, setStatusChange] = useState<(typeof stallStatusOptions)[number] | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<Stall[] | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const loadZones = useCallback(() => {
    getZones()
      .then((list) => {
        setZones(list);
        setZoneId((cur) => cur || list[0]?.id || "");
        if (list.length === 0) setLoading(false);
      })
      .catch((err) => {
        setError(messageFor(err));
        setLoading(false);
      });
  }, []);

  const loadStalls = useCallback(() => {
    if (!zoneId) return;
    setError("");
    getStalls({ zoneId, includeInactive: canSetStatus })
      .then((list) => {
        setStalls(list);
        setUpdatedAt(new Date());
      })
      .catch((err) => setError(messageFor(err)))
      .finally(() => setLoading(false));
  }, [canSetStatus, zoneId]);

  useEffect(loadZones, [loadZones]);
  useEffect(() => {
    loadStalls();
    // Tự làm mới mỗi 60 giây khi tab đang mở.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadStalls();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadStalls]);

  // Tìm ngựa trên mọi khu: gợi ý, chọn một ngựa -> chuyển sang khu đó, ô nhấp nháy 3 giây.
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setMatches(null);
      return;
    }
    const t = window.setTimeout(() => {
      getStalls({ search: q })
        .then((list) => setMatches(list.filter((s) => s.allocations.length > 0)))
        .catch(() => setMatches([]));
    }, 400);
    return () => window.clearTimeout(t);
  }, [search]);

  function jumpTo(stall: Stall) {
    setSearch("");
    setMatches(null);
    if (stall.zoneId && stall.zoneId !== zoneId) setZoneId(stall.zoneId);
    setSelectedId(stall.id);
    setFlashId(stall.id);
    window.setTimeout(() => setFlashId(null), 3000);
  }

  const zone = zones?.find((z) => z.id === zoneId);
  const counts = useStallCounts(stalls);
  const selected = stalls.find((s) => s.id === selectedId) ?? null;

  const isMine = useCallback(
    (s: Stall) => isGroom && s.allocations.some((a) => a.assignedGroomUserId === user.id),
    [isGroom, user.id],
  );

  const lookOf = useCallback(
    (s: Stall): CellLook => {
      const a = s.allocations[0];
      if (a) {
        const color = HORSE_STATUS_COLOR[a.horse.status] ?? HORSE_STATUS_COLOR.RESTING;
        return {
          title: a.horse.name,
          subtitle: a.horse.horseCode ?? undefined,
          bg: color.bg,
          fg: color.fg,
          locked: !!a.horse.isMedicalLocked,
          impounded: !!a.horse.isDebtImpounded,
          mine: isMine(s),
          dimmed: onlyMine && !isMine(s),
          flash: flashId === s.id,
        };
      }
      if (s.status === "MAINTENANCE") return { title: tr("Maintenance"), striped: true, dimmed: onlyMine, flash: flashId === s.id };
      if (s.status === "INACTIVE") return { title: tr("Inactive"), striped: true, dimmed: onlyMine, flash: flashId === s.id };
      return { title: tr("Empty"), dashed: true, dimmed: onlyMine, flash: flashId === s.id };
    },
    [isMine, onlyMine, flashId],
  );

  const listRows = useMemo(() => [...stalls].sort((a, b) => a.code.localeCompare(b.code)), [stalls]);

  function closeDialog(changed: boolean) {
    setDialog(null);
    if (changed) loadStalls();
  }

  async function applyStatus() {
    if (!selected || !statusChange || statusBusy) return;
    // Bảo trì / ngừng dùng phải có lý do để HLV, Groom biết vì sao ô không nhận ngựa (BUG-MAN-09).
    if (statusChange.value !== "AVAILABLE" && statusNote.trim().length < 5) {
      setStatusError(tr("Enter a reason of at least 5 characters."));
      return;
    }
    setStatusBusy(true);
    setStatusError("");
    try {
      const updated = await setStallStatus(selected.id, statusChange.value, statusNote.trim() || undefined);
      setStalls((rows) => rows.map((stall) => stall.id === updated.id ? updated : stall));
      setStatusChange(null);
      loadStalls();
    } catch (err) {
      setStatusError(messageFor(err));
    } finally {
      setStatusBusy(false);
    }
  }

  function renderPanel(s: Stall) {
    const a = s.allocations[0];
    const canOpenProfile = !isGroom || isMine(s);
    const alloc = allocationOf(s);
    return (
      <Modal
        title={`${tr("Stall")} ${s.code}`}
        subtitle={`${tr("Zone {{zone}}", { zone: s.zone })}${s.row && s.col ? tr(" · Row {{row}}, Col {{col}}", { row: s.row, col: s.col }) : ""}`}
        width={440}
        onClose={() => setSelectedId(null)}
      >
      <div className={styles.panel}>
        {a ? (
          <>
            <div>
              <strong>{a.horse.name}</strong> <span style={{ color: "var(--text-muted)" }}>{a.horse.horseCode}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <HealthBadge status={a.horse.status as HealthStatus} />
              {a.horse.isMedicalLocked && <Badge tone="warn" icon="lock">{tr("Khóa y tế")}</Badge>}
              {a.horse.isDebtImpounded && (
                <Badge tone="danger" icon="alert-circle" title={a.horse.debtImpoundReason ?? undefined}>
                  {tr("Lưu giữ do nợ phí")}
                </Badge>
              )}
            </div>
            <div style={{ fontSize: "var(--fs-body)" }}>{tr("Groom:")}{" "}{a.assignedGroom?.fullName ?? "—"}</div>
            <div style={{ fontSize: "var(--fs-body)" }}>{tr("In this stall since {{date}}", { date: formatDate(a.startDate) })}</div>
            {canOpenProfile && (
              <LinkButton to={`/horses/${a.horse.id}`} tone="secondary">{tr("View horse profile")}</LinkButton>
            )}
            {canManage && alloc && (
              <>
                <Button tone="ghost" block onClick={() => setDialog("transfer")}>{tr("Move stall")}</Button>
                <Button tone="danger" block onClick={() => setDialog("return")}>{tr("Release stall")}</Button>
              </>
            )}
          </>
        ) : (
          <>
            <Badge tone={s.status === "MAINTENANCE" ? "warn" : "neutral"}>
              {s.status === "MAINTENANCE" ? tr("Maintenance") : s.status === "INACTIVE" ? tr("Inactive") : tr("Empty")}
            </Badge>
            {s.notes && <p style={{ margin: 0, fontSize: "var(--fs-body)" }}>{s.notes}</p>}
            {canManage && s.status === "AVAILABLE" && (
              <Button block onClick={() => setDialog("assign")}>{tr("Assign a horse")}</Button>
            )}
            {canSetStatus && !alloc && (
              <Select
                aria-label={tr("Stall status")}
                value=""
                options={[
                  { value: "", label: tr("Change status…") },
                  ...stallStatusOptions.filter((option) => option.value !== s.status),
                ]}
                onChange={(event) => {
                  setStatusError("");
                  setStatusNote("");
                  setStatusChange(stallStatusOptions.find((option) => option.value === event.target.value) ?? null);
                }}
              />
            )}
          </>
        )}
      </div>
      </Modal>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PageHeader
        title={tr("Stable map")}
        description={updatedAt ? tr("Updated at {{time}}", { time: formatTime(updatedAt) }) : undefined}
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {zones && zones.length > 0 && (
              <div style={{ width: 200 }}>
                <Select
                  aria-label={tr("Barn zone")}
                  value={zoneId}
                  onChange={(e) => {
                    setZoneId(e.target.value);
                    setSelectedId(null);
                  }}
                  options={zones.map((z) => ({ value: z.id, label: z.name }))}
                />
              </div>
            )}
            <div style={{ position: "relative" }}>
              <input
                type="search"
                aria-label={tr("Find a horse on the map")}
                placeholder={tr("Horse name or code")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.search}
              />
              {matches && (
                <div className={styles.suggestions}>
                  {matches.length === 0 ? (
                    <div style={{ padding: 12, fontSize: "var(--fs-body)" }}>{tr("No horse found on the map.")}</div>
                  ) : (
                    matches.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => jumpTo(s)}
                        className={styles.suggestion}
                      >
                        <strong>{s.allocations[0]?.horse.name}</strong> · {s.code} ({s.zone})
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {canSetStatus && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button tone="primary" onClick={() => setZoneModalOpen(true)}>+ {tr("Thêm khu chuồng")}</Button>
                <Button tone="secondary" onClick={() => setStallModalOpen(true)}>+ {tr("Thêm ô chuồng")}</Button>
              </div>
            )}
            <Segmented
              label={tr("View")}
              items={[
                { id: "grid", label: tr("Map") },
                { id: "list", label: tr("List") },
              ]}
              active={view}
              onChange={setView}
            />
          </div>
        }
      />

      {error && (
        <Alert tone="danger" title={tr("Could not load the stable map.")} action={<Button size="sm" onClick={loadStalls}>{tr("Try again")}</Button>}>
          {error}
        </Alert>
      )}

      {zones && zones.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", border: "2px dashed var(--border)", borderRadius: "var(--r-lg)", display: "grid", gap: 12, justifyItems: "center" }}>
          <p>{tr("No barn zones have been set up yet.")}</p>
          {user.role === "CLUB_MANAGER" && (
            <div style={{ display: "flex", gap: 8 }}>
              <Button tone="primary" onClick={() => setZoneModalOpen(true)}>+ {tr("Thêm khu chuồng đầu tiên")}</Button>
              <LinkButton to="/catalogs/stalls" tone="secondary">{tr("Go to the stall catalogue")}</LinkButton>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={styles.summary}>
            <span>{tr("Total stalls:")}{" "}<strong>{counts.total}</strong></span>
            <span>{tr("Occupied:")}{" "}<strong>{counts.occupied}</strong></span>
            <span>{tr("Empty:")}{" "}<strong>{counts.free}</strong></span>
            <span>{tr("Maintenance:")}{" "}<strong>{counts.maintenance}</strong></span>
            {isGroom && (
              <Checkbox checked={onlyMine} onChange={setOnlyMine} label={tr("Only my horses")} />
            )}
          </div>
          <ul aria-label={tr("Legend")} style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "var(--fs-caption)", color: "var(--text-2)", margin: 0, padding: 0, listStyle: "none" }}>
            {Object.entries(HORSE_STATUS_COLOR).map(([status, c]) => (
              <li key={status} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "var(--r-xs)", background: c.bg, boxShadow: `inset 0 0 0 1px ${c.fg}` }} />
                {HEALTH_STATUS[status as HealthStatus]?.label ? tr(HEALTH_STATUS[status as HealthStatus].label) : status}
              </li>
            ))}
            <li style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "var(--r-xs)", border: "1px dashed var(--border-field)" }} />
              {tr("Empty")}
            </li>
            <li style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "var(--r-xs)", border: "2px solid var(--warn)" }} />
              {tr("Khóa y tế")}
            </li>
            <li style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "var(--r-xs)", border: "2px solid var(--danger)" }} />
              {tr("Lưu giữ do nợ phí")}
            </li>
          </ul>

          <div className={styles.mapLayout}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>{tr("Loading stable map…")}</div>
              ) : stalls.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", border: "2px dashed var(--border)", borderRadius: "var(--r-lg)" }}>
                  {tr("This zone has no stalls yet.")}
                </div>
              ) : view === "grid" && zone ? (
                <ZoneGrid
                  zone={zone}
                  stalls={stalls}
                  renderCell={(s) => (
                    <GridCell code={s.code} look={lookOf(s)} selected={s.id === selectedId} onClick={() => setSelectedId(s.id)} />
                  )}
                />
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {listRows.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "var(--r)",
                        border: "1px solid var(--border)",
                        background: s.id === selectedId ? "var(--surface-2)" : "var(--surface)",
                        cursor: "pointer",
                      }}
                    >
                      <strong>{s.code}</strong>
                      <span>{s.allocations[0]?.horse.name ?? (s.status === "MAINTENANCE" ? tr("Maintenance") : s.status === "INACTIVE" ? tr("Inactive") : tr("Empty"))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && renderPanel(selected)}
          </div>
        </>
      )}

      {selected && statusChange && (
        <ConfirmModal
          title={`${tr("Stall")} ${selected.code} · ${tr(statusChange.label)}`}
          tone="warn"
          busy={statusBusy}
          confirmLabel={tr("Confirm")}
          cancelLabel={tr("Cancel")}
          onConfirm={() => void applyStatus()}
          onCancel={() => setStatusChange(null)}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0, color: "var(--text-2)" }}>
              {statusChange.value === "AVAILABLE"
                ? tr("The stall can receive horses again after this change.")
                : tr("The stall will not receive horses until it is set back to active.")}
            </p>
            <Field label={statusChange.value === "AVAILABLE" ? "Note" : "Reason and expected completion"} required={statusChange.value !== "AVAILABLE"}>
              <Textarea
                rows={3}
                maxLength={500}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder={statusChange.value === "AVAILABLE" ? undefined : tr("E.g. Replace bedding and water valve, expected to finish 10/11.")}
              />
            </Field>
            {statusError && <Alert tone="danger">{statusError}</Alert>}
          </div>
        </ConfirmModal>
      )}
      {dialog === "assign" && selected && (
        <AssignStallDialog stall={selected} onClose={() => closeDialog(false)} onDone={() => closeDialog(true)} />
      )}
      {dialog === "transfer" && selected && allocationOf(selected) && (
        <TransferStallDialog
          allocation={allocationOf(selected)!}
          onClose={() => closeDialog(false)}
          onDone={() => closeDialog(true)}
        />
      )}
      {dialog === "return" && selected && allocationOf(selected) && (
        <ReturnStallDialog
          allocation={allocationOf(selected)!}
          onClose={() => closeDialog(false)}
          onDone={() => closeDialog(true)}
        />
      )}
      {zoneModalOpen && (
        <ZoneDialog
          onClose={() => setZoneModalOpen(false)}
          onSaved={(newZone) => {
            setZoneModalOpen(false);
            setZoneId(newZone.id);
            loadZones();
          }}
        />
      )}
      {stallModalOpen && (
        <StallDialog
          zone={zone}
          zones={zones ?? []}
          onClose={() => setStallModalOpen(false)}
          onSaved={() => {
            setStallModalOpen(false);
            loadStalls();
            loadZones();
          }}
        />
      )}
    </div>
  );
}
