import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Badge } from "@/shared/components/ui/Badge";
import { Card } from "@/shared/components/ui/Card";
import { DataTable, type Column } from "@/shared/components/ui/DataTable";
import { HealthBadge } from "@/shared/components/ui/HealthBadge";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Input } from "@/shared/components/form/Input";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { formatDate } from "@/shared/lib/format";
import type { HealthStatus } from "@/shared/types/enums";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { healthApi } from "../api";
import { TrainingLockModal } from "../components/TrainingLockModal";
import type { TrainingLockHistoryItem } from "../types";
import { getHorses } from "@/features/horses/api";
import { HEALTH_STATUS } from "@/shared/lib/status";

import { tr } from "@/shared/i18n/tr";
export default function TrainingLockPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isVet = user?.role === "VETERINARIAN";
  const [searchParams] = useSearchParams();
  const urlHorseId = searchParams.get("horseId");
  const urlAction = searchParams.get("action");

  const [activeTab, setActiveTab] = useState<string>("ACTIVE");
  const [locks, setLocks] = useState<TrainingLockHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedLock, setSelectedLock] = useState<TrainingLockHistoryItem | null>(null);
  const [modalMode, setModalMode] = useState<"place" | "extend" | "lift" | null>(null);

  const [horses, setHorses] = useState<any[]>([]);

  useEffect(() => {
    if (urlAction === "place" && isVet) {
      setModalMode("place");
    }
  }, [urlAction, isVet]);

  useEffect(() => {
    getHorses({ limit: 100 }).then((res) => setHorses(res.items || []));
  }, []);

  const loadLocks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await healthApi.getLocks();
      setLocks(Array.isArray(data) ? data : []);
    } catch {
      toast.show("Failed to load training locks", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadLocks();
  }, [loadLocks]);

  useEffect(() => {
    const handleSync = () => {
      void loadLocks();
    };
    window.addEventListener("horsesUpdated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("horsesUpdated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [loadLocks]);

  const safeLocks = Array.isArray(locks) ? locks : [];

  const filteredLocks = safeLocks.filter((item) => {
    const matchesTab = activeTab === "ALL" ? true : item.status === activeTab;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.horseId?.toLowerCase().includes(q) ||
      (item.horseName && item.horseName.toLowerCase().includes(q)) ||
      (item.lockReason && item.lockReason.toLowerCase().includes(q)) ||
      (item.lockCode && item.lockCode.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  const counts = {
    ACTIVE: safeLocks.filter((l) => l.status === "ACTIVE").length,
    RELEASED: safeLocks.filter((l) => l.status === "RELEASED").length,
    ALL: safeLocks.length,
  };

  const columns: Column<TrainingLockHistoryItem>[] = [
    {
      key: "code",
      header: "Lock code",
      render: (lock) => (
        <span className="num nowrap" style={{ fontWeight: 600 }}>
          {lock.lockCode}
        </span>
      ),
    },
    {
      key: "horse",
      header: tr("Horse"),
      render: (lock) => (
        <div style={{ display: "grid" }}>
          <Link to={`/medical/horses/${lock.horseId}`} className="nowrap" style={{ fontWeight: 600, color: "var(--text)" }}>
            {lock.horseName || lock.horseId}
          </Link>
          <span className="num nowrap" style={{ fontSize: "var(--fs-caption)", lineHeight: "18px", color: "var(--muted)" }}>
            {lock.horseCode || lock.horseId}
          </span>
        </div>
      ),
    },
    {
      key: "applied",
      header: tr("Applied status"),
      render: (lock) =>
        lock.appliedMedicalStatus in HEALTH_STATUS ? (
          <HealthBadge status={lock.appliedMedicalStatus as HealthStatus} />
        ) : (
          <Badge tone="danger">{lock.appliedMedicalStatus}</Badge>
        ),
    },
    {
      key: "reason",
      header: tr("Reason"),
      width: "26%",
      render: (lock) => (
        <div style={{ display: "grid", minWidth: 0, maxWidth: 320 }}>
          <span title={lock.lockReason} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lock.lockReason}
          </span>
          <span className="nowrap" style={{ fontSize: "var(--fs-caption)", lineHeight: "18px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tr("Vet:")} {lock.lockedBy}
          </span>
        </div>
      ),
    },
    { key: "locked", header: tr("Locked"), hideOnNarrow: true, render: (lock) => <span className="num nowrap">{formatDate(lock.lockedAt)}</span> },
    { key: "review", header: tr("Review by"), render: (lock) => <span className="num nowrap">{formatDate(lock.reviewDate)}</span> },
    {
      key: "status",
      header: tr("Status"),
      render: (lock) =>
        lock.status === "ACTIVE" ? (
          <Badge tone="danger" icon="lock">
            {tr("Active")}
          </Badge>
        ) : (
          <Badge tone="neutral" icon="unlock">
            {tr("Released")}
          </Badge>
        ),
    },
    ...(isVet
      ? [
        {
          key: "actions",
          header: "",
          align: "right" as const,
          render: (lock: TrainingLockHistoryItem) =>
            lock.status === "ACTIVE" ? (
              <div style={{ display: "inline-flex", gap: 8 }}>
                <Button
                  tone="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedLock(lock);
                    setModalMode("extend");
                  }}
                >
                  {tr("Extend")}
                </Button>
                <Button
                  tone="secondary"
                  size="sm"
                  icon="unlock"
                  data-testid="training-lock-lift-btn"
                  onClick={() => {
                    setSelectedLock(lock);
                    setModalMode("lift");
                  }}
                >
                  {tr("Lift lock")}
                </Button>
              </div>
            ) : (
              <span className="nowrap" style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>
                {tr("Released")}{" "}{lock.releasedAt ? formatDate(lock.releasedAt) : ""} · {lock.releaseReason || tr("Recovered")}
              </span>
            ),
        },
      ]
      : []),
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title={tr("Training Locks")}
        description={tr("Heavy workouts and trial runs are blocked while a horse has an active medical lock.")}
        action={
          isVet && (
            <Button
              icon="lock"
              onClick={() => {
                setSelectedLock(null);
                setModalMode("place");
              }}
            >
              {tr("Place Training Lock")}
            </Button>
          )
        }
      />

      <Card pad={0}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "0 20px", borderBottom: "1px solid var(--border)" }}>
          <Tabs
            label={tr("Filter by lock status")}
            items={[
              { id: "ACTIVE", label: tr("Active"), count: counts.ACTIVE },
              { id: "RELEASED", label: tr("Released"), count: counts.RELEASED },
              { id: "ALL", label: tr("All"), count: counts.ALL },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
          <div style={{ width: 300, padding: "8px 0" }}>
            <Input
              icon="search"
              aria-label={tr("Search locks")}
              placeholder={tr("Lock code, horse or reason")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <DataTable
          caption={tr("Training locks")}
          columns={columns}
          rows={filteredLocks}
          rowKey={(lock) => lock.id || lock.lockCode}
          loading={loading}
          empty={
            <EmptyState
              icon="lock"
              title={search ? "No locks match this search" : activeTab === "ACTIVE" ? "No active Training Locks" : "No Training Locks yet"}
              description={
                search
                  ? "Try a lock code, a horse name or part of the reason."
                  : "When the Veterinarian places a lock on an injured horse, it appears here."
              }
            />
          }
        />
      </Card>

      {/* Lock Modals */}
      {modalMode && (() => {
        const activeLockHorseIds = new Set(
          safeLocks.filter((l) => l.status === "ACTIVE").map((l) => l.horseId),
        );
        const eligibleHorsesForLock = horses.filter(
          (h) => !h.isMedicalLocked && !activeLockHorseIds.has(h.id) && h.status !== "RETIRED",
        );
        const targetHorseFromUrl = urlHorseId ? horses.find((h) => h.id === urlHorseId) : undefined;
        const defaultHorse = targetHorseFromUrl || eligibleHorsesForLock.find((h) => h.id === urlHorseId) || eligibleHorsesForLock[0];
        const effectiveHorseId = selectedLock?.horseId || urlHorseId || defaultHorse?.id || "";

        return (
          <TrainingLockModal
            key={`${modalMode}-${effectiveHorseId}-${horses.length}`}
            horseName={
              selectedLock
                ? selectedLock.horseName
                  ? `${selectedLock.horseName} (${selectedLock.horseCode || selectedLock.horseId})`
                  : selectedLock.horseId
                : defaultHorse
                  ? `${defaultHorse.name} (${defaultHorse.horseCode || defaultHorse.microchipRfid || ""})`
                  : "Horse"
            }
            horseId={effectiveHorseId}
            horseOptions={eligibleHorsesForLock.map((h) => ({
              value: h.id,
              label: `${h.name} (${h.horseCode || h.microchipRfid || ""}) - ${h.status || ""}`,
            }))}
            currentReviewDate={selectedLock?.reviewDate}
            mode={modalMode}
            onClose={() => {
              setModalMode(null);
              setSelectedLock(null);
            }}
            onPlaceLock={async (dto) => {
              const targetHorseId = dto.horseId || effectiveHorseId;
              if (!targetHorseId) {
                toast.show(tr("No eligible horses available to place a training lock."), "danger");
                return;
              }
              const targetHorse = horses.find((h) => h.id === targetHorseId);
              const horseLabel = targetHorse?.name || tr("Horse");

              await healthApi.applyTrainingLock(targetHorseId, {
                appliedMedicalStatus: dto.appliedStatus,
                lockReason: dto.reason,
                reviewDate: dto.reviewDate,
                unlockConditions: dto.unlockConditions,
              });
              toast.show(tr("Training lock placed for {{horse}}", { horse: horseLabel }), "danger");
              setModalMode(null);
              setSelectedLock(null);
              void loadLocks();
            }}
            onLiftLock={async (dto) => {
              if (!selectedLock) return;
              await healthApi.releaseTrainingLock(selectedLock.id, {
                targetStatus: dto.restoreStatus,
                releaseReason: dto.reason,
                horseId: selectedLock.horseId,
              });
              toast.show(
                tr("Training lock lifted successfully. Horse status: {{status}}", {
                  status: HEALTH_STATUS[dto.restoreStatus as keyof typeof HEALTH_STATUS]?.label
                    ? tr(HEALTH_STATUS[dto.restoreStatus as keyof typeof HEALTH_STATUS].label)
                    : dto.restoreStatus,
                }),
                "ok",
              );
              setModalMode(null);
              setSelectedLock(null);
              void loadLocks();
            }}
            onExtendLock={async (dto) => {
              if (!selectedLock) return;
              await healthApi.extendTrainingLock(selectedLock.id, {
                newReviewDate: dto.newReviewDate,
                reason: dto.reason,
                horseId: selectedLock.horseId,
              });
              toast.show(tr("Training lock review date extended to {{date}}", { date: dto.newReviewDate }), "ok");
              setModalMode(null);
              setSelectedLock(null);
              void loadLocks();
            }}
          />
        );
      })()}
    </div>
  );
}
