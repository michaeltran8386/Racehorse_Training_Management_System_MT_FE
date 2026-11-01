import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./StallCatalogPage.module.css";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Modal } from "@/shared/components/ui/Modal";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { DataTable } from "@/shared/components/ui/DataTable";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { useToast } from "@/shared/components/ui/Toast";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { messageFor } from "@/shared/lib/messages";
import {
  createStall,
  createZone,
  getStalls,
  getZones,
  setStallStatus,
  setZoneActive,
  updateStall,
  updateZone,
} from "../api";
import type { SettableStallStatus, Stall, Zone } from "../types";

import { tr } from "@/shared/i18n/tr";
const STATUS_BADGE: Record<string, { label: string; tone: "ok" | "warn" | "neutral" }> = {
  AVAILABLE: { label: "Active", tone: "ok" },
  OCCUPIED: { label: "Active", tone: "ok" },
  MAINTENANCE: { label: "Maintenance", tone: "warn" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
};

const STATUS_OPTIONS: Array<{ value: SettableStallStatus; label: string }> = [
  { value: "AVAILABLE", label: "Active" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "INACTIVE", label: "Inactive" },
];

function confirmDiscard(dirty: boolean) {
  return !dirty || window.confirm("Discard the changes you entered?");
}

/** DL-1.14 Thêm / Sửa khu chuồng. */
function ZoneDialog({ zone, onClose, onSaved }: { zone?: Zone; onClose: () => void; onSaved: (z: Zone) => void }) {
  const toast = useToast();
  const [code, setCode] = useState(zone?.code ?? "");
  const [name, setName] = useState(zone?.name ?? "");
  const [rows, setRows] = useState(String(zone?.rows ?? 1));
  const [cols, setCols] = useState(String(zone?.cols ?? 1));
  const [description, setDescription] = useState(zone?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(zone?.sortOrder ?? 0));
  const [autoCreate, setAutoCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const errors = {
    code: zone || /^[A-Z0-9-]{1,20}$/.test(code) ? "" : "Zone code: upper-case letters, digits and hyphens, at most 20 characters.",
    name: name.trim().length >= 2 && name.trim().length <= 100 ? "" : "Zone name must be 2 to 100 characters.",
    rows: Number(rows) >= 1 && Number(rows) <= 30 && Number.isInteger(Number(rows)) ? "" : "Rows must be between 1 and 30.",
    cols: Number(cols) >= 1 && Number(cols) <= 30 && Number.isInteger(Number(cols)) ? "" : "Columns must be between 1 and 30.",
    description: description.length <= 500 ? "" : "Description can be at most 500 characters.",
    sortOrder: Number(sortOrder) >= 0 && Number(sortOrder) <= 9999 ? "" : "Display order must be between 0 and 9999.",
  };
  const valid = Object.values(errors).every((e) => !e);
  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };

  async function save() {
    setBusy(true);
    setError("");
    const body = {
      name: name.trim(),
      rows: Number(rows),
      cols: Number(cols),
      description: description.trim() || undefined,
      sortOrder: Number(sortOrder),
    };
    try {
      const saved = zone ? await updateZone(zone.id, body) : await createZone({ ...body, code, autoCreateStalls: autoCreate });
      toast.show("Saved.", "ok");
      onSaved(saved);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const close = () => confirmDiscard(dirty) && onClose();
  return (
    <Modal
      title={zone ? tr(`Edit zone ${zone.code}`) : tr("Add barn zone")}
      width={560}
      onClose={close}
      foot={
        <>
          <Button tone="secondary" onClick={close}>Cancel</Button>
          <Button disabled={!valid || busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {error && <Alert tone="danger" title={error} />}
        <Field label={tr("Zone code")} required error={dirty ? errors.code : undefined} hint={zone ? tr("The code cannot change.") : undefined}>
          <Input value={code} disabled={!!zone} onChange={(e) => touch(setCode)(e.target.value.toUpperCase())} />
        </Field>
        <Field label={tr("Zone name")} required error={dirty ? errors.name : undefined}>
          <Input value={name} onChange={(e) => touch(setName)(e.target.value)} />
        </Field>
        <div className={styles.formGrid}>
          <Field label={tr("Rows")} required error={errors.rows || undefined}>
            <Input type="number" min={1} max={30} value={rows} onChange={(e) => touch(setRows)(e.target.value)} />
          </Field>
          <Field label={tr("Columns")} required error={errors.cols || undefined}>
            <Input type="number" min={1} max={30} value={cols} onChange={(e) => touch(setCols)(e.target.value)} />
          </Field>
        </div>
        {!zone && (
          <Checkbox
            checked={autoCreate}
            onChange={touch(setAutoCreate)}
            label={tr(`Create a stall for every grid position (${code || "CODE"}-01 …)`)}
          />
        )}
        <Field label={tr("Description")} error={errors.description || undefined}>
          <Textarea rows={2} value={description} onChange={(e) => touch(setDescription)(e.target.value)} />
        </Field>
        <Field label={tr("Display order")} required error={errors.sortOrder || undefined}>
          <Input type="number" min={0} max={9999} value={sortOrder} onChange={(e) => touch(setSortOrder)(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** DL-1.15 Thêm / Sửa ô chuồng. */
function StallDialog({
  zone,
  stall,
  onClose,
  onSaved,
}: {
  zone: Zone;
  stall?: Stall;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [code, setCode] = useState(stall?.code ?? `${zone.code}-`);
  const [row, setRow] = useState(String(stall?.row ?? 1));
  const [col, setCol] = useState(String(stall?.col ?? 1));
  const [status, setStatus] = useState<SettableStallStatus>(
    stall && stall.status !== "OCCUPIED" ? (stall.status as SettableStallStatus) : "AVAILABLE",
  );
  const [notes, setNotes] = useState(stall?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const occupied = !!stall?.allocations.length;

  const errors = {
    code: /^[A-Z0-9-]{2,20}$/.test(code) ? "" : "Stall code: 2 to 20 upper-case letters, digits or hyphens.",
    row: Number(row) >= 1 && Number(row) <= zone.rows ? "" : `Row must be between 1 and ${zone.rows}.`,
    col: Number(col) >= 1 && Number(col) <= zone.cols ? "" : `Column must be between 1 and ${zone.cols}.`,
    notes: notes.length <= 500 ? "" : "Notes can be at most 500 characters.",
  };
  const valid = Object.values(errors).every((e) => !e);
  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };

  async function save() {
    setBusy(true);
    setError("");
    const body = { code, row: Number(row), col: Number(col), status, notes: notes.trim() || undefined };
    try {
      if (stall) await updateStall(stall.id, body);
      else await createStall({ ...body, zoneId: zone.id });
      toast.show("Saved.", "ok");
      onSaved();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const close = () => confirmDiscard(dirty) && onClose();
  return (
    <Modal
      title={stall ? tr(`Edit stall ${stall.code}`) : tr("Add stall")}
      subtitle={tr(`Zone: ${zone.name}`)}
      width={560}
      onClose={close}
      foot={
        <>
          <Button tone="secondary" onClick={close}>Cancel</Button>
          <Button disabled={!valid || busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {error && <Alert tone="danger" title={error} />}
        <Field label={tr("Stall code")} required error={dirty ? errors.code : undefined}>
          <Input value={code} onChange={(e) => touch(setCode)(e.target.value.toUpperCase())} />
        </Field>
        <div className={styles.formGrid}>
          <Field label={tr("Row")} required error={errors.row || undefined}>
            <Input type="number" min={1} max={zone.rows} value={row} onChange={(e) => touch(setRow)(e.target.value)} />
          </Field>
          <Field label={tr("Column")} required error={errors.col || undefined}>
            <Input type="number" min={1} max={zone.cols} value={col} onChange={(e) => touch(setCol)(e.target.value)} />
          </Field>
        </div>
        <Field label={tr("Status")} required hint={occupied ? tr("A stall with a horse can only be Active.") : undefined}>
          <Select
            value={status}
            disabled={occupied}
            onChange={(e) => touch(setStatus)(e.target.value as SettableStallStatus)}
            options={STATUS_OPTIONS}
          />
        </Field>
        <Field label={tr("Notes")} error={errors.notes || undefined}>
          <Textarea rows={3} value={notes} onChange={(e) => touch(setNotes)(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** SC-1.07 Danh mục Khu chuồng & Ô chuồng: CM toàn quyền; HT, VET, GROOM chỉ xem. Không có xóa ô (Q-1.C). */
export default function StallCatalogPage() {
  useScreenTranslation();
  const user = useCurrentUser();
  const isManager = user.role === "CLUB_MANAGER";
  const toast = useToast();

  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [occupancy, setOccupancy] = useState("ALL");
  const [zoneDialog, setZoneDialog] = useState<"add" | "edit" | null>(null);
  const [stallDialog, setStallDialog] = useState<{ stall?: Stall } | null>(null);
  const [statusChange, setStatusChange] = useState<{ stall: Stall; status: SettableStallStatus } | null>(null);
  const [zoneToggle, setZoneToggle] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadZones = useCallback(async () => {
    try {
      const list = await getZones(true);
      setZones(list);
      setZoneId((cur) => (list.some((z) => z.id === cur) ? cur : (list[0]?.id ?? "")));
      if (list.length === 0) setLoading(false);
    } catch (err) {
      setError(messageFor(err));
      setLoading(false);
    }
  }, []);

  const loadStalls = useCallback(async () => {
    if (!zoneId) return;
    setLoading(true);
    try {
      setStalls(await getStalls({ zoneId, includeInactive: true }));
      setError("");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);
  useEffect(() => {
    void loadStalls();
  }, [loadStalls]);

  const zone = zones.find((z) => z.id === zoneId);
  const rows = useMemo(
    () =>
      stalls.filter((s) => {
        const statusOk =
          statusFilter === "ALL" ||
          (statusFilter === "AVAILABLE" ? s.status === "AVAILABLE" || s.status === "OCCUPIED" : s.status === statusFilter);
        const occOk = occupancy === "ALL" || (occupancy === "OCCUPIED" ? s.allocations.length > 0 : s.allocations.length === 0);
        return statusOk && occOk;
      }),
    [stalls, statusFilter, occupancy],
  );

  async function applyStatus() {
    if (!statusChange) return;
    setBusy(true);
    try {
      await setStallStatus(statusChange.stall.id, statusChange.status);
      toast.show(`Stall ${statusChange.stall.code} status updated.`, "ok");
      setStatusChange(null);
      void loadStalls();
      void loadZones();
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setBusy(false);
    }
  }

  async function toggleZone() {
    if (!zone) return;
    setBusy(true);
    try {
      await setZoneActive(zone.id, !zone.isActive);
      toast.show(zone.isActive ? `Zone ${zone.name} deactivated.` : `Zone ${zone.name} reactivated.`, "ok");
      setZoneToggle(false);
      void loadZones();
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setBusy(false);
    }
  }

  const occupiedInZone = stalls.filter((s) => s.allocations.length > 0).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PageHeader
        title={tr("Barn zones & stalls")}
        action={isManager && <Button icon="plus" onClick={() => setZoneDialog("add")}>Add zone</Button>}
      />
      {error && (
        <Alert tone="danger" title={tr("Could not load data.")} action={<Button size="sm" onClick={() => void loadZones()}>Try again</Button>}>
          {error}
        </Alert>
      )}

      {zones.length === 0 && !loading ? (
        <div style={{ padding: 40, textAlign: "center", border: "2px dashed var(--border)", borderRadius: "var(--r-lg)" }}>
          {tr("No barn zones yet.")}{isManager ? tr(" Click Add zone to start.") : ""}
        </div>
      ) : (
        <div className={styles.layout}>
          <div style={{ display: "grid", gap: 8 }}>
            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setZoneId(z.id)}
                aria-pressed={z.id === zoneId}
                className={styles.zoneCard}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "var(--r-lg)",
                  border: `${z.id === zoneId ? 2 : 1}px solid ${z.id === zoneId ? "var(--brand)" : "var(--border)"}`,
                  background: "var(--surface)",
                  cursor: "pointer",
                  opacity: z.isActive ? 1 : 0.6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{z.code}</strong>
                  <Badge tone={z.isActive ? "ok" : "neutral"}>{z.isActive ? tr("In use") : tr("Inactive")}</Badge>
                </div>
                <div style={{ fontSize: "var(--fs-body)" }}>{z.name}</div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
                  {tr("Grid")} {z.rows} × {z.cols} · {tr("{{count}} stalls", { count: z.stallCount ?? 0 })}
                </div>
              </button>
            ))}
          </div>

          {zone && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ width: 170 }}>
                    <Select
                      aria-label={tr("Stall status")}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      options={[{ value: "ALL", label: "All statuses" }, ...STATUS_OPTIONS]}
                    />
                  </div>
                  <div style={{ width: 170 }}>
                    <Select
                      aria-label={tr("Occupancy")}
                      value={occupancy}
                      onChange={(e) => setOccupancy(e.target.value)}
                      options={[
                        { value: "ALL", label: "Occupied or empty" },
                        { value: "OCCUPIED", label: "With a horse" },
                        { value: "EMPTY", label: "Empty" },
                      ]}
                    />
                  </div>
                </div>
                {isManager && (
                  <div className={styles.actions}>
                    <Button tone="secondary" onClick={() => setZoneDialog("edit")}>{tr("Edit zone")}</Button>
                    <Button
                      tone="ghost"
                      blockedReason={
                        zone.isActive && occupiedInZone > 0
                          ? tr(`The zone still houses ${occupiedInZone} horse(s). Move them out first.`)
                          : undefined
                      }
                      onClick={() => setZoneToggle(true)}
                    >
                      {zone.isActive ? tr("Deactivate zone") : tr("Reactivate zone")}
                    </Button>
                    <Button
                      icon="plus"
                      blockedReason={zone.isActive ? undefined : tr("This zone is inactive.")}
                      onClick={() => setStallDialog({})}
                    >
                      {tr("Add stall")}
                    </Button>
                  </div>
                )}
              </div>

              <DataTable
                pageSize={10}
                noun="stalls"
                caption={tr(`Stalls of ${zone.name}`)}
                rowKey={(s: Stall) => s.id}
                loading={loading}
                rows={rows}
                empty={stalls.length === 0 ? "This zone has no stalls yet." : "No stall matches the filters."}
                columns={[
                  { key: "code", header: "Stall code", render: (s: Stall) => <strong>{s.code}</strong> },
                  {
                    key: "pos",
                    header: "Position",
                    render: (s: Stall) => (s.row && s.col ? `Row ${s.row} – Col ${s.col}` : "—"),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (s: Stall) => <Badge tone={STATUS_BADGE[s.status].tone}>{STATUS_BADGE[s.status].label}</Badge>,
                  },
                  {
                    key: "horse",
                    header: "Horse",
                    render: (s: Stall) => s.allocations[0]?.horse.name ?? <span style={{ color: "var(--text-muted)" }}>Empty</span>,
                  },
                  {
                    key: "notes",
                    header: "Notes",
                    render: (s: Stall) => <span className={styles.notes}>{s.notes || "—"}</span>,
                  },
                  ...(isManager
                    ? [
                        {
                          key: "actions",
                          header: "",
                          align: "right" as const,
                          render: (s: Stall) => (
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <Button tone="ghost" size="sm" onClick={() => setStallDialog({ stall: s })}>Edit</Button>
                              <div style={{ width: 140 }}>
                                <Select
                                  aria-label={tr("Change status of {{code}}", { code: s.code })}
                                  value=""
                                  onChange={(e) =>
                                    e.target.value && setStatusChange({ stall: s, status: e.target.value as SettableStallStatus })
                                  }
                                  options={[
                                    { value: "", label: "Change status…" },
                                    ...STATUS_OPTIONS.filter(
                                      (o) => o.value !== (s.status === "OCCUPIED" ? "AVAILABLE" : s.status),
                                    ),
                                  ]}
                                />
                              </div>
                            </div>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          )}
        </div>
      )}

      {zoneDialog && (
        <ZoneDialog
          zone={zoneDialog === "edit" ? zone : undefined}
          onClose={() => setZoneDialog(null)}
          onSaved={(z) => {
            setZoneDialog(null);
            setZoneId(z.id);
            void loadZones();
            void loadStalls();
          }}
        />
      )}
      {stallDialog && zone && (
        <StallDialog
          zone={zone}
          stall={stallDialog.stall}
          onClose={() => setStallDialog(null)}
          onSaved={() => {
            setStallDialog(null);
            void loadStalls();
            void loadZones();
          }}
        />
      )}
      {statusChange && (
        <ConfirmModal
          title={tr(`Change stall ${statusChange.stall.code} to ${STATUS_OPTIONS.find((o) => o.value === statusChange.status)?.label}?`)}
          tone="warn"
          confirmLabel={busy ? tr("Saving…") : tr("Confirm")}
          cancelLabel={tr("Cancel")}
          busy={busy}
          onConfirm={applyStatus}
          onCancel={() => setStatusChange(null)}
        >
          {statusChange.status === "INACTIVE"
            ? tr("An inactive stall is hidden from the stable map and cannot receive a horse. Its history is kept.")
            : statusChange.status === "MAINTENANCE"
              ? tr("A stall under maintenance cannot receive a horse.")
              : tr("The stall can receive a horse again.")}
        </ConfirmModal>
      )}
      {zoneToggle && zone && (
        <ConfirmModal
          title={zone.isActive ? tr(`Deactivate zone ${zone.name}?`) : tr(`Reactivate zone ${zone.name}?`)}
          tone="warn"
          confirmLabel={busy ? tr("Saving…") : tr("Confirm")}
          cancelLabel={tr("Cancel")}
          busy={busy}
          onConfirm={toggleZone}
          onCancel={() => setZoneToggle(false)}
        >
          {zone.isActive
            ? tr("Stalls of an inactive zone cannot receive horses and the zone is hidden from the stable map.")
            : tr("The zone and its active stalls appear on the stable map again.")}
        </ConfirmModal>
      )}
    </div>
  );
}
