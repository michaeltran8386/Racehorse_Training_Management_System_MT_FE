import { MedicalLocksPanel } from "@/features/health/components/MedicalLocksPanel";
import { HorseAvatar } from "../components/HorseAvatar";
import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./HorseDetailPage.module.css";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Menu } from "@/shared/components/ui/Menu";
import { useBreadcrumbTail } from "@/shared/components/layout/BreadcrumbContext";
import { Alert } from "@/shared/components/ui/Alert";
import { Tabs } from "@/shared/components/ui/Tabs";
import { HEALTH_STATUS } from "@/shared/lib/status";
import type { HealthStatus } from "@/shared/types/enums";
import { DataTable } from "@/shared/components/ui/DataTable";
import { getHorseById, getHorseHistory } from "../api";
import { RETIRE_REASON_LABEL } from "../types";
import type { Horse, HorseHistoryResponse } from "../types";
import { ChangeStatusDialog } from "../components/ChangeStatusDialog";
import { DeleteHorseModal } from "../components/DeleteHorseModal";
import { RetireHorseModal } from "../components/RetireHorseModal";
import { LifecycleTimeline } from "../components/LifecycleTimeline";
import { Icon } from "@/shared/components/ui/Icon";
import { formatNumber } from "@/shared/lib/format";
import { useToast } from "@/shared/components/ui/Toast";
import { AssignStallDialog, ReturnStallDialog, TransferStallDialog } from "@/features/stable/components/StallDialogs";
import { IncidentDetailModal } from "@/features/stable/components/IncidentDetailModal";
import { incidentsApi } from "@/features/stable/api/incidentsApi";
import type { IncidentReport } from "@/features/stable/types/incidents";
import { messageFor } from "@/shared/lib/messages";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { useAppLanguage } from "@/shared/lib/language";

import { localizeServerText, tr } from "@/shared/i18n/tr";
/** Nguồn đổi trạng thái (Tab 4). */
function historyStatus(status?: string | null) {
  return status ? tr(HEALTH_STATUS[status as HealthStatus]?.label ?? status) : "—";
}

const STATUS_SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  MEDICAL_LOCK: "Training Lock",
  SYSTEM: "System",
  TRAINING_PLAN: "Training plan",
};

export default function HorseDetailPage() {
  useScreenTranslation();
  const { id } = useParams<{ id: string }>();
  const { isVietnamese: isVi } = useAppLanguage();
  const currentUser = useCurrentUser();
  const toast = useToast();
  const [horse, setHorse] = useState<Horse | null>(null);
  const [history, setHistory] = useState<HorseHistoryResponse | null>(null);
  useBreadcrumbTail(horse?.name);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRetireModalOpen, setIsRetireModalOpen] = useState(false);
  const [stallDialog, setStallDialog] = useState<"assign" | "transfer" | "return" | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [assignedTrainer, setAssignedTrainer] = useState<string>(() => {
    return (id && localStorage.getItem(`horse_trainer_${id}`)) || "Nguyễn Văn Tuấn (trainer@gmail.com)";
  });
  const [assignTrainerOpen, setAssignTrainerOpen] = useState(false);
  const [selectedTrainerOption, setSelectedTrainerOption] = useState(assignedTrainer);

  async function openIncident(incidentId: string) {
    if (incidentLoading) return;
    setIncidentLoading(true);
    try {
      setSelectedIncident(await incidentsApi.getById(incidentId));
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setIncidentLoading(false);
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast.show(`Copied ${label}: ${text}`);
      }).catch(() => {
        toast.show(`Copied: ${text}`);
      });
    }
  };

  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([
      getHorseById(id),
      getHorseHistory(id).catch(() => null),
    ])
      .then(([horseData, historyData]) => {
        if (active) {
          setHorse(horseData);
          if (historyData) setHistory(historyData);
        }
      })
      .catch((err) => {
        if (active) setError(localizeServerText(err.message) || tr("Horse record not found or you do not have permission to view."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const refreshHorse = () => {
    if (!id) return;
    Promise.all([
      getHorseById(id),
      getHorseHistory(id).catch(() => null),
    ])
      .then(([horseData, historyData]) => {
        setHorse(horseData);
        if (historyData) setHistory(historyData);
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <PageHeader title={tr("Horse profile")} />
        <Card pad={32}>
          <p style={{ margin: 0, color: "var(--muted)" }} aria-busy="true">{tr("Loading horse profile…")}</p>
        </Card>
      </div>
    );
  }

  if (error || !horse) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <PageHeader title={tr("Horse profile not found")} />
        <Card pad={24}>
          <Alert tone="danger" title={tr("This horse profile could not be opened")}>
            {error || tr("This horse profile does not exist or your account lacks authorization.")}
          </Alert>
          <div style={{ marginTop: "1rem" }}>
            <LinkButton to="/horses" icon="arrowLeft">
              {tr("Back to horses")}
            </LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  const isOwner = currentUser.role === "HORSE_OWNER";
  const isGroom = currentUser.role === "GROOM";
  const isManager = currentUser.role === "CLUB_MANAGER";

  // Calculate age accurately (CL-1.12)
  let ageText = "—";
  if (horse.dob) {
    const birthDate = new Date(horse.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    ageText = isVi ? `${age >= 0 ? age : 0} tuổi` : `${age >= 0 ? age : 0} y/o`;
  }

  // Microchip display masking for grooms
  let displayMicrochip = horse.microchip || horse.microchipRfid || "—";
  if (isGroom && displayMicrochip !== "—" && displayMicrochip.length > 4) {
    displayMicrochip = "*".repeat(displayMicrochip.length - 4) + displayMicrochip.slice(-4);
  }

  const statusCfg = HEALTH_STATUS[horse.status as HealthStatus] || { label: horse.status, tone: "neutral" };
  const canViewMedical =
    currentUser.role === "CLUB_MANAGER" || currentUser.role === "HEAD_TRAINER" || currentUser.role === "VETERINARIAN";
  const canManageStall = currentUser.role === "CLUB_MANAGER"; // chỉ Quản lý CLB xếp/chuyển ô
  const retiredReason = horse.status === "RETIRED" ? "The horse is no longer managed." : undefined;
  // Bỏ tab Chủ sở hữu đối với người chủ ngựa (chỉ Club Manager và Head Trainer quản lý xem)
  const canViewOwner = currentUser.role === "CLUB_MANAGER" || currentUser.role === "HEAD_TRAINER";

  // 6 Tabs according to SC-1.03 (Hide stable tabs for owners, hide owner tab for VET/GROOM per CL-1.07)
  const tabs = [
    { id: "info", label: tr("General Information") },
    ...(!isOwner ? [{ id: "stable", label: tr("Stabling & Care") }] : [{ id: "routine", label: tr("Daily Routine") }]),
    ...(canViewOwner ? [{ id: "owner", label: tr("Ownership & Custody") }] : []),
    { id: "status-history", label: tr("Status History") },
    ...(!isOwner ? [{ id: "stall-history", label: tr("Stall History") }] : []),
    { id: "timeline", label: tr("Lifecycle Timeline") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={horse.name}
        action={
          <>
            <ChangeStatusDialog
              horse={horse}
              onSuccess={(updatedHorse: Horse) => setHorse({ ...horse, status: updatedHorse.status, isMedicalLocked: updatedHorse.isMedicalLocked })}
            />

            {/* C1-04: GROOM, OWNER chưa xem được API y tế (BE trả 403) nên ẩn tới khi Cặp 2 mở quyền xem. */}
            {canViewMedical && (
              <LinkButton to={`/medical/horses/${horse.id}`} icon="file">
                Medical records
              </LinkButton>
            )}

            {isOwner && horse.status !== "RETIRED" && (
              <LinkButton to={`/horses/${horse.id}/edit`} tone="primary" icon="edit">
                Edit profile
              </LinkButton>
            )}

            {/* Hành động ít dùng và hành động phá hủy nằm trong menu "More" (BTN-1.10 → BTN-1.12). */}
            <Menu
              label="More actions"
              trigger="button"
              buttonText="More"
              items={[
                { label: "2D injury map", icon: "bone", to: `/medical/horses/${horse.id}/injuries`, hidden: !canViewMedical },
                { label: "Fitness chart", icon: "chart", to: `/horses/${horse.id}/fitness`, hidden: isOwner },
                {
                  label: "Reactivate",
                  icon: "refresh",
                  onSelect: () => setIsRetireModalOpen(true),
                  hidden: !(isManager && horse.status === "RETIRED"),
                  disabledReason: horse.retireReason === "DECEASED" ? "A deceased horse cannot be reactivated." : undefined,
                },
                {
                  label: "Stop managing…",
                  icon: "archive",
                  danger: true,
                  divider: true,
                  onSelect: () => setIsRetireModalOpen(true),
                  hidden: !(isManager && horse.status !== "RETIRED"),
                },
                {
                  label: "Delete profile",
                  icon: "trash",
                  danger: true,
                  onSelect: () => setIsDeleteModalOpen(true),
                  hidden: !isManager,
                  disabledReason: horse.isMedicalLocked ? "Cannot delete while a Training Lock is in effect." : undefined,
                },
              ]}
            />
          </>
        }
      />

      {canViewMedical && <MedicalLocksPanel horseId={horse.id} horseName={horse.name} refreshKey={String(horse.isMedicalLocked)} />}
      {/* Banner Medical Lock */}
      {horse.isMedicalLocked && (
        <Alert tone="danger" icon="lock" title={tr("Training Lock in effect")}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <div>
              <div>
                {tr("New workouts cannot be scheduled until the Veterinarian lifts the lock.")}
              </div>
              {horse.medicalLocks && horse.medicalLocks[0] && (
                <div style={{ marginTop: "0.5rem", fontSize: "var(--fs-body)", opacity: 0.9 }}>
                  <strong>{tr("Reason:")}</strong> {horse.medicalLocks[0].lockReason} ({tr("placed on {{date}}", { date: formatDateTime(horse.medicalLocks[0].lockedAt) })})
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Banner Debt Impounded */}
      {horse.isDebtImpounded && (
        <Alert tone="danger" title={tr("Debt Impounded")}>
          {horse.debtImpoundReason ? tr(horse.debtImpoundReason) : tr("The horse is impounded for unpaid fees.")}{" "}
          {tr("No races, no transfer or leaving the stable. Only light walking (WALK) is allowed. The impoundment lifts automatically once the overdue invoice is paid.")}
        </Alert>
      )}

      {/* Banner Retired */}
      {horse.status === "RETIRED" && (
        <Alert tone="info" title={tr("No longer managed")}>
          {horse.retireReason ? tr("Reason: {{reason}}. ", { reason: tr(RETIRE_REASON_LABEL[horse.retireReason]) }) : ""}
          {tr("Identity, stall and health history stay available for reference.")}
        </Alert>
      )}

      {/* Athlete Header Card */}
      <Card pad={20}>
        <div className={styles.identity}>
          {/* Athlete Portrait Crest */}
          <div className={styles.crest} aria-hidden="true">
            <HorseAvatar url={horse.avatarUrl} horseCode={horse.horseCode} name={horse.name} size={72} />
          </div>

          {/* Identity & Identifiers */}
          <div className={styles.identityInfo}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <Badge tone={statusCfg.tone} icon={"icon" in statusCfg ? statusCfg.icon : undefined}>
                {statusCfg.label}
              </Badge>
              {horse.isMedicalLocked && (
                <Badge tone="danger" icon="lock">
                  {tr("Training Lock")}
                </Badge>
              )}
              {horse.isDebtImpounded && (
                <Badge tone="danger" icon="alert-circle">
                  {tr("Debt Impounded")}
                </Badge>
              )}
            </div>

            <div className={styles.identityMeta}>
              {[horse.breed && tr(horse.breed), horse.gender && tr(horse.gender), horse.color && tr(horse.color), ageText, horse.weightKg && `${formatNumber(horse.weightKg, 2)} kg`].filter(Boolean).map((item, index) => (
                <span key={index}>{item}</span>
              ))}
            </div>

            {/* Microchip quick-copy pill */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "var(--fs-body)" }}>
                <span style={{ color: "var(--ink-muted)", fontSize: "var(--fs-caption)", fontWeight: 700 }}>{tr("Chip:")}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, background: "var(--surface-subtle)", padding: "1px 6px" }}>
                  {displayMicrochip}
                </span>
                {horse.microchip && !isGroom && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(horse.microchip!, "Microchip")}
                    title={tr("Copy Microchip")}
                    aria-label={tr("Copy Microchip")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--ink-muted)",
                      cursor: "pointer",
                      padding: 2,
                      display: "inline-flex",
                    }}
                  >
                    <Icon name="clipboard" size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Location / Assignment Stats (ẩn với chủ ngựa) */}
          {!isOwner && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              paddingLeft: "1.5rem",
              borderLeft: "1px solid var(--border-subtle)",
              fontSize: "var(--fs-body)",
              minWidth: 160,
            }}
          >
            <div style={{ color: "var(--ink-muted)", fontSize: "var(--fs-caption)", fontWeight: 700 }}>
              {tr("Location & Care")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 600, color: "var(--brand-700)" }}>
              <Icon name="home" size={13} />
              <span>{horse.stallCode ? tr("Stall {{stall}}", { stall: horse.stallCode }) : tr("Unassigned Stall")}</span>
            </div>
            <div style={{ color: "var(--ink-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icon name="user" size={13} />
              <span>{horse.primaryGroom || tr("No Groom Assigned")}</span>
            </div>
            <div style={{ color: "var(--ink-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Icon name="award" size={13} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                {assignedTrainer ? `${isVi ? "HLV" : "Trainer"}: ${assignedTrainer.split("(")[0].trim()}` : (isVi ? "Chưa có HLV" : "No Trainer")}
              </span>
            </div>
            {isManager && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTrainerOption(assignedTrainer);
                  setAssignTrainerOpen(true);
                }}
                style={{
                  marginTop: "2px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#2563eb",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {isVi ? "Phân công HLV" : "Assign Trainer"}
              </button>
            )}
          </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        items={tabs}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: General Info */}
      {activeTab === "info" && (
        <Card pad={24}>
          <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "var(--fs-section)", fontWeight: 700 }}>
            {tr("Identity")}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: "1.25rem",
              fontSize: "var(--fs-body)",
            }}
          >
            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Horse Code (ID)")}</div>
              <div style={{ fontWeight: 600 }}>{horse.horseCode || horse.id}</div>
            </div>

            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Registered Name")}</div>
              <div style={{ fontWeight: 600 }}>{horse.name}</div>
            </div>

            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Microchip Number (15 digits)")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{displayMicrochip}</span>
                {horse.microchip && !isGroom && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(horse.microchip!, "Microchip")}
                    title={tr("Copy Microchip")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--ink-muted)",
                      cursor: "pointer",
                      padding: 2,
                      display: "inline-flex",
                    }}
                  >
                    <Icon name="clipboard" size={13} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Breed")}</div>
              <div style={{ fontWeight: 600 }}>{horse.breed ? tr(horse.breed) : "—"}</div>
            </div>

            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Date of Birth / Age")}</div>
              <div style={{ fontWeight: 600 }}>
                {horse.dob ? formatDate(horse.dob) : "—"} ({ageText})
              </div>
            </div>

            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Gender")}</div>
              <div style={{ fontWeight: 600 }}>{horse.gender ? tr(horse.gender) : "—"}</div>
            </div>

            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Coat Color")}</div>
              <div style={{ fontWeight: 600 }}>{horse.color ? tr(horse.color) : "—"}</div>
            </div>

            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Weight")}</div>
              <div style={{ fontWeight: 600 }}>{horse.weightKg ? `${formatNumber(horse.weightKg, 2)} kg` : "—"}</div>
            </div>

            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Operational Status")}</div>
              <div>
                <Badge tone={statusCfg.tone}>{statusCfg.label}</Badge>
              </div>
            </div>

            <div>
              <div style={{ color: "var(--ink-muted)", marginBottom: 4 }}>{tr("Registration Date")}</div>
              <div style={{ fontWeight: 600 }}>
                {horse.createdAt ? formatDateTime(horse.createdAt) : "—"}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Stable & Care */}
      {activeTab === "stable" && !isOwner && (
        <Card pad={24}>
          <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "var(--fs-section)", fontWeight: 700 }}>
            {tr("Stabling & Assigned Caretakers")}
          </h3>
          <div className={styles.detailsGrid}>
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
              <h4 style={{ margin: "0 0 0.75rem 0" }}>{tr("Current Stall Assignment")}</h4>
              <p style={{ margin: "0 0 0.5rem 0" }}>
                <strong>{tr("Stall Code:")}</strong> {horse.stallCode || tr("No stall")}
              </p>
              <p style={{ margin: "0 0 0.5rem 0" }}>
                <strong>{tr("Barn Zone:")}</strong> {horse.zone || tr("Unassigned")}
              </p>
              {horse.stallSince && (
                <p style={{ margin: 0 }}>
                  <strong>{tr("Since:")}</strong> {formatDate(horse.stallSince)}
                </p>
              )}
              {canManageStall && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {horse.allocationId ? (
                    <>
                      <Button size="sm" tone="secondary" blockedReason={retiredReason} onClick={() => setStallDialog("transfer")}>
                        {tr("Move stall")}
                      </Button>
                      <Button size="sm" tone="ghost" blockedReason={retiredReason} onClick={() => setStallDialog("return")}>
                        {tr("Release stall")}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" blockedReason={retiredReason} onClick={() => setStallDialog("assign")}>
                      {tr("Assign stall")}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 16 }}>
              <h4 style={{ margin: "0 0 0.75rem 0" }}>{tr("Assigned Groom Hand")}</h4>
              <p style={{ margin: 0 }}>
                <strong>{tr("Primary Groom:")}</strong> {horse.primaryGroom || tr("Unassigned Groom")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2 Routine (for owner or routine tab) */}
      {(activeTab === "routine" || (activeTab === "stable" && isOwner)) && (
        <Card pad={24}>
          <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "var(--fs-section)", fontWeight: 700 }}>
            {tr("Daily Routine Schedule")}
          </h3>
          <p style={{ color: "var(--ink-muted)" }}>
            {tr("Standard Stable Routine: Feed rations (06:00, 11:30, 17:00), Stall mucking & turnout (07:00), Training conditioning (08:00 - 10:00), Hydrotherapy & cryo leg hosing (10:30).")}
          </p>
        </Card>
      )}

      {/* Tab 3: Ownership */}
      {activeTab === "owner" && (
        <Card pad={24}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "var(--fs-section)", fontWeight: 700 }}>
              {tr("Ownership & Custody Details")}
            </h3>
          </div>
          {horse.owner ? (
            <div className={styles.detailsGrid}>
              <div>
                <strong>{tr("Horse Owner:")}</strong> {horse.owner.fullName}
              </div>
              <div>
                <strong>{tr("Email Contact:")}</strong> {horse.owner.email}
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--ink-muted)" }}>
              {horse.ownerName ? tr(`Registered Owner: ${horse.ownerName}`) : tr("No registered horse owner associated.")}
            </p>
          )}
        </Card>
      )}

      {/* Tab 4: Status History */}
      {activeTab === "status-history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {!!history?.simulatorIncidents?.length && (
            <Card pad={24}>
              <h3 className={styles.incidentHeading}>{isVi ? "Sự cố từ mô phỏng" : "Simulator incidents"}</h3>
              <DataTable
                caption={isVi ? "Sự cố từ mô phỏng" : "Simulator incidents"}
                rowKey={(incident) => incident.id}
                rows={history.simulatorIncidents}
                columns={[
                  { key: "timestamp", header: tr("Timestamp"), render: (incident) => formatDateTime(incident.createdAt) },
                  { key: "incident", header: tr("Description"), render: (incident) => (
                    <div className={styles.incidentDescription}>
                      {incident.incidentNumber && <strong>{incident.incidentNumber}</strong>}
                      <div>{incident.description}</div>
                    </div>
                  ) },
                  { key: "severity", header: tr("Severity"), render: (incident) => (
                    <Badge tone={incident.severity === "CRITICAL" ? "danger" : incident.severity === "MODERATE" ? "warn" : "ok"}>
                      {tr({ MILD: "Mild", MODERATE: "Moderate", CRITICAL: "Critical" }[incident.severity])}
                    </Badge>
                  ) },
                  { key: "status", header: tr("Status"), render: (incident) => tr({
                    REPORTED: "Reported", UNDER_REVIEW: "Under Review", RESOLVED: "Resolved", DISMISSED: "Dismissed",
                  }[incident.status]) },
                  ...(currentUser.role === "HORSE_OWNER" ? [] : [{
                    key: "action", header: "", render: (incident: NonNullable<HorseHistoryResponse["simulatorIncidents"]>[number]) => (
                      <Button tone="secondary" size="sm" disabled={incidentLoading} onClick={() => void openIncident(incident.id)}>
                        {tr("Incident Details")}
                      </Button>
                    ),
                  }]),
                ]}
              />
            </Card>
          )}
          {selectedIncident && (
            <IncidentDetailModal
              incident={selectedIncident}
              onClose={() => setSelectedIncident(null)}
              onUpdated={() => { setSelectedIncident(null); refreshHorse(); }}
            />
          )}
          <Card pad={24}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "var(--fs-section)", fontWeight: 700 }}>
                {tr("Status Transition History")}
              </h3>
              <div>
                {tr("Current Status:")}{" "}<Badge tone={statusCfg.tone}>{statusCfg.label}</Badge>
              </div>
            </div>
            {history?.statusHistory && history.statusHistory.length > 0 ? (
              <DataTable
                caption={tr("Horse status transitions")}
                rowKey={(r) => r.id}
                rows={history.statusHistory}
                columns={[
                  {
                    key: "timestamp",
                    header: "Timestamp",
                    render: (r) => formatDateTime(r.timestamp),
                  },
                  {
                    key: "source",
                    header: "Source",
                    render: (r) => tr(STATUS_SOURCE_LABEL[r.source ?? "MANUAL"] ?? r.source ?? ""),
                  },
                  {
                    key: "transition",
                    header: "Transition",
                    render: (r) => (
                      <span>
                        {historyStatus(r.oldStatus)} → <Badge tone="info">{historyStatus(r.newStatus)}</Badge>
                      </span>
                    ),
                  },
                  {
                    key: "changedBy",
                    header: "Changed By",
                    render: (r) => r.changedBy || tr("System"),
                  },
                  {
                    key: "notes",
                    header: "Notes / Reason",
                    render: (r) => r.notes || "—",
                  },
                ]}
              />
            ) : (
              <p style={{ color: "var(--ink-muted)", margin: 0 }}>
                {tr("No recorded status transitions yet. Current status:")}{" "}<Badge tone={statusCfg.tone}>{statusCfg.label}</Badge>
              </p>
            )}
          </Card>

          {history?.ownershipHistory && history.ownershipHistory.length > 0 && (
            <Card pad={24}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "var(--fs-section)", fontWeight: 700 }}>
                {tr("Ownership Transfer History")}
              </h3>
              <DataTable
                caption={tr("Ownership transfers")}
                rowKey={(r) => r.id}
                rows={history.ownershipHistory}
                columns={[
                  {
                    key: "timestamp",
                    header: "Date",
                    render: (r) => formatDate(r.timestamp),
                  },
                  {
                    key: "previousOwner",
                    header: "Previous Owner",
                    render: (r) => r.previousOwner,
                  },
                  {
                    key: "newOwner",
                    header: "New Owner",
                    render: (r) => <strong>{r.newOwner}</strong>,
                  },
                  {
                    key: "transferredBy",
                    header: "Transferred By",
                    render: (r) => r.transferredBy || tr("System"),
                  },
                  {
                    key: "reason",
                    header: "Reason",
                    render: (r) => r.reason || "—",
                  },
                ]}
              />
            </Card>
          )}
        </div>
      )}

      {/* Tab 5: Stall History */}
      {activeTab === "stall-history" && !isOwner && (
        <Card pad={24}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "var(--fs-section)", fontWeight: 700 }}>
              {tr("Stall Allocation History")}
            </h3>
            <div>
              {tr("Active Stall:")}{" "}<strong>{horse.stallCode || tr("No stall")}</strong> ({horse.zone || tr("Unassigned Zone")})
            </div>
          </div>
          {history?.stallHistory && history.stallHistory.length > 0 ? (
            <DataTable
              caption={tr("Stall allocation records")}
              rowKey={(r) => r.id}
              rows={history.stallHistory}
              columns={[
                {
                  key: "stallCode",
                  header: "Stall Code",
                  render: (r) => <strong>{r.stallCode}</strong>,
                },
                {
                  key: "zone",
                  header: "Zone / Barn",
                  render: (r) => r.zone,
                },
                {
                  key: "groomName",
                  header: "Assigned Groom",
                  render: (r) => r.groomName || tr("Unassigned"),
                },
                {
                  key: "dates",
                  header: "Period",
                  render: (r) => (
                    <span>
                      {formatDate(r.startDate)} –{" "}
                      {r.endDate ? formatDate(r.endDate) : "Present"}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => (
                    <Badge tone={r.isActive ? "ok" : "neutral"}>
                      {r.isActive ? "Active" : "Historical"}
                    </Badge>
                  ),
                },
              ]}
            />
          ) : (
            <p style={{ color: "var(--ink-muted)", margin: 0 }}>
              {tr("No historical stall allocation records logged.")}
            </p>
          )}
        </Card>
      )}

      {/* Tab 6: Lifecycle Timeline */}
      {activeTab === "timeline" && (
        <Card pad={24}>
          <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "var(--fs-section)", fontWeight: 700 }}>
            {tr("Lifecycle Activity Timeline")}
          </h3>
          <LifecycleTimeline events={history?.timeline ?? []} isManager={isManager} />
        </Card>
      )}

      {/* Governance Modals for Club Manager */}
      <DeleteHorseModal
        horse={horse}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      <RetireHorseModal
        key={`${horse.id}-${horse.status}`}
        horse={horse}
        isOpen={isRetireModalOpen}
        onClose={() => setIsRetireModalOpen(false)}
        onSuccess={refreshHorse}
      />

      {/* DL-1.02 / DL-1.03 từ Tab 2 (BTN-1.13 → 1.15) */}
      {stallDialog === "assign" && (
        <AssignStallDialog
          horse={horse}
          onClose={() => setStallDialog(null)}
          onDone={() => {
            setStallDialog(null);
            refreshHorse();
          }}
        />
      )}
      {(stallDialog === "transfer" || stallDialog === "return") && horse.allocationId && (() => {
        const allocation = {
          allocationId: horse.allocationId,
          horseName: horse.name,
          stallId: horse.stallId ?? "",
          stallCode: horse.stallCode ?? "",
        };
        const done = () => {
          setStallDialog(null);
          refreshHorse();
        };
        return stallDialog === "transfer" ? (
          <TransferStallDialog allocation={allocation} onClose={() => setStallDialog(null)} onDone={done} />
        ) : (
          <ReturnStallDialog allocation={allocation} onClose={() => setStallDialog(null)} onDone={done} />
        );
      })()}

      {/* Modal Phân công HLV Quản lý */}
      {assignTrainerOpen && (
        <Modal
          title={isVi ? "Phân công Huấn luyện viên Quản lý" : "Assign Primary Trainer"}
          subtitle={`${horse.name} (${horse.horseCode || ""})`}
          width={460}
          onClose={() => setAssignTrainerOpen(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontSize: "13px", color: "var(--ink-secondary)", margin: 0 }}>
              {isVi
                ? "Chọn Huấn luyện viên trưởng phụ trách lập giáo án, bài tập thể lực và theo dõi chỉ số cho ngựa này:"
                : "Select the Head Trainer responsible for creating workout plans and monitoring this horse:"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[
                { name: "Nguyễn Văn Tuấn", email: "trainer@gmail.com", desc: "HLV Trưởng — Đua cự ly dài & Trung bình" },
                { name: "Trần Hải Nam", email: "trainer2@gmail.com", desc: "HLV Chuyên sâu — Nước rút & Đường cỏ" },
              ].map((t) => {
                const isSelected = selectedTrainerOption.includes(t.email);
                return (
                  <label
                    key={t.email}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "10px 14px",
                      border: isSelected ? "2px solid #2563eb" : "1px solid var(--border)",
                      borderRadius: "8px",
                      background: isSelected ? "#eff6ff" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="trainer_select"
                      checked={isSelected}
                      onChange={() => setSelectedTrainerOption(`${t.name} (${t.email})`)}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px" }}>{t.name} ({t.email})</span>
                      <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{t.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <Button tone="secondary" onClick={() => setAssignTrainerOpen(false)}>
                {tr("Cancel")}
              </Button>
              <Button
                tone="primary"
                onClick={() => {
                  setAssignedTrainer(selectedTrainerOption);
                  if (id) localStorage.setItem(`horse_trainer_${id}`, selectedTrainerOption);
                  toast.show(isVi ? `Đã phân công ${selectedTrainerOption} quản lý ngựa ${horse.name}!` : "Trainer assigned successfully!", "ok");
                  setAssignTrainerOpen(false);
                }}
              >
                {isVi ? "Xác nhận phân công" : "Confirm Assignment"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
