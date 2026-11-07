import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Field } from "@/shared/components/form/Field";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Card } from "@/shared/components/ui/Card";
import { DataTable, type Column } from "@/shared/components/ui/DataTable";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Tabs } from "@/shared/components/ui/Tabs";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { Select } from "@/shared/components/form/Select";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./CareSchedulePage.module.css";
import { formatDate } from "@/shared/lib/format";
import type { BadgeTone } from "@/shared/lib/status";
import { Input } from "@/shared/components/form/Input";
import { Modal } from "@/shared/components/ui/Modal";
import { Textarea } from "@/shared/components/form/Textarea";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { getHorses } from "@/features/horses/api";
import { healthApi } from "../api";
import type { PreventiveCareItem, PreventiveStatus } from "../types";

import { localizeServerText, tr } from "@/shared/i18n/tr";
const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All Categories",
  VACCINATION: "Vaccination",
  DEWORMING: "Deworming",
  FARRIER: "Farrier Care",
  DENTAL: "Dental Care",
  GENERAL: "Routine Checkup",
};

const DEFAULT_INTERVAL_DAYS: Record<string, number> = {
  VACCINATION: 180,
  DEWORMING: 90,
  FARRIER: 45,
  DENTAL: 365,
  GENERAL: 180,
};

// Trạng thái lịch dự phòng -> tông Badge chung (một màu một nghĩa trong toàn app).
const STATUS_BADGES: Record<PreventiveStatus, { label: string; tone: BadgeTone; icon: string }> = {
  UP_TO_DATE: { label: "On schedule", tone: "ok", icon: "checkCircle" },
  DUE_SOON: { label: "Due soon", tone: "warn", icon: "clock" },
  OVERDUE: { label: "Overdue", tone: "danger", icon: "alert" },
  NO_DATA: { label: "No data", tone: "neutral", icon: "info" },
};

export default function CareSchedulePage() {
  useScreenTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const isVet = user?.role === "VETERINARIAN";

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [items, setItems] = useState<PreventiveCareItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingHorses, setLoadingHorses] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState(1);

  // Create Preventive Care Schedule Modal (Bác sĩ thú y thêm Preventive Care)
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [horseList, setHorseList] = useState<Array<{ id: string; name: string; horseCode?: string }>>([]);
  const [createHorseId, setCreateHorseId] = useState<string>("");
  const [createCategory, setCreateCategory] = useState<"VACCINATION" | "DEWORMING" | "FARRIER" | "DENTAL" | "GENERAL">("VACCINATION");
  const [createType, setCreateType] = useState<string>("");
  const [createDueDate, setCreateDueDate] = useState<string>("");
  const [createNotes, setCreateNotes] = useState<string>("");

  // Record Completion Modal (DL-3.12)
  const [selectedCare, setSelectedCare] = useState<PreventiveCareItem | null>(null);
  const [adminDate, setAdminDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [adminBy, setAdminBy] = useState<string>(user?.fullName || "");
  const [performedByMode, setPerformedByMode] = useState<"SELF" | "EXTERNAL">("SELF");
  const [nextDue, setNextDue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const data = await healthApi.getCareSchedules();
      setItems(data);
    } catch {
      setItems([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const handleSync = () => {
      void loadData();
    };
    window.addEventListener("horsesUpdated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("horsesUpdated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [loadData]);

  const handleOpenCreateModal = async () => {
    if (loadingHorses) return;
    setLoadingHorses(true);
    try {
      const res = await getHorses({ limit: 100 });
      const list = (res.items || []).filter((h: any) => h.status !== "RETIRED");
      setHorseList(list);
      setCreateHorseId("");
      setCreateType("");
      setCreateDueDate("");
      setShowCreateModal(true);
    } catch {
      toast.show(tr("Could not load horses"), "danger");
    } finally {
      setLoadingHorses(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (submitting) return;
    if (!createHorseId) {
      toast.show(tr("Please select a horse"), "danger");
      return;
    }
    if (!createType.trim()) {
      toast.show(tr("Please enter care service name"), "danger");
      return;
    }
    if (!createDueDate) {
      toast.show(tr("Please select a due date."), "danger");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (createDueDate < todayStr) {
      toast.show(tr("Due date must be today or in the future."), "danger");
      return;
    }
    try {
      setSubmitting(true);
      await healthApi.createCareSchedule({
        horseId: createHorseId,
        category: createCategory,
        type: createType.trim(),
        dueDate: createDueDate,
        notes: createNotes.trim() || undefined,
      });
      toast.show(tr("Preventive care schedule created successfully"), "ok");
      setShowCreateModal(false);
      setCreateNotes("");
      void loadData();
    } catch (err: any) {
      toast.show(localizeServerText(err?.message) || tr("Failed to create care schedule"), "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCompleteModal = (care: PreventiveCareItem) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const interval = DEFAULT_INTERVAL_DAYS[care.category] || 180;
    const nextDateObj = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
    const defaultNextDue = nextDateObj.toISOString().split("T")[0];

    setSelectedCare(care);
    setAdminDate(todayStr);
    setAdminBy(user?.fullName || "");
    setPerformedByMode("SELF");
    setNextDue(defaultNextDue);
    setNotes("");
  };

  const handleSubmitComplete = async () => {
    if (!selectedCare || submitting) return;
    if (!adminDate || !adminBy.trim() || !nextDue) {
      toast.show(tr("Enter the administration date, provider and next due date."), "danger");
      return;
    }
    try {
      setSubmitting(true);
      await healthApi.recordCareCompletion(selectedCare.id, {
        horseId: selectedCare.realHorseId,
        typeCatalogId: selectedCare.typeCatalogId,
        administeredDate: adminDate,
        administeredBy: adminBy,
        nextDueDate: nextDue,
        notes: notes.trim() || undefined,
        performedByMode,
      });
      toast.show(`Recorded completion: ${selectedCare.type}`, "ok");
      setSelectedCare(null);
      void loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || localizeServerText(err?.message) || tr("Error recording care completion");
      toast.show(msg, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesTab =
      activeTab === "ALL"
        ? true
        : activeTab === "OVERDUE"
        ? item.status === "OVERDUE"
        : activeTab === "DUE_SOON"
        ? item.status === "DUE_SOON"
        : item.status === "UP_TO_DATE";

    const matchesCategory = selectedCategory === "ALL" ? true : item.category === selectedCategory;

    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.horseId.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      (item.notes && item.notes.toLowerCase().includes(q));

    return matchesTab && matchesCategory && matchesSearch;
  });

  const count = (st: PreventiveStatus) => items.filter((i) => i.status === st).length;
  const pageSize = 10;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredItems.length / pageSize)));
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<PreventiveCareItem>[] = [
    {
      key: "service",
      header: tr("Care service"),
      // Ghi chú gộp dưới tên dịch vụ, cắt 2 dòng + tooltip: cột ghi chú riêng làm bảng tràn và cắt mất cột Thao tác (BUG-MAN-08).
      render: (item) => (
        <div className={styles.service}>
          {item.type}
          {item.notes && <span className={styles.notes} title={item.notes}>{item.notes}</span>}
        </div>
      ),
    },
    {
      key: "horse",
      header: tr("Horse"),
      width: 125,
      render: (item) => (
        item.realHorseId ? <Link to={`/medical/horses/${item.realHorseId}`} className={styles.horse}>
          <strong>{item.horseName || item.horseId}</strong>
          {item.horseName && item.horseCode && <span>{item.horseCode}</span>}
        </Link> : <span>{item.horseId}</span>
      ),
    },
    {
      key: "category",
      header: tr("Category"),
      width: 105,
      render: (item) => <Badge tone="neutral">{CATEGORY_LABELS[item.category] || item.category}</Badge>,
    },
    {
      key: "last",
      header: tr("Last given"),
      width: 145,
      render: (item) => (
        <div style={{ display: "grid" }}>
          <span className="num nowrap">{item.lastAdministeredDate ? formatDate(item.lastAdministeredDate) : tr("Not recorded")}</span>
          {item.administeredBy && (
            <span className={styles.doctorText}>
              {item.administeredBy}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "due",
      header: tr("Due"),
      width: 105,
      render: (item) => (
        <span className="num nowrap" style={{ color: item.status === "OVERDUE" ? "var(--danger)" : undefined, fontWeight: item.status === "OVERDUE" ? 600 : undefined }}>
          {formatDate(item.dueDate)}
        </span>
      ),
    },
    {
      key: "status",
      header: tr("Status"),
      width: 100,
      render: (item) => {
        const st = STATUS_BADGES[item.status] || STATUS_BADGES.NO_DATA;
        return (
          <Badge tone={st.tone} icon={st.icon}>
            {tr(st.label)}
          </Badge>
        );
      },
    },
    ...(isVet
      ? [
          {
            key: "actions",
            header: tr("Actions"),
            width: 200,
            align: "right" as const,
            render: (item: PreventiveCareItem) => (
              <div className={styles.actionCell}>
                <Button tone="secondary" size="sm" icon="check" onClick={() => handleOpenCompleteModal(item)}>
                  {tr("Record completion")}
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={tr("Preventive care")}
        description={tr("Vaccinations, deworming, farrier, and dental schedules for all horses.")}
        action={
          isVet ? (
            <Button tone="primary" icon="plus" disabled={loadingHorses} onClick={() => void handleOpenCreateModal()}>
              {tr("Schedule Preventive Care")}
            </Button>
          ) : undefined
        }
      />

      <Card pad={0}>
        {loadError ? <Alert tone="danger" title={tr("Unable to load preventive care schedules")}
          action={<Button size="sm" tone="secondary" onClick={() => void loadData()}>{tr("Try again")}</Button>}>
          {tr("Check your connection and try again.")}
        </Alert> : <>
        <div style={{ padding: "0 20px", borderBottom: "1px solid var(--border)" }}>
          <Tabs
            label={tr("Filter by status")}
            items={[
              { id: "ALL", label: tr("All"), count: loading ? undefined : items.length },
              { id: "OVERDUE", label: tr("Overdue"), count: loading ? undefined : count("OVERDUE") },
              { id: "DUE_SOON", label: tr("Due soon"), count: loading ? undefined : count("DUE_SOON") },
              { id: "UP_TO_DATE", label: tr("On schedule"), count: loading ? undefined : count("UP_TO_DATE") },
            ]}
            active={activeTab}
            onChange={(value) => { setActiveTab(value); setPage(1); }}
          />
        </div>
        <div className={styles.filters}>
          <div style={{ flex: "1 1 260px", maxWidth: 360 }}>
            <Input
              icon="search"
              aria-label={tr("Search care items")}
              placeholder={tr("Service, horse or note")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div style={{ width: 200 }}>
            <Select
              aria-label={tr("Category")}
              value={selectedCategory}
              options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label: value === "ALL" ? "Category: All" : label }))}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <DataTable
            caption={tr("Preventive care schedule")}
            columns={columns}
            stackOnNarrow
            rows={visibleItems}
            rowKey={(item) => item.id}
            loading={loading}
            empty={
              <EmptyState
                icon="syringe"
                title={search || selectedCategory !== "ALL" || activeTab !== "ALL" ? "No care items match these filters" : "No preventive care scheduled yet"}
                description="Scheduled vaccinations, deworming, farrier and dental care appear here with their due dates."
              />
            }
          />
          {!loading && filteredItems.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <Pagination page={currentPage} pageSize={pageSize} total={filteredItems.length} noun="care items" onPage={setPage} />
            </div>
          )}
        </div>
        </>}
      </Card>

      {/* Record Completion Modal (DL-3.12) */}
      {selectedCare && (
        <Modal
          onClose={submitting ? undefined : () => setSelectedCare(null)}
          title={tr(`Record completion: ${selectedCare.type}`)}
          foot={<><Button tone="ghost" onClick={() => setSelectedCare(null)} disabled={submitting}>{tr("Cancel")}</Button><Button tone="primary" onClick={() => void handleSubmitComplete()} disabled={submitting}>{submitting ? tr("Saving...") : tr("Confirm Completion")}</Button></>}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                fontSize: "var(--fs-body)",
              }}
            >
              <div>
                <strong>{tr("Horse:")}</strong> {selectedCare.horseId}
              </div>
              <div style={{ marginTop: 3 }}>
                <strong>{tr("Service:")}</strong> {selectedCare.type} (
                {tr(CATEGORY_LABELS[selectedCare.category] || selectedCare.category)})
              </div>
            </div>

            <Field label={tr("Administered Date")} required>
              <Input
                type="date"
                value={adminDate}
                onChange={(e) => {
                  const newAdmin = e.target.value;
                  setAdminDate(newAdmin);
                  if (newAdmin && selectedCare) {
                    const interval = DEFAULT_INTERVAL_DAYS[selectedCare.category] || 180;
                    const parsed = new Date(newAdmin);
                    if (!isNaN(parsed.getTime())) {
                      const nextDate = new Date(parsed.getTime() + interval * 24 * 60 * 60 * 1000);
                      setNextDue(nextDate.toISOString().split("T")[0]);
                    }
                  }
                }}
              />
            </Field>

            <Field label={tr("Administered By / Vet Clinic")} required>
              <Input
                value={adminBy}
                onChange={(e) => setAdminBy(e.target.value)}
                placeholder={tr("Veterinarian or clinic name")}
              />
            </Field>

            <Field label={tr("Provider type")} required>
              <Select
                value={performedByMode}
                onChange={(e) => setPerformedByMode(e.target.value as "SELF" | "EXTERNAL")}
                options={[
                  { value: "SELF", label: "Self (Internal Vet / Staff)" },
                  { value: "EXTERNAL", label: "External (External Clinic / Partner)" },
                ]}
              />
            </Field>

            <Field
              label={tr("Next Due Date")}
              required
              hint={tr("Choose the next due date according to the care plan.")}
            >
              <Input
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
              />
            </Field>

            <Field label={tr("Notes & Post-Care Observations")}>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={tr("e.g., Deep IM injection, no febrile reaction, normal appetite and gait...")}
              />
            </Field>

          </div>
        </Modal>
      )}

      {showCreateModal && (
        <Modal
          title={tr("Schedule Preventive Care")}
          subtitle={tr("Plan an upcoming preventive care event for a racehorse.")}
          width={540}
          onClose={submitting ? undefined : () => setShowCreateModal(false)}
          foot={<><Button tone="ghost" onClick={() => setShowCreateModal(false)} disabled={submitting}>{tr("Cancel")}</Button><Button tone="primary" onClick={() => void handleCreateSchedule()} disabled={submitting}>{submitting ? tr("Scheduling...") : tr("Create Schedule")}</Button></>}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Field label={tr("Select Horse *")}>
              <SearchSelect
                value={createHorseId}
                onChange={setCreateHorseId}
                options={[
                  { value: "", label: tr("— Select a horse —") },
                  ...horseList.map((h) => ({
                    value: h.id,
                    label: `${h.name} (${h.horseCode || h.id.slice(0, 6)})`,
                  })),
                ]}
              />
            </Field>

            <div className={styles.formGrid}>
              <Field label={tr("Category *")}>
                <Select
                  value={createCategory}
                  onChange={(e) => {
                    const cat = e.target.value as any;
                    setCreateCategory(cat);
                    setCreateType("");
                  }}
                  options={[
                    { value: "VACCINATION", label: tr("Vaccination") },
                    { value: "DEWORMING", label: tr("Deworming") },
                    { value: "FARRIER", label: tr("Farrier Care") },
                    { value: "DENTAL", label: tr("Dental Care") },
                    { value: "GENERAL", label: tr("Routine Checkup") },
                  ]}
                />
              </Field>

              <Field label={tr("Due Date *")}>
                <Input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={createDueDate}
                  onChange={(e) => setCreateDueDate(e.target.value)}
                />
              </Field>
            </div>

            <Field label={tr("Care Procedure / Vaccine Name *")}>
              <Input
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                placeholder={tr("e.g. Equine Influenza & Tetanus Booster")}
              />
            </Field>

            <Field label={tr("Clinical Notes / Instructions")}>
              <Textarea
                rows={3}
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder={tr("Instructions, target product, or specific health precautions...")}
              />
            </Field>

          </div>
        </Modal>
      )}
    </div>
  );
}
