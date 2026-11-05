import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { Input } from "@/shared/components/form/Input";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Tabs } from "@/shared/components/ui/Tabs";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./PlanListPage.module.css";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { messageFor } from "@/shared/lib/messages";
import { trainingApi } from "../api";
import { ClonePlanDialog } from "../components/PlanDialogs";
import { ProgressBar } from "../components/ProgressBar";
import { PLAN_STATUS_LABEL, PLAN_STATUS_TONE } from "../types";
import type { PlanStatus, TrainingPlan } from "../types";

import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
const PAGE_SIZE = 10;

/** SC-2.02 Danh sách giáo án. Bấm dòng để mở SC-2.04; HT có Lập giáo án và Nhân bản. */
export default function PlanListPage() {
  useScreenTranslation();
  useAppLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useCurrentUser();
  const isTrainer = user.role === "HEAD_TRAINER";

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(params.get("status") ?? "OPEN");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cloning, setCloning] = useState<TrainingPlan | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPlans(await trainingApi.getPlans());
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const q = search.toLowerCase();
  const filtered = plans.filter(
    (p) =>
      (activeTab === "ALL" ||
        (activeTab === "OPEN" ? p.status === "DRAFT" || p.status === "ACTIVE" : p.status === activeTab)) &&
      (p.name.toLowerCase().includes(q) || p.planCode.toLowerCase().includes(q) || p.horseName.toLowerCase().includes(q)),
  );
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const count = (s: PlanStatus) => plans.filter((p) => p.status === s).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Training Plans"
        description="Draft → Active → Completed / Cancelled. Open a plan to manage its phases and workouts."
        action={isTrainer ? <Button tone="primary" onClick={() => navigate("/training/plans/new")}>{tr("+ Create New Plan")}</Button> : undefined}
      />

      <Card pad={16}>
        <div className={styles.toolbar}>
          <Tabs
            items={[
              { id: "OPEN", label: `Draft + Active (${count("DRAFT") + count("ACTIVE")})` },
              { id: "ACTIVE", label: `Active (${count("ACTIVE")})` },
              { id: "DRAFT", label: `Draft (${count("DRAFT")})` },
              { id: "COMPLETED", label: `Completed (${count("COMPLETED")})` },
              { id: "CANCELLED", label: `Cancelled (${count("CANCELLED")})` },
              { id: "ALL", label: `All (${plans.length})` },
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
          {shown.length === 0 ? (
            <EmptyState
              title={plans.length === 0 ? tr("No training plans yet.") : tr("No plans match the filter.")}
              action={isTrainer && plans.length === 0 ? <Button onClick={() => navigate("/training/plans/new")}>Create plan</Button> : undefined}
            />
          ) : (
            <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-sunken)" }}>
                  <th className={styles.colCode}>{tr("Code")}</th>
                  <th className={styles.colName}>{tr("Plan")}</th>
                  <th className={styles.colHorse}>{tr("Horse")}</th>
                  <th className={styles.colDates}>{tr("Dates")}</th>
                  <th className={styles.colPhases}>{tr("Phases")}</th>
                  <th className={styles.colProgress}>{tr("Progress")}</th>
                  <th className={styles.colStatus}>{tr("Status")}</th>
                  <th className={styles.colTrainer}>{tr("Trainer")}</th>
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
                    <td className={styles.colCode} style={{ fontWeight: 600 }}>{plan.planCode}</td>
                    <td className={styles.colName} style={{ fontWeight: 600 }}>{plan.name}</td>
                    <td className={styles.colHorse}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>{plan.horseName}</span>
                        {plan.isLockedByMedical && (
                          <Badge tone="danger" icon="lock">
                            {tr("Training Lock")}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className={styles.colDates}>
                      {plan.startDate} – {plan.endDate}
                    </td>
                    <td className={styles.colPhases}>{plan.phases.length}</td>
                    <td className={styles.colProgress}>
                      <ProgressBar
                        done={plan.progress.completed}
                        total={plan.progress.total ?? plan.progress.due}
                        due={plan.progress.due}
                        overdue={plan.progress.overdue}
                      />
                    </td>
                    <td className={styles.colStatus}>
                      <Badge tone={PLAN_STATUS_TONE[plan.status]}>{PLAN_STATUS_LABEL[plan.status]}</Badge>
                    </td>
                    <td className={styles.colTrainer}>{plan.headTrainerName}</td>
                    <td className={styles.colActions} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                        <LinkButton to={`/training/plans/${plan.id}`} tone="secondary" size="sm">{tr("View")}</LinkButton>
                        {isTrainer && (
                          <Button tone="ghost" size="sm" onClick={() => setCloning(plan)}>{tr("Clone")}</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} noun="plans" onPage={setPage} />
          </div>
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
