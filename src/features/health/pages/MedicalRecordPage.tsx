import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { HealthBadge } from "@/shared/components/ui/HealthBadge";
import { Icon } from "@/shared/components/ui/Icon";
import { Tabs } from "@/shared/components/ui/Tabs";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { cx } from "@/shared/lib/cx";
import {
  getHorseMedicalProfile,
  getHorseObservations,
  applyTrainingLock,
  releaseTrainingLock,
  extendTrainingLock,
} from "../api";
import { TrainingLockModal } from "../components/TrainingLockModal";
import { HorseAnatomyGraphic } from "../components/HorseAnatomyGraphic";
import type { HorseMedicalProfile, ObservationNote } from "../types";
import styles from "./MedicalRecordPage.module.css";
import { capitalize, formatDate, formatDateTime } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";

import { tr } from "@/shared/i18n/tr";
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "records", label: "Medical Records" },
  { id: "injuries", label: "Injury Map" },
  { id: "locks", label: "Training Locks" },
  { id: "preventive", label: "Preventive Care" },
  { id: "observations", label: "Observations" },
];

export default function MedicalRecordPage() {
  useScreenTranslation();
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab! : "overview";
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<HorseMedicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileRequest = useRef(0);
  const observationRequest = useRef(0);
  const loadedUrgency = useRef("");

  // Observation filters
  const [obsUrgency, setObsUrgency] = useState<string>("");
  const [observations, setObservations] = useState<ObservationNote[]>([]);
  const [observationsLoading, setObservationsLoading] = useState(false);

  // Lock modal states
  const [lockModalMode, setLockModalMode] = useState<"place" | "lift" | "extend" | null>(null);

  const isVet = user?.role === "VETERINARIAN";
  const isOwner = user?.role === "HORSE_OWNER";
  const isGroom = user?.role === "GROOM";

  const loadData = useCallback(async () => {
    const current = ++profileRequest.current;
    observationRequest.current += 1;
    setObservationsLoading(false);
    if (!id) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await getHorseMedicalProfile(id);
      if (current !== profileRequest.current) return;
      setProfile(res);
      setObservations(res.observations || []);
      loadedUrgency.current = "";
      setObsUrgency("");
    } catch (err: unknown) {
      if (current !== profileRequest.current) return;
      setProfile(null);
      setError(messageFor(err));
    } finally {
      if (current === profileRequest.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
    return () => { profileRequest.current += 1; observationRequest.current += 1; };
  }, [loadData]);

  // Load observations with filter
  async function handleFilterObservations(urgency: string) {
    const current = ++observationRequest.current;
    setObsUrgency(urgency);
    if (!id) return;
    setObservationsLoading(true);
    try {
      const res = await getHorseObservations(id, { urgency: urgency || undefined });
      if (current !== observationRequest.current) return;
      setObservations(res.observations);
      loadedUrgency.current = urgency;
    } catch {
      if (current !== observationRequest.current) return;
      setObsUrgency(loadedUrgency.current);
      toast.show("Error filtering observation notes.", "danger");
    } finally {
      if (current === observationRequest.current) setObservationsLoading(false);
    }
  }

  function handleTabChange(tabId: string) {
    setSearchParams({ tab: tabId });
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          {tr("Loading medical profile...")}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <EmptyState
          title={tr("Unable to load medical profile")}
          description={error || tr("Data not found or you lack permission to view this horse's profile.")}
          action={
            <Button tone="primary" onClick={() => void loadData()}>
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  const { horse, overview, records, injuries, locks, preventive } = profile;

  return (
    <div className={styles.container}>
      {/* Header Profile */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <h1 className={styles.horseTitle}>{horse.name}</h1>
              <HealthBadge status={horse.healthStatus} withIcon />
              {horse.isMedicalLocked && (
                <Badge tone="danger" icon="lock">
                  {tr("Active Training Lock")}
                </Badge>
              )}
            </div>
            <div className={styles.horseMeta}>
              <span className={styles.metaItem}>
                <Icon name="pin" size={14} /> {tr("Microchip RFID:")} <strong>{horse.microchipRfid}</strong>
              </span>
              <span className={styles.metaItem}>
                <Icon name="horse" size={14} /> {tr("Breed:")}{" "}<strong>{horse.breed}</strong>
              </span>
              <span className={styles.metaItem}>
                <Icon name="grid" size={14} /> {tr("Stall:")}{" "}<strong>{horse.stallCode || tr("Unassigned")}</strong>
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            {isVet && (
              <>
                <Button
                  tone="primary"
                  icon="plus"
                  onClick={() => navigate(`/medical/records/new?horseId=${horse.id}`)}
                >
                  {tr("Create Medical Record")}
                </Button>

                {!horse.isMedicalLocked ? (
                  <Button tone="danger" icon="lock" onClick={() => setLockModalMode("place")}>
                    {tr("Place Training Lock")}
                  </Button>
                ) : (
                  <>
                    <Button tone="ghost" icon="clock" onClick={() => setLockModalMode("extend")}>
                      {tr("Extend Review Date")}
                    </Button>
                    <Button tone="secondary" icon="unlock" onClick={() => setLockModalMode("lift")}>
                      {tr("Lift Training Lock")}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Lock Banner Warning */}
        {horse.isMedicalLocked && horse.activeLock && (
          <div className={styles.lockAlert}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="alert" size={20} />
              <div>
                <strong>{tr("Training Lock in effect ({{code}})", { code: horse.activeLock.lockCode })}</strong>
                <div>
                  {tr("Reason:")}{" "}{horse.activeLock.lockReason} {tr("· Placed by:")}{" "}{horse.activeLock.lockedBy} (
                  {formatDate(horse.activeLock.lockedAt)})
                </div>
              </div>
            </div>
            <div>
              {tr("Review Date:")}{" "}<strong>{formatDate(horse.activeLock.reviewDate)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <Tabs items={TABS} active={activeTab} onChange={handleTabChange} />

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className={styles.tabContent}>
          <div className={styles.overviewGrid}>
            {/* Activity Level & Directives */}
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>
                <Icon name="activity" size={18} />
                {tr("Activity Level & Care Directives")}
              </h2>
              <div style={{ fontSize: "var(--fs-body)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  {tr("Allowed activity level:")}{" "}
                  <Badge tone={overview.allowedActivity ? "brand" : "neutral"}>
                    {overview.allowedActivity ? tr(overview.allowedActivity) : tr("Not recorded")}
                  </Badge>
                </div>
                <div>
                  {tr("Special care instructions:")}
                  {overview.careInstructions.length === 0 ? (
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>{tr("No special directives.")}</div>
                  ) : (
                    <ul style={{ margin: "6px 0 0 18px", padding: 0, color: "var(--text-2)" }}>
                      {overview.careInstructions.map((c, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          <strong>{c.activity}</strong> — {c.frequency}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Active Medications (Hidden from Owner & Groom per FR-3.18) */}
            {!isOwner && !isGroom && (
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>
                  <Icon name="pill" size={18} />
                  {tr("Active Medications")}
                </h2>
                {overview.activeMedications.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: "var(--fs-body)" }}>{tr("Currently no active medications.")}</div>
                ) : (
                  <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>{tr("Medication")}</th>
                          <th>{tr("Dosage")}</th>
                          <th>{tr("Route")}</th>
                          <th>{tr("Frequency")}</th>
                          <th>{tr("Duration")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.activeMedications.map((m, i) => (
                          <tr key={i}>
                            <td><strong>{m.medicationName}</strong></td>
                            <td>{m.dosage} {m.unit}</td>
                            <td>{m.route}</td>
                            <td>{m.frequencyPerDay} {tr("times/day")}</td>
                            <td>{m.daysCount} {tr("days")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Medical Records */}
      {activeTab === "records" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.sectionTitle}>
                <Icon name="clipboard" size={18} />
                {tr("Medical Record History")}
              </h2>
              {isVet && (
                <Button size="sm" tone="primary" icon="plus" onClick={() => navigate(`/medical/records/new?horseId=${horse.id}`)}>
                  {tr("Add Record")}
                </Button>
              )}
            </div>

            {records.length === 0 ? (
              <EmptyState title={tr("No medical records found")} description={tr("No clinical records currently documented for this horse.")} />
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>{tr("Record No.")}</th>
                      <th>{tr("Exam Date")}</th>
                      <th>{tr("Exam Type")}</th>
                      <th>{tr("Diagnosis")}</th>
                      <th>{tr("Severity")}</th>
                      <th>{tr("Status")}</th>
                      <th>{tr("Attending Vet")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link className={styles.recordLink} to={`/medical/records/${r.id}`}>{r.recordNumber}</Link>
                        </td>
                        <td>{formatDate(r.examinationDate)}</td>
                        <td>{r.examinationType ? tr(r.examinationType) : "—"}</td>
                        <td>{r.diagnosis || tr("Not recorded")}</td>
                        <td>
                          <Badge tone={!r.severity ? "neutral" : r.severity === "CRITICAL" || r.severity === "SEVERE" ? "danger" : r.severity === "MODERATE" ? "warn" : "ok"}>
                            {r.severity ? tr(capitalize(r.severity)) : "—"}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={r.status === "OPEN" ? "info" : r.status === "CLOSED" ? "ok" : "neutral"} dot>
                            {r.status === "OPEN" ? tr("In Treatment") : r.status === "CLOSED" ? tr("Closed") : tr("Draft")}
                          </Badge>
                        </td>
                        <td>{r.vetName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Injury Map & 2D Model */}
      {activeTab === "injuries" && (
        <div className={styles.tabContent} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* 2D Model Interactive Hero Card */}
          <div
            style={{
              padding: "1.5rem",
              background: "var(--surface)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: "1.5rem",
              alignItems: "center",
            }}
          >
            <div
              style={{
                height: 220,
                background: "var(--surface-sunken)",
                borderRadius: "var(--r-lg)",
                overflow: "hidden",
                border: "1px solid var(--border)",
                cursor: "pointer",
                position: "relative",
              }}
              onClick={() => navigate(`/medical/horses/${horse.id}/injuries`)}
              title={tr("Click to open full 2D Interactive Musculoskeletal Canvas")}
            >
              <HorseAnatomyGraphic view="LEFT" layer="MUSCLE" />
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  background: "rgba(0, 0, 0, 0.75)",
                  color: "var(--text-on-brand)",
                  fontSize: "var(--fs-caption)",
                  padding: "4px 8px",
                  borderRadius: "var(--r-sm)",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon name="search" size={12} />
                {tr("Click to explore 2D map")}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: injuries.some((i) => i.stage !== "HEALED") ? "var(--danger)" : "var(--ok)",
                    display: "inline-block",
                  }}
                />
                <h3 style={{ margin: 0, fontSize: "var(--fs-section)", fontWeight: 700 }}>
                  {tr("2D Musculoskeletal Anatomical Model")}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: "var(--fs-body)", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {tr("Interactive dual-layer biomechanical mapping (Skeletal & Muscular systems) supporting coordinate-precise lesion tagging, progressive staging (Acute → Healed), and veterinary clinical evaluation.")}
              </p>

              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                <div style={{ padding: "0.5rem 0.85rem", background: "var(--surface-sunken)", borderRadius: "var(--r)", fontSize: "var(--fs-body)" }}>
                  {tr("Active Lesions:")}{" "}<strong>{injuries.filter((i) => i.stage !== "HEALED").length}</strong>
                </div>
                <div style={{ padding: "0.5rem 0.85rem", background: "var(--surface-sunken)", borderRadius: "var(--r)", fontSize: "var(--fs-body)" }}>
                  {tr("Healed Lesions:")}{" "}<strong>{injuries.filter((i) => i.stage === "HEALED").length}</strong>
                </div>
                <div style={{ padding: "0.5rem 0.85rem", background: "var(--surface-sunken)", borderRadius: "var(--r)", fontSize: "var(--fs-body)" }}>
                  {tr("Total Documented:")}{" "}<strong>{injuries.length}</strong>
                </div>
              </div>

              <div style={{ marginTop: "0.5rem" }}>
                <Button
                  tone="primary"
                  onClick={() => navigate(`/medical/horses/${horse.id}/injuries`)}
                >
                  {tr("Open Full 2D Anatomical Canvas →")}
                </Button>
              </div>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.sectionTitle}>
                <Icon name="bone" size={18} />
                {tr("Injury List & Anatomical Lesions")}
              </h2>
              <Button size="sm" tone="ghost" icon="map" onClick={() => navigate(`/medical/horses/${horse.id}/injuries`)}>
                {tr("Open 2D Model")}
              </Button>
            </div>

            {injuries.length === 0 ? (
              <EmptyState
                title={tr("No injuries recorded")}
                description={tr("No musculoskeletal lesions currently documented for this horse.")}
                action={
                  isVet ? (
                    <Button tone="primary" onClick={() => navigate(`/medical/horses/${horse.id}/injuries`)}>
                      {tr("Open 2D Canvas to Pin Lesion")}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>{tr("Anatomical Region")}</th>
                      <th>{tr("Injury Type")}</th>
                      <th>{tr("Severity")}</th>
                      <th>{tr("Stage")}</th>
                      <th>{tr("Detected Date")}</th>
                      <th>{tr("Notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {injuries.map((inj) => (
                      <tr key={inj.id}>
                        <td><Link className={styles.recordLink} to={`/medical/horses/${horse.id}/injuries`}>{inj.region}</Link> ({inj.view === "LEFT" ? tr("Left View") : tr("Right View")})</td>
                        <td>{inj.injuryType}</td>
                        <td>
                          <Badge tone={inj.severity === "SEVERE" || inj.severity === "CRITICAL" ? "danger" : "warn"}>
                            {tr(capitalize(inj.severity))}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={inj.stage === "ACUTE" ? "danger" : inj.stage === "HEALED" ? "ok" : "warn"} dot>
                            {inj.stage === "ACUTE" ? tr("Acute") : inj.stage === "SUBACUTE" ? tr("Subacute") : inj.stage === "RECOVERING" ? tr("Recovering") : tr("Healed")}
                          </Badge>
                        </td>
                        <td>{formatDate(inj.detectedDate)}</td>
                        <td>{inj.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Training Locks */}
      {activeTab === "locks" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <Icon name="lock" size={18} />
              {tr("Training Lock History")}
            </h2>

            {locks.length === 0 ? (
              <EmptyState title={tr("No training locks on record")} description={tr("This horse has no training lock orders on record.")} />
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>{tr("Lock Code")}</th>
                      <th>{tr("Applied Status")}</th>
                      <th>{tr("Placed Date")}</th>
                      <th>{tr("Placed By")}</th>
                      <th>{tr("Reason")}</th>
                      <th>{tr("Review Date")}</th>
                      <th>{tr("Lifted Date")}</th>
                      <th>{tr("Release Reason")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locks.map((lk) => (
                      <tr key={lk.id}>
                        <td><strong>{lk.lockCode}</strong></td>
                        <td><Badge tone="danger">{lk.appliedMedicalStatus}</Badge></td>
                        <td>{formatDate(lk.lockedAt)}</td>
                        <td>{lk.lockedBy}</td>
                        <td>{lk.lockReason}</td>
                        <td>{formatDate(lk.reviewDate)}</td>
                        <td>{lk.releasedAt ? formatDate(lk.releasedAt) : tr("Active")}</td>
                        <td>{lk.releaseReason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Preventive Care */}
      {activeTab === "preventive" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <Icon name="calendar" size={18} />
              {tr("Vaccination, Deworming & Farrier Schedule")}
            </h2>

            {preventive.length === 0 ? (
              <EmptyState title={tr("No preventive schedules")} description={tr("No preventive care catalog set up for this horse.")} />
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>{tr("Service")}</th>
                      <th>{tr("Category")}</th>
                      <th>{tr("Last Administered")}</th>
                      <th>{tr("Administered By")}</th>
                      <th>{tr("Due Date")}</th>
                      <th>{tr("Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preventive.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.type}</strong></td>
                        <td>{p.category}</td>
                        <td>{p.lastAdministeredDate ? formatDate(p.lastAdministeredDate) : "—"}</td>
                        <td>{p.administeredBy || "—"}</td>
                        <td>{formatDate(p.dueDate)}</td>
                        <td>
                          <Badge tone={p.status === "OVERDUE" ? "danger" : p.status === "DUE_SOON" ? "warn" : "ok"} dot>
                            {p.status === "OVERDUE" ? tr("Overdue") : p.status === "DUE_SOON" ? tr("Due Soon") : tr("Up to Date")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Observations */}
      {activeTab === "observations" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <h2 className={styles.sectionTitle}>
                <Icon name="eye" size={18} />
                {tr("Groom Health Observation Log")}
              </h2>

              <div className={styles.filtersRow}>
                <span style={{ fontSize: "var(--fs-body)", color: "var(--muted)" }}>{tr("Urgency:")}</span>
                <Button
                  size="sm"
                  tone={obsUrgency === "" ? "primary" : "ghost"}
                  onClick={() => void handleFilterObservations("")}
                >
                  {tr("All")}
                </Button>
                <Button
                  size="sm"
                  tone={obsUrgency === "NORMAL" ? "primary" : "ghost"}
                  onClick={() => void handleFilterObservations("NORMAL")}
                >
                  {tr("Normal")}
                </Button>
                <Button
                  size="sm"
                  tone={obsUrgency === "ATTENTION" ? "primary" : "ghost"}
                  onClick={() => void handleFilterObservations("ATTENTION")}
                >
                  {tr("Attention")}
                </Button>
                <Button
                  size="sm"
                  tone={obsUrgency === "URGENT" ? "danger" : "ghost"}
                  onClick={() => void handleFilterObservations("URGENT")}
                >
                  {tr("Urgent")}
                </Button>
              </div>
            </div>

            {observationsLoading ? (
              <p role="status">{tr("Loading observations...")}</p>
            ) : observations.length === 0 ? (
              <EmptyState title={tr("No observation notes")} description={tr("No observation logs submitted by care staff.")} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {observations.map((o) => (
                  <div key={o.id} className={cx(styles.observationItem, o.urgency === "URGENT" && styles.urgent)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong>{o.groomName}</strong>
                        <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>({o.shift})</span>
                        <Badge tone={o.urgency === "URGENT" ? "danger" : o.urgency === "ATTENTION" ? "warn" : "neutral"} dot>
                          {o.urgency === "URGENT" ? tr("Urgent") : o.urgency === "ATTENTION" ? tr("Attention") : tr("Normal")}
                        </Badge>
                      </div>
                      <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>
                        {formatDateTime(o.observedAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: "var(--fs-body)", color: "var(--text)" }}>{o.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lock Action Modals */}
      {lockModalMode && (
        <TrainingLockModal
          mode={lockModalMode}
          horseName={horse.name}
          horseId={horse.id}
          currentReviewDate={horse.activeLock?.reviewDate}
          onClose={() => setLockModalMode(null)}
          onPlaceLock={async (dto) => {
            await applyTrainingLock(horse.id, {
              appliedMedicalStatus: dto.appliedStatus,
              lockReason: dto.reason,
              reviewDate: dto.reviewDate,
              unlockConditions: dto.unlockConditions,
            });
            toast.show(tr("Training lock placed successfully"), "ok");
            await loadData();
          }}
          onLiftLock={async (dto) => {
            const lockId = horse.activeLock?.id || horse.id;
            await releaseTrainingLock(lockId, {
              targetStatus: dto.restoreStatus,
              releaseReason: dto.reason,
              horseId: horse.id,
            });
            toast.show(
              tr("Training lock lifted successfully. Status restored to {{status}}", {
                status: dto.restoreStatus === "FIT" ? tr("Fit for Training") : tr("Under Observation"),
              }),
              "ok",
            );
            await loadData();
          }}
          onExtendLock={async (dto) => {
            const lockId = horse.activeLock?.id || horse.id;
            await extendTrainingLock(lockId, {
              newReviewDate: dto.newReviewDate,
              reason: dto.reason,
              horseId: horse.id,
            });
            toast.show(tr("Training lock review date extended to {{date}}", { date: dto.newReviewDate }), "ok");
            await loadData();
          }}
        />
      )}
    </div>
  );
}
