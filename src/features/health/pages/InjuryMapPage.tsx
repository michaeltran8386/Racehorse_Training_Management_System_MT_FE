import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/components/ui/Icon";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { Select } from "@/shared/components/form/Select";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { Textarea } from "@/shared/components/form/Textarea";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { cx } from "@/shared/lib/cx";
import { messageFor } from "@/shared/lib/messages";
import { isVietnamese } from "@/shared/lib/language";
import { HorseAnatomyGraphic } from "../components/HorseAnatomyGraphic";
import type { InjuryItem, InjuryStage, SeverityLevel } from "../types";

import styles from "./InjuryMapPage.module.css";

const STAGE_COLORS: Record<InjuryStage, string> = {
  ACUTE: "var(--danger)",
  SUBACUTE: "var(--warn)",
  RECOVERING: "var(--warn)",
  HEALED: "var(--ok)",
};

const STAGE_LABELS: Record<InjuryStage, string> = {
  ACUTE: "Acute",
  SUBACUTE: "Subacute",
  RECOVERING: "Recovering",
  HEALED: "Healed",
};

const MUSCLE_REGION_OPTIONS = [
  { value: "Superficial Digital Flexor Tendon (SDFT)", label: "Superficial Digital Flexor Tendon (SDFT)" },
  { value: "Deep Digital Flexor Tendon (DDFT)", label: "Deep Digital Flexor Tendon (DDFT)" },
  { value: "Suspensory Ligament", label: "Suspensory Ligament" },
  { value: "Shoulder Muscle (Deltoid & Triceps)", label: "Shoulder Muscle Group (Deltoideus / Triceps)" },
  { value: "Gluteal Muscle Group (Rump)", label: "Gluteal Muscle Group (Rump / Croup)" },
  { value: "Back (Longissimus Dorsi)", label: "Back Muscle (Longissimus Dorsi)" },
  { value: "Neck (Brachiocephalicus)", label: "Neck Muscle (Brachiocephalicus)" },
  { value: "Hamstrings (Biceps Femoris)", label: "Hamstring Group (Biceps Femoris)" },
  { value: "Pectoral Muscle Group", label: "Pectoral Muscle Group (Chest)" },
];

const SKELETON_REGION_OPTIONS = [
  { value: "Left Cannon Bone (MC3)", label: "Cannon Bone (Third Metacarpal MC3)" },
  { value: "Left Hock Joint (Tarsus)", label: "Hock Joint (Tarsal Bones / Calcaneus)" },
  { value: "Fetlock Joint & Proximal Sesamoid", label: "Fetlock Joint & Proximal Sesamoids" },
  { value: "Carpus (Knee Joint)", label: "Carpal Joint (Radial / Intermediate Bones)" },
  { value: "Scapula (Shoulder Blade)", label: "Scapula (Shoulder Blade & Spine)" },
  { value: "Pelvis (Ilium & Ischium)", label: "Pelvis (Sacroiliac / Coxal Joint)" },
  { value: "Thoracic Vertebrae & Ribs", label: "Thoracic Vertebrae & Ribs" },
  { value: "Cervical Vertebrae (C1-C7)", label: "Cervical Vertebrae (C1-C7)" },
  { value: "Pastern & Coffin Bone (P1-P3)", label: "Pastern & Pedal / Coffin Bone" },
  { value: "Splint Bone (MC2 / MC4)", label: "Splint Bone (Metacarpal II / IV)" },
];

const SEVERITY_OPTIONS = [
  { value: "MILD", label: "Mild (Grade 1)" },
  { value: "MODERATE", label: "Moderate (Grade 2)" },
  { value: "SEVERE", label: "Severe (Grade 3)" },
  { value: "CRITICAL", label: "Critical (Grade 4)" },
];

interface PointInjury extends InjuryItem {
  x: number | null; // % coordinates on canvas
  y: number | null;
}

import { getHorseInjuries, createInjury, updateInjury, deleteInjury } from "../api";
import { getHorseById, getHorses } from "@/features/horses/api";
import type { Horse } from "@/features/horses/types";
import { capitalize, formatDate } from "@/shared/lib/format";

import { localizeServerText, tr } from "@/shared/i18n/tr";
export default function InjuryMapPage() {
  useScreenTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const isVet = user?.role === "VETERINARIAN";
  const [horse, setHorse] = useState<Horse | null>(null);
  const [availableHorses, setAvailableHorses] = useState<Horse[]>([]);
  const [horseListError, setHorseListError] = useState("");
  const [horseError, setHorseError] = useState("");
  const [horseListRetry, setHorseListRetry] = useState(0);
  const [detailRetry, setDetailRetry] = useState(0);

  const [view, setView] = useState<"LEFT" | "RIGHT">("LEFT");
  const [layer, setLayer] = useState<"MUSCLE" | "SKELETON">("MUSCLE");
  const [markingMode, setMarkingMode] = useState(false);
  const [showHealed, setShowHealed] = useState(false);

  const [injuries, setInjuries] = useState<PointInjury[]>([]);
  const [injuriesLoading, setInjuriesLoading] = useState(false);
  const [injuriesError, setInjuriesError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setHorseListError("");
    getHorses({ limit: 100 })
      .then((res) => {
        if (active && res && Array.isArray(res.items)) {
          setAvailableHorses(res.items);
        }
      })
      .catch((err) => { if (active) setHorseListError(messageFor(err)); });
    return () => { active = false; };
  }, [horseListRetry]);

  useEffect(() => {
    let active = true;
    setHorse(null);
    setHorseError("");
    setInjuries([]);
    setSelectedId(null);
    setMarkingMode(false);
    setInjuriesError("");
    setInjuriesLoading(Boolean(id));
    if (id) {
      getHorseById(id)
        .then((res: any) => {
          if (active) setHorse(res.data || res);
        })
        .catch((err) => { if (active) setHorseError(messageFor(err)); });

      getHorseInjuries(id)
        .then((res: any) => {
          if (!active) return;
          const list = Array.isArray(res) ? res : res.injuries || [];
          const mappedList: PointInjury[] = list.map((item: any) => {
            const rawX = item.coordinateX ?? item.x;
            const rawY = item.coordinateY ?? item.y;
            const x = typeof rawX === "number" && Number.isFinite(rawX) && rawX >= 0 && rawX <= 100 ? Math.round(rawX <= 1 ? rawX * 100 : rawX) : null;
            const y = typeof rawY === "number" && Number.isFinite(rawY) && rawY >= 0 && rawY <= 100 ? Math.round(rawY <= 1 ? rawY * 100 : rawY) : null;
            const rawLayer = item.layer || tr("MUSCLE");
            const mappedLayer = rawLayer === "BONE" || rawLayer === "TENDON_LIGAMENT" ? "SKELETON" : rawLayer;
            return {
              ...item,
              x,
              y,
              layer: mappedLayer,
              region: item.anatomicalZone || item.region || tr("Anatomical Zone"),
              view: item.viewSide || item.view || tr("LEFT"),
            };
          });
          setInjuries(mappedList);
          setSelectedId(mappedList[0]?.id || null);
        })
        .catch((err) => { if (active) setInjuriesError(messageFor(err)); })
        .finally(() => { if (active) setInjuriesLoading(false); });
    }
    return () => {
      active = false;
    };
  }, [id, detailRetry]);

  // Dialogs & Actions
  const [addModalPoint, setAddModalPoint] = useState<{ x: number; y: number } | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [repositioningId, setRepositioningId] = useState<string | null>(null);
  const [savingInjury, setSavingInjury] = useState(false);

  // Form add
  const [formRegion, setFormRegion] = useState("");
  const [formType, setFormType] = useState("");
  const [formSeverity, setFormSeverity] = useState<SeverityLevel | "">("");
  const [formStage, setFormStage] = useState<InjuryStage>("ACUTE");
  const [formNotes, setFormNotes] = useState("");

  // Form update stage
  const [newStage, setNewStage] = useState<InjuryStage | "">("");
  const [stageNotes, setStageNotes] = useState("");

  function handleLayerChange(newLayer: "MUSCLE" | "SKELETON") {
    setLayer(newLayer);
    setFormRegion("");
    setRepositioningId(null);
  }

  // Filter injuries by orientation view, layer, and healed status
  const visibleInjuries = injuries.filter((inj) => {
    if (inj.view !== view) return false;
    if (inj.layer !== layer) return false;
    if (!showHealed && inj.stage === "HEALED") return false;
    return true;
  });

  // Ensure selected injury always belongs to the active visible set
  const activeSelectedId = visibleInjuries.some((i) => i.id === selectedId)
    ? selectedId
    : visibleInjuries[0]?.id || null;

  const selectedInjury = injuries.find((i) => i.id === activeSelectedId);

  function getErrorMessage(error: any, fallback: string): string {
    const msg = error?.response?.data?.message || localizeServerText(error?.message);
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string" && msg.trim()) return msg;
    return fallback;
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isVet) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // If currently relocating an existing pin
    if (repositioningId) {
      const normX = Number((x / 100).toFixed(4));
      const normY = Number((y / 100).toFixed(4));
      updateInjury(repositioningId, { coordinateX: normX, coordinateY: normY })
        .then(() => {
          const updated = injuries.map((inj) => (inj.id === repositioningId ? { ...inj, x, y } : inj));
          setInjuries(updated);
          const target = injuries.find((i) => i.id === repositioningId);
          setRepositioningId(null);
          toast.show(
            `Pin "${target?.region || "lesion"}" relocated to new coordinates (${x}%, ${y}%).`,
            "ok",
          );
        })
        .catch((error) => {
          toast.show(getErrorMessage(error, "Failed to relocate injury point."), "danger");
          console.error(error);
        });
      return;
    }

    // If in marking mode to place a new pin
    if (markingMode) {
      setFormRegion("");
      setFormType("");
      setFormSeverity("");
      setFormStage("ACUTE");
      setFormNotes("");
      setAddModalPoint({ x, y });
      setMarkingMode(false);
    }
  }

  async function handleSaveNewInjury() {
    if (savingInjury || !addModalPoint || !formRegion || !formType.trim() || !formSeverity) return;
    setSavingInjury(true);
    try {
      const normX = Number((addModalPoint.x / 100).toFixed(4));
      const normY = Number((addModalPoint.y / 100).toFixed(4));
      const payload = {
        horseId: id,
        coordinateX: normX,
        coordinateY: normY,
        viewSide: view,
        layer: layer === "SKELETON" ? "BONE" : "MUSCLE",
        anatomicalZone: formRegion,
        bodySide: view,
        injuryType: formType.trim(),
        severity: formSeverity,
        stage: formStage || (formSeverity === "MILD" ? "SUBACUTE" : "ACUTE"),
        description: formNotes.trim() || undefined,
        discoveryDate: new Date().toISOString(),
      };
      const res: any = await createInjury(payload);
      const item = res.injury || res;
      const rawX = item.coordinateX ?? item.x ?? addModalPoint.x;
      const rawY = item.coordinateY ?? item.y ?? addModalPoint.y;
      const x = rawX <= 1 ? Math.round(rawX * 100) : Math.round(rawX);
      const y = rawY <= 1 ? Math.round(rawY * 100) : Math.round(rawY);
      const newInj: PointInjury = {
        ...item,
        x,
        y,
        region: item.anatomicalZone || item.region || formRegion,
        view: item.viewSide || item.view || view,
      };

      const updated = [...injuries, newInj];
      setInjuries(updated);
      setSelectedId(newInj.id);
      setAddModalPoint(null);
      setFormType("");
      setFormNotes("");
      toast.show("New anatomical injury point recorded successfully.", "ok");
    } catch (error) {
      toast.show(getErrorMessage(error, "Failed to create injury point."), "danger");
      console.error(error);
    } finally {
      setSavingInjury(false);
    }
  }

  async function handleConfirmDelete() {
    if (savingInjury || !deleteTargetId) return;
    setSavingInjury(true);
    try {
      await deleteInjury(deleteTargetId);
      const target = injuries.find((i) => i.id === deleteTargetId);
      const remaining = injuries.filter((i) => i.id !== deleteTargetId);
      setInjuries(remaining);
      if (selectedId === deleteTargetId) {
        const nextVisible = remaining.filter((i) => i.view === view && i.layer === layer);
        setSelectedId(nextVisible[0]?.id || null);
      }
      setDeleteTargetId(null);
      toast.show(`Injury point "${target?.region || ""}" deleted successfully.`, "ok");
    } catch (error) {
      toast.show(getErrorMessage(error, "Failed to delete injury point."), "danger");
      console.error(error);
    } finally {
      setSavingInjury(false);
    }
  }

  async function handleUpdateStage() {
    if (savingInjury || !selectedInjury || !newStage) return;
    setSavingInjury(true);
    try {
      const payload: any = { stage: newStage };
      if (stageNotes.trim()) {
        payload.description = `${selectedInjury.notes || ""}\n- [${formatDate(new Date())}]: ${stageNotes.trim()}`;
      }
      
      await updateInjury(selectedInjury.id, payload);
      
      const updated = injuries.map((inj) => {
        if (inj.id === selectedInjury.id) {
          return {
            ...inj,
            stage: newStage,
            updatedDate: new Date().toISOString().split("T")[0],
            notes: payload.description || inj.notes,
          };
        }
        return inj;
      });
      setInjuries(updated);
      setShowStageModal(false);
      setStageNotes("");
      toast.show(`Recovery stage updated to: ${newStage}.`, "ok");
    } catch (error) {
      toast.show(getErrorMessage(error, "Failed to update injury stage."), "danger");
      console.error(error);
    } finally {
      setSavingInjury(false);
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button tone="ghost" icon="arrowLeft" onClick={() => navigate(horse ? `/medical/horses/${id}` : "/medical/herd")}>
            {horse ? tr("Medical Record") : tr("Herd Health")}
          </Button>
          <div>
            <h1 className={styles.pageTitle}>
              <span>{tr("2D Anatomical Injury Map")}</span>
              {horse && <span>{` · ${horse.name} (${horse.horseCode || horse.id.slice(0,6)})`}</span>}
            </h1>
            <span style={{ fontSize: "var(--fs-body)", color: "var(--muted)" }}>
              {horse
                ? tr(`Pinpoint anatomical lesions and monitor clinical progression for ${horse.name}.`)
                : tr("Pinpoint anatomical lesions and monitor clinical progression across recovery phases.")}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {availableHorses.length > 0 && (
            <div style={{ minWidth: 220 }}>
              <SearchSelect
                value={id ?? ""}
                aria-label={tr("Select a horse")}
                onChange={(v) => { if (v) navigate(`/medical/horses/${encodeURIComponent(v)}/injuries`); }}
                options={[{ value: "", label: tr("— Select a horse —") }, ...availableHorses.map((h) => ({
                  value: h.id,
                  label: `${h.name} (${h.horseCode || h.id.slice(0, 6)})`,
                }))]}
              />
            </div>
          )}

          {isVet && (
            <Button
              tone={markingMode ? "danger" : "primary"}
              icon="pin"
              disabled={!horse}
              onClick={() => setMarkingMode(!markingMode)}
            >
              {markingMode ? tr("Marking Mode Active (Click on model)") : tr("Enable Marking Mode")}
            </Button>
          )}
        </div>
      </div>

      {horseListError && <Alert tone="danger" title={tr("Could not load horses")} action={<Button tone="secondary" onClick={() => setHorseListRetry((value) => value + 1)}>{tr("Try again")}</Button>}>{horseListError}</Alert>}
      {horseError && <Alert tone="danger" title={tr("Unable to load medical profile")} action={<Button tone="secondary" onClick={() => setDetailRetry((value) => value + 1)}>{tr("Try again")}</Button>}>{horseError}</Alert>}

      <div className={styles.mainLayout}>
        {/* Model 2D Canvas */}
        <div className={styles.modelCard}>
          <div className={styles.toolbar}>
            <div className={styles.toggleGroup}>
              <span style={{ fontSize: "var(--fs-body)", fontWeight: 600, color: "var(--muted)" }}>{tr("View:")}</span>
              <Button
                size="sm"
                tone={view === "LEFT" ? "primary" : "ghost"}
                onClick={() => setView("LEFT")}
              >
                {tr("Left View")}
              </Button>
              <Button
                size="sm"
                tone={view === "RIGHT" ? "primary" : "ghost"}
                onClick={() => setView("RIGHT")}
              >
                {tr("Right View")}
              </Button>
            </div>

            <div className={styles.toggleGroup}>
              <span style={{ fontSize: "var(--fs-body)", fontWeight: 600, color: "var(--muted)" }}>{tr("Anatomy Layer:")}</span>
              <Button
                size="sm"
                tone={layer === "MUSCLE" ? "primary" : "ghost"}
                onClick={() => handleLayerChange("MUSCLE")}
              >
                {tr("Muscular Layer")}
              </Button>
              <Button
                size="sm"
                tone={layer === "SKELETON" ? "primary" : "ghost"}
                onClick={() => handleLayerChange("SKELETON")}
              >
                {tr("Skeletal Layer")}
              </Button>
            </div>

            <Checkbox
              label={tr("Show healed injuries")}
              checked={showHealed}
              onChange={setShowHealed}
            />
          </div>

          {/* Active Mode Prompts */}
          {repositioningId && (
            <div
              className="notranslate"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--warn-bg)",
                border: "1px solid var(--warn)",
                color: "var(--ink)",
                padding: "8px 14px",
                borderRadius: "var(--r-sm)",
                marginBottom: "12px",
                fontSize: "var(--fs-body)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex" }}><Icon name="pin" size={18} /></span>
                <span>
                  <strong>{tr("Repositioning Mode:")}</strong>{" "}
                  {tr("Click any spot on the {{layer}} model to relocate pin #{{pin}} ({{region}}).", {
                    layer: layer === "MUSCLE" ? tr("Muscular") : tr("Skeletal"),
                    pin: visibleInjuries.findIndex((i) => i.id === repositioningId) + 1,
                    region: injuries.find((i) => i.id === repositioningId)?.region ?? "",
                  })}
                </span>
              </div>
              <Button size="sm" tone="ghost" onClick={() => setRepositioningId(null)}>
                {tr("Cancel Move")}
              </Button>
            </div>
          )}

          {markingMode && (
            <div
              className="notranslate"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--ok-bg)",
                border: "1px solid var(--ok)",
                color: "var(--ink)",
                padding: "8px 14px",
                borderRadius: "var(--r-sm)",
                marginBottom: "12px",
                fontSize: "var(--fs-body)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex" }}><Icon name="flag" size={18} /></span>
                <span>
                  <strong>{tr("Marking Mode Active:")}</strong>{" "}
                  {tr("Click anywhere on the {{layer}} model to place a new injury point.", {
                    layer: layer === "MUSCLE" ? tr("Muscular") : tr("Skeletal"),
                  })}
                </span>
              </div>
              <Button size="sm" tone="ghost" onClick={() => setMarkingMode(false)}>
                {tr("Cancel Marking")}
              </Button>
            </div>
          )}

          {/* Canvas SVG Area */}
          <div
            className={cx(styles.canvasArea, (markingMode || Boolean(repositioningId)) && styles.marking)}
          >
            <div
              className={styles.stageWrapper}
              onClick={handleCanvasClick}
            >
              {/* SVG Horse Anatomy Graphic */}
              <HorseAnatomyGraphic view={view} layer={layer} />

              {/* Render Pins for Active Layer */}
              {visibleInjuries.map((inj, idx) => inj.x == null || inj.y == null ? null : (
                <button
                  key={inj.id}
                  type="button"
                  className={cx(styles.pin, inj.id === activeSelectedId && styles.selected, "notranslate")}
                  aria-label={`${inj.region}: ${inj.injuryType} (${tr(STAGE_LABELS[inj.stage])})`}
                  aria-pressed={inj.id === activeSelectedId}
                  style={{
                    left: `${inj.x}%`,
                    top: `${inj.y}%`,
                    backgroundColor: STAGE_COLORS[inj.stage],
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(inj.id);
                  }}
                  title={`${inj.region}: ${inj.injuryType} (${STAGE_LABELS[inj.stage]})`}
                >
                  <span>{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", fontSize: "var(--fs-caption)" }}>
            <span style={{ fontWeight: 600 }}>{tr("Recovery Stage Legend:")}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: STAGE_COLORS.ACUTE }} />
              {tr("Acute")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: STAGE_COLORS.SUBACUTE }} />
              {tr("Subacute")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: STAGE_COLORS.RECOVERING }} />
              {tr("Recovering")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: STAGE_COLORS.HEALED }} />
              {tr("Healed")}
            </span>
          </div>
        </div>

        {/* Side Panel */}
        <div className={styles.sidePanel}>
          {/* List of points */}
          <div className={styles.panelCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "var(--fs-body)" }}>
                {tr("Injury Points")} ({!id || injuriesLoading || injuriesError ? "—" : visibleInjuries.length}) · {layer === "MUSCLE" ? tr("Muscular") : tr("Skeletal")}
              </strong>
            </div>

            {!id ? (
              <div style={{ color: "var(--muted)", fontSize: "var(--fs-body)" }}>{tr("Select a horse to view injury points.")}</div>
            ) : injuriesLoading ? (
              <div style={{ color: "var(--muted)", fontSize: "var(--fs-body)" }}>{tr("Loading...")}</div>
            ) : injuriesError ? (
              <Alert tone="danger" title={tr("Could not load injury points.")} action={<Button tone="secondary" onClick={() => setDetailRetry((value) => value + 1)}>{tr("Try again")}</Button>}>{injuriesError}</Alert>
            ) : visibleInjuries.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: "var(--fs-body)" }}>
                {isVietnamese()
                  ? `Chưa có điểm chấn thương nào trên ${layer === "MUSCLE" ? "lớp cơ" : "lớp xương"} (${view === "LEFT" ? "mặt trái" : "mặt phải"}).`
                  : `No injury points recorded on the ${layer === "MUSCLE" ? "muscular" : "skeletal"} layer (${view === "LEFT" ? "left view" : "right view"}).`}
              </div>
            ) : (
              <div className={styles.injuryList}>
                {visibleInjuries.map((inj, idx) => (
                  <div
                    key={inj.id}
                    className={cx(styles.injuryItem, inj.id === activeSelectedId && styles.active)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <button type="button" className={styles.injurySelect} onClick={() => setSelectedId(inj.id)} aria-pressed={inj.id === activeSelectedId}>
                      <div style={{ fontWeight: 600, fontSize: "var(--fs-body)" }}>
                        #{idx + 1} {inj.region}
                      </div>
                      <div style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>{inj.injuryType}</div>
                      {(inj.x == null || inj.y == null) && <div style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>{tr("Position not recorded")}</div>}
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Badge tone={inj.stage === "ACUTE" ? "danger" : inj.stage === "HEALED" ? "ok" : "warn"} dot>
                        {tr(STAGE_LABELS[inj.stage])}
                      </Badge>
                      {isVet && (
                        <button
                          type="button"
                          title={tr("Delete pin")}
                          aria-label={`${tr("Delete pin")}: ${inj.region}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTargetId(inj.id);
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--muted)",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            borderRadius: "4px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details of selected point */}
          {selectedInjury && (
            <div className={styles.panelCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <strong style={{ fontSize: "var(--fs-body)" }}>{tr("Injury Details")}</strong>
                {isVet && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Button
                      size="sm"
                      tone={repositioningId === selectedInjury.id ? "danger" : "ghost"}
                      icon="pin"
                      onClick={() => {
                        setMarkingMode(false);
                        setRepositioningId(repositioningId === selectedInjury.id ? null : selectedInjury.id);
                      }}
                      title={tr("Relocate this pin to a different position on the model")}
                    >
                      {repositioningId === selectedInjury.id ? tr("Cancel Move") : tr("Relocate Pin")}
                    </Button>
                    {selectedInjury.stage !== "HEALED" && (
                      <Button size="sm" tone="primary" onClick={() => { setNewStage(""); setStageNotes(""); setShowStageModal(true); }}>
                        {tr("Update Recovery")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      tone="danger"
                      icon="trash"
                      onClick={() => setDeleteTargetId(selectedInjury.id)}
                      title={tr("Delete this injury point")}
                    >
                      {tr("Delete")}
                    </Button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: "var(--fs-body)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>{tr("Region:")}{" "}<strong>{selectedInjury.region}</strong> ({selectedInjury.view === "LEFT" ? tr("Left View") : tr("Right View")} · {selectedInjury.layer === "MUSCLE" ? tr("Muscular Layer") : tr("Skeletal Layer")})</div>
                <div>{tr("Condition:")}{" "}<strong>{selectedInjury.injuryType}</strong></div>
                <div>
                  {tr("Severity:")}{" "}<Badge tone={selectedInjury.severity === "CRITICAL" || selectedInjury.severity === "SEVERE" ? "danger" : "warn"}>{tr(capitalize(selectedInjury.severity))}</Badge>
                </div>
                <div>
                  {tr("Stage:")}{" "}<Badge tone={selectedInjury.stage === "ACUTE" ? "danger" : "ok"} dot>{tr(STAGE_LABELS[selectedInjury.stage])}</Badge>
                </div>
                <div>{tr("Detected Date:")}{" "}<strong>{formatDate(selectedInjury.detectedDate)}</strong></div>

                {selectedInjury.notes && (
                  <div style={{ background: "var(--surface-2)", padding: "8px 10px", borderRadius: "var(--r-sm)", marginTop: 4 }}>
                    <strong>{tr("Clinical Notes / Progress:")}</strong>
                    <div style={{ whiteSpace: "pre-line", marginTop: 4 }}>{selectedInjury.notes}</div>
                  </div>
                )}

                <div className={styles.timeline}>
                  <div className={styles.timelineNode}>
                    <div className={styles.timelineDot} />
                    <strong>{tr("Initial Diagnosis")}</strong>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>{formatDate(selectedInjury.detectedDate)}</span>
                  </div>
                  {selectedInjury.updatedDate && (
                    <div className={styles.timelineNode}>
                      <div className={styles.timelineDot} />
                      <strong>{tr("Phase Update:")} {tr(STAGE_LABELS[selectedInjury.stage])}</strong>
                      <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>{formatDate(selectedInjury.updatedDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add Injury */}
      {addModalPoint && (
        <Modal
          title={tr("Mark New Injury Point")}
          subtitle={tr(`Layer: ${layer === "MUSCLE" ? "Muscular Layer" : "Skeletal Layer"} · Orientation: ${view === "LEFT" ? "Left View" : "Right View"} · Coordinates (${addModalPoint.x}%, ${addModalPoint.y}%)`)}
          width={480}
          onClose={savingInjury ? undefined : () => setAddModalPoint(null)}
          foot={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Button tone="ghost" onClick={() => setAddModalPoint(null)} disabled={savingInjury}>{tr("Cancel")}</Button>
              <Button tone="primary" onClick={handleSaveNewInjury} disabled={savingInjury || !formRegion || !formType.trim() || !formSeverity}>{tr(savingInjury ? "Saving..." : "Save Injury Point")}</Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label={tr("Anatomical Region *")}>
              <Select
                options={[{ value: "", label: tr("— Select —") }, ...(layer === "MUSCLE" ? MUSCLE_REGION_OPTIONS : SKELETON_REGION_OPTIONS)]}
                disabled={savingInjury}
                value={formRegion}
                onChange={(e) => setFormRegion(e.target.value)}
              />
            </Field>

            <Field label={tr("Injury / Lesion Type *")} hint={tr("e.g. Tendinitis, Bone fissure, Desmitis, Fracture...")}>
              <Input
                value={formType}
                disabled={savingInjury}
                onChange={(e) => setFormType(e.target.value)}
                placeholder={tr("Enter injury classification...")}
                required
              />
            </Field>

            <Field label={tr("Severity Level *")}>
              <Select
                options={[{ value: "", label: tr("— Select —") }, ...SEVERITY_OPTIONS]}
                value={formSeverity}
                disabled={savingInjury}
                onChange={(e) => {
                  const val = e.target.value as SeverityLevel | "";
                  setFormSeverity(val);
                  if (val === "MILD") {
                    setFormStage("SUBACUTE");
                  } else if (val === "MODERATE" || val === "SEVERE" || val === "CRITICAL") {
                    setFormStage("ACUTE");
                  }
                }}
              />
            </Field>

            <Field label={tr("Recovery Stage *")}>
              <Select
                options={[
                  { value: "ACUTE", label: isVietnamese() ? "Cấp tính (Acute)" : "Acute" },
                  { value: "SUBACUTE", label: isVietnamese() ? "Bán cấp (Subacute)" : "Subacute" },
                  { value: "RECOVERING", label: isVietnamese() ? "Đang phục hồi (Recovering)" : "Recovering" },
                  { value: "HEALED", label: isVietnamese() ? "Đã lành (Healed)" : "Healed" },
                ]}
                value={formStage}
                disabled={savingInjury}
                onChange={(e) => setFormStage(e.target.value as InjuryStage)}
              />
            </Field>

            <Field label={tr("Clinical Notes & Instructions")}>
              <Textarea
                rows={2}
                value={formNotes}
                disabled={savingInjury}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder={tr("Note down lesion size, heat, pain response...")}
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Modal Update Stage */}
      {showStageModal && selectedInjury && (
        <Modal
          title={tr(`Update Recovery Stage: ${selectedInjury.region}`)}
          subtitle={tr(`Current Phase: ${STAGE_LABELS[selectedInjury.stage]}`)}
          width={460}
          onClose={savingInjury ? undefined : () => setShowStageModal(false)}
          foot={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Button tone="ghost" onClick={() => setShowStageModal(false)} disabled={savingInjury}>Cancel</Button>
              <Button tone="primary" onClick={handleUpdateStage} disabled={savingInjury || !newStage}>{tr(savingInjury ? "Saving..." : "Confirm Stage Transition")}</Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label={tr("New Recovery Stage *")}>
              <Select
                options={[
                  { value: "", label: tr("— Select —") },
                  { value: "ACUTE", label: isVietnamese() ? "Cấp tính (Acute)" : "Acute" },
                  { value: "SUBACUTE", label: isVietnamese() ? "Bán cấp (Subacute)" : "Subacute" },
                  { value: "RECOVERING", label: isVietnamese() ? "Đang phục hồi (Recovering)" : "Recovering" },
                  { value: "HEALED", label: isVietnamese() ? "Đã lành (Healed)" : "Healed" },
                ]}
                value={newStage}
                disabled={savingInjury}
                onChange={(e) => setNewStage(e.target.value as InjuryStage | "")}
              />
            </Field>

            <Field label={tr("Clinical Evaluation Notes")}>
              <Textarea
                rows={3}
                value={stageNotes}
                disabled={savingInjury}
                onChange={(e) => setStageNotes(e.target.value)}
                placeholder={tr("Describe pain reduction, gait recovery, palpation feedback...")}
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Modal Delete Confirmation */}
      {deleteTargetId && (
        <Modal
          title={tr("Delete Injury Point")}
          subtitle={tr("Confirm removal of anatomical lesion marker")}
          width={440}
          onClose={savingInjury ? undefined : () => setDeleteTargetId(null)}
          foot={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Button tone="ghost" onClick={() => setDeleteTargetId(null)} disabled={savingInjury}>
                Cancel
              </Button>
              <Button tone="danger" icon="trash" onClick={handleConfirmDelete} disabled={savingInjury}>
                {tr(savingInjury ? "Deleting..." : "Delete Point")}
              </Button>
            </div>
          }
        >
          <div style={{ fontSize: "var(--fs-body)", lineHeight: "1.6", color: "var(--ink)" }}>
            {tr("Are you sure you want to delete this injury pin?")}
            <div style={{ margin: "12px 0", padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--r-sm)" }}>
              {(() => {
                const target = injuries.find((i) => i.id === deleteTargetId);
                if (!target) return null;
                return (
                  <>
                    <div><strong>{tr("Region:")}</strong> {target.region}</div>
                    <div><strong>{tr("Condition:")}</strong> {target.injuryType}</div>
                    <div><strong>{tr("Layer:")}</strong> {target.layer === "MUSCLE" ? tr("Muscular Layer") : tr("Skeletal Layer")}</div>
                  </>
                );
              })()}
            </div>
            {tr("You can re-mark or create a new pin anytime using")}{" "}<strong>{tr("Enable Marking Mode")}</strong>.
          </div>
        </Modal>
      )}
    </div>
  );
}
