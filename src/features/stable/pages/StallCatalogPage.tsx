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
import { STALL_STATUS_OPTIONS as STATUS_OPTIONS } from "../types";
import { StallDialog, ZoneDialog } from "../components/StallZoneModals";
import { tr } from "@/shared/i18n/tr";

const STATUS_BADGE: Record<string, { label: string; tone: "ok" | "warn" | "neutral" }> = {
  AVAILABLE: { label: "Active", tone: "ok" },
  OCCUPIED: { label: "Active", tone: "ok" },
  MAINTENANCE: { label: "Maintenance", tone: "warn" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
};

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
