import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/form/Input";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { tr } from "@/shared/i18n/tr";
import { messageFor } from "@/shared/lib/messages";
import { getAdmissions } from "../services/admissionService";
import type { AdmissionStatus, HorseAdmissionRecord } from "../types/admission.types";
import { OwnerAdmissionDossierCard } from "../components/OwnerAdmissionDossierCard";

const STATUS_TABS: Array<{ id: AdmissionStatus | "ALL"; label: string }> = [
  { id: "ALL", label: "All records" },
  { id: "PENDING_VERIFICATION", label: "Pending scheduling" },
  { id: "APPOINTED", label: "Appointed" },
  { id: "INSPECTION_IN_PROGRESS", label: "Inspection in progress" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "CANCELLED", label: "Cancelled" },
];

export default function OwnerAdmissionsPage() {
  useTranslation();
  const [status, setStatus] = useState<AdmissionStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<HorseAdmissionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getAdmissions({ status, search: search.trim() || undefined, page: 1, pageSize: 30 })
      .then((res) => {
        if (!active) return;
        setRecords(res.data);
        setTotal(res.total);
      })
      .catch((err) => {
        if (active) setError(messageFor(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, search, tick]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <PageHeader
        title={tr("Submitted Admissions")}
        description={tr("Track horse admission progress, inspection appointments, club guidance messages, and submitted legal documents.")}
        action={
          <>
            <Button tone="secondary" icon="refresh" disabled={loading} onClick={reload}>
              {tr("Refresh")}
            </Button>
            <LinkButton to="/horses/new" tone="primary" icon="plus">
              {tr("Submit new admission")}
            </LinkButton>
          </>
        }
      />

      <Card pad={16}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <Tabs
            label={tr("Filter admission status")}
            items={STATUS_TABS.map((t) => ({
              id: t.id,
              label: tr(t.label),
              count: t.id === status && !loading && !error ? total : undefined,
            }))}
            active={status}
            onChange={(id) => setStatus(id as AdmissionStatus | "ALL")}
          />
          <div style={{ maxWidth: 420 }}>
            <Input
              icon="search"
              placeholder={tr("Search by ADM code, horse name or microchip...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert tone="danger" title={tr("Could not load admission list")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Card pad={32}>
          <p style={{ margin: 0, color: "var(--ink-muted)" }} role="status">
            {tr("Loading your submitted admission records...")}
          </p>
        </Card>
      ) : records.length === 0 ? (
        <Card pad={32}>
          <EmptyState
            icon="clipboard"
            title={tr(
              status !== "ALL" || search.trim()
                ? "No admission records match your filter"
                : "You have not submitted any horse admissions yet",
            )}
            description={tr(
              status !== "ALL" || search.trim()
                ? "Try selecting another status or clearing your search keyword."
                : "Complete the horse registration form, attach legal document photos and optional notes to submit for club review.",
            )}
            action={
              <LinkButton to="/horses/new" tone="primary" icon="plus">
                {tr("Submit first admission")}
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {records.map((rec) => (
            <OwnerAdmissionDossierCard
              key={rec.id}
              record={rec}
              horseLink
              onUpdated={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
