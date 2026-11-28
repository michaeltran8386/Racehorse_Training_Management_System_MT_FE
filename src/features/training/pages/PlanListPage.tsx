import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Icon } from "@/shared/components/ui/Icon";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { Input } from "@/shared/components/form/Input";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Tabs } from "@/shared/components/ui/Tabs";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./PlanListPage.module.css";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { messageFor } from "@/shared/lib/messages";
import { trainingApi } from "../api";
import { ClonePlanDialog } from "../components/PlanDialogs";
import { ProgressBar } from "../components/ProgressBar";
import { PLAN_STATUS_LABEL, PLAN_STATUS_TONE } from "../types";
import type { AssignableHorse, PlanStatus, TrainingPlan } from "../types";

import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
const PAGE_SIZE = 10;
// Thứ tự trong tab "Tất cả": Đang áp dụng -> Chờ kích hoạt -> Đã hoàn thành -> Đã hủy.
const STATUS_ORDER: Record<PlanStatus, number> = { ACTIVE: 0, DRAFT: 1, COMPLETED: 2, CANCELLED: 3 };

/** SC-2.02 Danh sách giáo án. Bấm dòng để mở SC-2.04; HT có Lập giáo án và Nhân bản. */
export default function PlanListPage() {
  useScreenTranslation();
  const { isVietnamese } = useAppLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useCurrentUser();
  const toast = useToast();
  const isTrainer = user.role === "HEAD_TRAINER";
  const isManager = user.role === "CLUB_MANAGER";

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [unplannedHorses, setUnplannedHorses] = useState<AssignableHorse[]>([]);
  const [assignableHorses, setAssignableHorses] = useState<AssignableHorse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(params.get("tab") ?? params.get("status") ?? "ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cloning, setCloning] = useState<TrainingPlan | null>(null);

  useEffect(() => {
    const tabParam = params.get("tab") ?? params.get("status");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [params]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [fetchedPlans, assignableRes] = await Promise.all([
        trainingApi.getPlans({ pageSize: 500 }),
        isTrainer || isManager ? trainingApi.getAssignableHorses().catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      ]);
      setPlans(fetchedPlans);
      if (assignableRes?.items) {
        setAssignableHorses(assignableRes.items);
      }
      if (isTrainer && assignableRes?.items) {
        setUnplannedHorses(
          assignableRes.items.filter((h) => {
            if (!h.canAssign || h.planState !== "READY") return false;
            if (h.status === "PENDING_ADMISSION" || !h.stallName) return false;
            return true;
          }),
        );
      }
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [isTrainer, isManager]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const q = search.toLowerCase();
  const unplannedHorsesTotal = assignableHorses.filter(
    (h) => h.unplannedCategory !== null && h.unplannedCategory !== undefined
  );
  const filteredUnplanned = unplannedHorsesTotal.filter(
    (h) =>
      h.name.toLowerCase().includes(q) ||
      (h.horseCode && h.horseCode.toLowerCase().includes(q)) ||
      (h.stallCode && h.stallCode.toLowerCase().includes(q)) ||
      (h.stallName && h.stallName.toLowerCase().includes(q))
  );
  const shownUnplanned = filteredUnplanned.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filtered = plans
    .filter(
      (p) =>
        (activeTab === "ALL" || p.status === activeTab) &&
        (p.name.toLowerCase().includes(q) || p.planCode.toLowerCase().includes(q) || p.horseName.toLowerCase().includes(q)),
    )
    // Cùng trạng thái: giáo án bắt đầu gần đây lên trước.
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.startDate.localeCompare(a.startDate));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const count = (s: PlanStatus) => plans.filter((p) => p.status === s).length;

  const activeCount = count("ACTIVE");
  const draftCount = count("DRAFT");
  const waitingCount = unplannedHorses.length;
  const activeOrDraftHorseIds = new Set(
    plans
      .filter((p) => p.status === "ACTIVE" || p.status === "DRAFT")
      .map((p) => p.horseId),
  );
  const lockedCount = unplannedHorses.filter((h) => h.planState === "MEDICAL_LOCKED").length;
  const totalOccupiedSlots = activeOrDraftHorseIds.size;
  const maxCapacity = 8;
  const remainingSlots = Math.max(0, maxCapacity - totalOccupiedSlots);
  const isAtCapacity = totalOccupiedSlots >= maxCapacity;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <PageHeader
        title={isVietnamese ? "Giáo án huấn luyện" : tr("Training Plans")}
        description={
          isVietnamese
            ? "Quản lý chu kỳ phân kỳ, khối lượng và lộ trình huấn luyện của từng chiến mã."
            : tr("Manage periodization phases, volume, and training roadmaps for horses.")
        }
        action={
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {isTrainer && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "20px",
                  background: isAtCapacity ? "rgba(239, 68, 68, 0.12)" : "var(--surface-2)",
                  border: `1px solid ${isAtCapacity ? "var(--danger, #ef4444)" : "var(--border)"}`,
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
                  {isVietnamese ? "Đang phụ trách:" : "Managing:"}
                </span>
                <strong style={{ fontSize: "14px", color: isAtCapacity ? "var(--danger, #ef4444)" : "var(--brand, #2563eb)" }}>
                  {totalOccupiedSlots}/8 {isVietnamese ? "chiến mã" : "horses"}
                </strong>
                {isAtCapacity && (
                  <span
                    title={isVietnamese ? "Đã đạt giới hạn tối đa 8 chiến mã" : "At max capacity"}
                    style={{ color: "var(--danger, #ef4444)", display: "inline-flex" }}
                  >
                    <Icon name="alert" size={14} inline />
                  </span>
                )}
              </div>
            )}
            {isTrainer && unplannedHorses.length > 0 && (
              <Badge tone="warn">
                <Icon name="clock" size={14} style={{ marginRight: 4 }} />
                {isVietnamese ? `${unplannedHorses.length} chiến mã chờ giáo án` : `${unplannedHorses.length} awaiting plan`}
              </Badge>
            )}
          </div>
        }
      />

      {/* Trainer Capacity Card / Định mức 8 chiến mã */}
      {isTrainer && (
        <Card pad={16} className={styles.capacityCard}>
          <div className={styles.capacityHeaderRow}>
            <div className={styles.capacityLeftCol}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
                  {isVietnamese ? "Định mức giáo án đang phụ trách" : "Trainer Active Plan Capacity"}
                </span>
                <Badge tone={isAtCapacity ? "danger" : totalOccupiedSlots >= 6 ? "warn" : "ok"}>
                  {isAtCapacity
                    ? (isVietnamese ? "Đã đủ 8/8 (Tối đa)" : "At Max Capacity (8/8)")
                    : (isVietnamese ? `Còn trống ${remainingSlots} chỗ` : `${remainingSlots} slots available`)}
                </Badge>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                {isVietnamese
                  ? "Tối đa 8 chiến mã đồng thời (tính theo giáo án đang áp dụng và bản nháp)."
                  : "Max 8 concurrent horses (active and draft plans)."}
              </div>
            </div>

            <div className={styles.capacityRightCol}>
              <div className={styles.capacityBigFraction}>
                <span className={styles.capacityBigNum} style={{ color: isAtCapacity ? "var(--danger, #ef4444)" : "var(--brand, #2563eb)" }}>
                  {totalOccupiedSlots}
                </span>
                <span className={styles.capacityBigSlash}>/</span>
                <span className={styles.capacityBigTotal}>8</span>
                <span className={styles.capacityBigUnit}>{isVietnamese ? "chiến mã" : "horses"}</span>
              </div>
              <div className={styles.capacityBarTrack}>
                <div
                  className={styles.capacityBarFill}
                  style={{
                    width: `${Math.min(100, (totalOccupiedSlots / 8) * 100)}%`,
                    backgroundColor: isAtCapacity ? "var(--danger, #ef4444)" : totalOccupiedSlots >= 6 ? "var(--warn, #f59e0b)" : "var(--brand, #2563eb)",
                  }}
                />
              </div>
              <div className={styles.capacitySubText}>
                <span>{activeCount} {isVietnamese ? "đang áp dụng" : "active"}</span>
                <span>•</span>
                <span>{draftCount} {isVietnamese ? "bản nháp" : "draft"}</span>
                {waitingCount > 0 && (
                  <>
                    <span>•</span>
                    <span style={{ color: "var(--warn, #f59e0b)", fontWeight: 600 }}>{waitingCount} {isVietnamese ? "chờ giáo án" : "waiting"}</span>
                  </>
                )}
                {lockedCount > 0 && (
                  <>
                    <span>•</span>
                    <span style={{ color: "var(--danger, #ef4444)", fontWeight: 600 }}>{lockedCount} {isVietnamese ? "khóa y tế" : "locked"}</span>
                  </>
                )}
                <span>•</span>
                <span>{remainingSlots} {isVietnamese ? "suất trống" : "free"}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card pad={16}>
        <div className={styles.toolbar}>
          <Tabs
            items={[
              { id: "ALL", label: isVietnamese ? `Tất cả (${plans.length})` : `All (${plans.length})` },
              { id: "ACTIVE", label: isVietnamese ? `Đang áp dụng (${count("ACTIVE")})` : `Active (${count("ACTIVE")})` },
              { id: "DRAFT", label: isVietnamese ? `Chờ kích hoạt (${count("DRAFT")})` : `Pending Activation (${count("DRAFT")})` },
              { id: "UNPLANNED", label: isVietnamese ? `Chưa có giáo án (${unplannedHorsesTotal.length})` : `Unplanned (${unplannedHorsesTotal.length})` },
              { id: "COMPLETED", label: isVietnamese ? `Đã hoàn thành (${count("COMPLETED")})` : `Completed (${count("COMPLETED")})` },
              { id: "CANCELLED", label: isVietnamese ? `Đã hủy (${count("CANCELLED")})` : `Cancelled (${count("CANCELLED")})` },
            ]}
            active={activeTab}
            onChange={(t) => {
              setActiveTab(t);
              setPage(1);
            }}
          />
          <Input
            aria-label={tr("Plan name, plan code, horse...")}
            placeholder={tr("Plan name, plan code, horse...")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 300, maxWidth: "100%" }}
          />
        </div>
      </Card>

      {error && (
        <Alert tone="danger" title={tr("Could not load data")}>
          {error} <Button size="sm" tone="secondary" onClick={() => void loadPlans()}>{tr("Try again")}</Button>
        </Alert>
      )}

      {loading ? (
        <SkeletonTable columns={6} rows={5} />
      ) : !error && (
        <Card>
          {activeTab === "UNPLANNED" ? (
            filteredUnplanned.length === 0 ? (
              <EmptyState
                title={isVietnamese ? "Không có chiến mã nào chưa có giáo án." : "No unplanned horses."}
                description={
                  isVietnamese
                    ? "Tất cả chiến mã trong danh sách phụ trách hiện đều đã có giáo án đang áp dụng hoặc bản nháp."
                    : "All horses in your list have active or draft training plans."
                }
              />
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-sunken)" }}>
                      <th className={styles.colHorse}>{isVietnamese ? "Chiến mã" : "Horse"}</th>
                      <th style={{ width: 140 }}>{isVietnamese ? "Ô chuồng" : "Stall"}</th>
                      <th style={{ width: 220 }}>{isVietnamese ? "Phân loại" : "Category"}</th>
                      {!isTrainer && <th className={styles.colTrainer}>{isVietnamese ? "HLV Phụ trách" : "Trainer"}</th>}
                      <th className={styles.colActions} style={{ width: 190 }}>{isVietnamese ? "Thao tác" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownUnplanned.map((h) => {
                      const isMed = h.isMedicalLocked || h.unplannedCategory === "MEDICAL_LOCKED";
                      const isResting = h.unplannedCategory === "RESTING_CYCLE";

                      let deadlineText = "";
                      let isOverdue = false;
                      if (h.planDeadlineAt) {
                        const deadlineTime = new Date(h.planDeadlineAt).getTime();
                        const msLeft = deadlineTime - effectiveClubNow().getTime();
                        const diffDays = Math.ceil(msLeft / (1000 * 3600 * 24));
                        isOverdue = diffDays < 0;
                        deadlineText = isOverdue
                          ? (isVietnamese ? `Quá hạn ${Math.abs(diffDays)} ngày` : `Overdue ${Math.abs(diffDays)}d`)
                          : (isVietnamese ? `Còn ${Math.max(1, diffDays)} ngày` : `${Math.max(1, diffDays)}d left`);
                      } else {
                        deadlineText = isVietnamese ? "Còn 3 ngày" : "3d left";
                      }

                      return (
                        <tr key={h.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className={styles.colHorse}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <img
                                src={h.avatarUrl || "/images/horses/horse-01.jpg"}
                                alt={h.name}
                                style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/images/horses/horse-01.jpg";
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13.5 }}>{h.name}</div>
                                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                                  {h.horseCode || "—"} · {h.breed ? tr(h.breed) : tr("Unknown")}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--brand, #2563eb)", fontSize: 13 }}>
                              {h.stallCode || h.stallName || "—"}
                            </div>
                            {h.zoneName && (
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{h.zoneName}</div>
                            )}
                          </td>
                          <td>
                            {isMed ? (
                              <Badge tone="danger">{tr("Medical lock")}</Badge>
                            ) : isResting ? (
                              <Badge tone="ok">{tr("Resting & Recovery")}</Badge>
                            ) : (
                              <Badge tone={isOverdue ? "danger" : "warn"}>
                                {tr("Newly admitted · {{deadline}}", { deadline: deadlineText })}
                              </Badge>
                            )}
                          </td>
                          {!isTrainer && (
                            <td className={styles.colTrainer}>
                              <span style={{ fontSize: 12.5 }}>{h.assignedTrainer?.fullName || tr("Unassigned")}</span>
                            </td>
                          )}
                          <td className={styles.colActions}>
                            {isMed ? (
                              <Button size="sm" tone="secondary" disabled title={tr("This horse is under a medical lock and cannot have a plan created.")}>
                                <Icon name="lock" size={13} style={{ marginRight: 4 }} />
                                {isVietnamese ? "Đang khóa y tế" : "Locked"}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                tone="primary"
                                onClick={() => navigate(`/training/plans/new?horseId=${h.id}`)}
                              >
                                <Icon name="plus" size={13} style={{ marginRight: 4 }} />
                                {isResting
                                  ? (isVietnamese ? "Lập giáo án mới" : "New Cycle Plan")
                                  : (isVietnamese ? "Lập giáo án ngay" : "Create Plan")}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : shown.length === 0 ? (
            <EmptyState
              title={plans.length === 0 ? tr("No training plans yet.") : tr("No plans match the filter.")}
              action={isTrainer && plans.length === 0 ? <Button onClick={() => navigate("/training?plan=NONE")}>{isVietnamese ? "Chọn ngựa lập giáo án" : "Create plan"}</Button> : undefined}
            />
          ) : (
            <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-sunken)" }}>
                  <th className={styles.colName}>{tr("Plan")}</th>
                  <th className={styles.colHorse}>{tr("Horse")}</th>
                  <th className={styles.colDates}>{tr("Dates")}</th>
                  <th className={styles.colPhases}>{tr("Phases")}</th>
                  <th className={styles.colProgress}>{tr("Progress")}</th>
                  <th className={styles.colStatus}>{tr("Status")}</th>
                  {!isTrainer && <th className={styles.colTrainer}>{tr("Trainer")}</th>}
                  <th className={styles.colActions}>{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((plan) => (
                  <tr
                    key={plan.id}
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        navigate(`/training/plans/${plan.id}`);
                      }
                    }}
                    onClick={() => navigate(`/training/plans/${plan.id}`)}
                  >
                    <td className={styles.colName}>
                      <div className={styles.planName}>{plan.name}</div>
                      <div className={styles.planCode}>{plan.planCode}</div>
                    </td>
                    <td className={styles.colHorse}>
                      <div className={styles.horseCell}>
                        <span>{plan.horseName}</span>
                        {plan.isLockedByMedical && (
                          <Badge tone="danger" icon="lock">
                            {tr("Training Lock")}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className={styles.colDates}>
                      <div>{plan.startDate}</div>
                      <div className={styles.dateEnd}>→ {plan.endDate}</div>
                    </td>
                    <td className={styles.colPhases}>{plan.phases.length}</td>
                    <td className={styles.colProgress}>
                      <ProgressBar
                        done={plan.progress.completed}
                        total={plan.progress.total ?? plan.progress.due}
                        due={plan.progress.due}
                        overdue={plan.progress.overdue}
                        overdueHref={`/training/plans/${plan.id}?status=OVERDUE`}
                      />
                    </td>
                    <td className={styles.colStatus}>
                      <Badge tone={PLAN_STATUS_TONE[plan.status]}>{tr(PLAN_STATUS_LABEL[plan.status])}</Badge>
                    </td>
                    {!isTrainer && (
                      <td className={styles.colTrainer}>
                        <span>{plan.headTrainerName}</span>
                        {plan.isTrainerLocked && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 4,
                              backgroundColor: "rgba(239, 68, 68, 0.12)",
                              color: "#dc2626",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                            title={
                              isVietnamese
                                ? "Huấn luyện viên phụ trách đã bị khóa/vô hiệu hóa - Cần chuyển giao giáo án"
                                : "Assigned trainer is locked/inactive"
                            }
                          >
                            <Icon name="alert" inline size={10} />
                            {isVietnamese ? "Đã khóa" : "Locked"}
                          </span>
                        )}
                      </td>
                    )}
                    <td className={styles.colActions} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                        <LinkButton to={`/training/plans/${plan.id}`} tone="secondary" size="sm">{tr("View plan")}</LinkButton>
                        {isTrainer && (
                          <Button tone="ghost" size="sm" onClick={() => setCloning(plan)}>{tr("Clone")}</Button>
                        )}
                        {isManager && plan.status === "DRAFT" && (
                          <Button
                            tone="danger"
                            size="sm"
                            onClick={async () => {
                              const confirmMsg = isVietnamese
                                ? `[QUẢN LÝ CLB CƯỠNG CHẾ]\nBạn có chắc chắn muốn xóa bản nháp giáo án "${plan.name}" (${plan.planCode}) để giải phóng chiến mã "${plan.horseName}"?`
                                : `[CLUB MANAGER OVERRIDE]\nForce delete draft plan "${plan.name}" to release horse "${plan.horseName}"?`;
                              if (window.confirm(confirmMsg)) {
                                try {
                                  await trainingApi.deletePlan(plan.id);
                                  toast.show(
                                    isVietnamese ? "Đã xóa bản nháp và giải phóng ngựa thành công." : "Draft plan deleted.",
                                    "ok",
                                  );
                                  void loadPlans();
                                } catch (e) {
                                  toast.show(messageFor(e), "danger");
                                }
                              }
                            }}
                          >
                            {isVietnamese ? "Cưỡng chế xóa" : "Force Delete"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === "UNPLANNED" ? (
          filteredUnplanned.length > PAGE_SIZE && (
            <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
              <Pagination page={page} pageSize={PAGE_SIZE} total={filteredUnplanned.length} noun="horses" onPage={setPage} />
            </div>
          )
        ) : (
          filtered.length > PAGE_SIZE && (
            <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} noun="plans" onPage={setPage} />
            </div>
          )
        )}
      </Card>
      )}

      {cloning && (
        <ClonePlanDialog
          plan={cloning}
          onClose={() => setCloning(null)}
          onDone={(created) => (created ? navigate(`/training/plans/${created.id}`) : void loadPlans())}
        />
      )}
    </div>
  );
}
