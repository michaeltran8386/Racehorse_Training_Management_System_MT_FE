import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { getHorses } from "@/features/horses/api";
import { listRecords } from "../api";
import type { MedicalRecord } from "../types";
import styles from "./MedicalRecordPage.module.css";
import { capitalize, formatDate } from "@/shared/lib/format";

import { tr } from "@/shared/i18n/tr";

export default function RecordListPage() {
  useScreenTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { user } = useAuth();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [horses, setHorses] = useState<{ id: string; name: string; horseCode?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (highlightId && /^MED-/i.test(highlightId) && !search) {
      setSearch(highlightId);
    }
  }, [highlightId]);
  const [status, setStatus] = useState<string>("");
  const [horseId, setHorseId] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const requestId = useRef(0);

  const isVet = user?.role === "VETERINARIAN";

  useEffect(() => {
    getHorses({ limit: 100 })
      .then((res) => setHorses(res.items || []))
      .catch(() => setHorses([]));
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const statusOptions = [
    { value: "", label: tr("All Statuses") },
    { value: "OPEN", label: tr("In Treatment (Open)") },
    { value: "DRAFT", label: tr("Draft") },
    { value: "CLOSED", label: tr("Closed") },
  ];

  const horseOptions = [
    { value: "", label: tr("All horses") },
    ...horses.map((h) => ({ value: h.id, label: `${h.name}${h.horseCode ? ` (${h.horseCode})` : ""}` })),
  ];

  const severityOptions = [
    { value: "", label: tr("All severities") },
    { value: "MILD", label: tr("Mild") },
    { value: "MODERATE", label: tr("Moderate") },
    { value: "SEVERE", label: tr("Severe") },
    { value: "CRITICAL", label: tr("Critical") },
  ];

  const fetchRecords = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await listRecords({
        search: debouncedSearch.trim() || undefined,
        status: status || undefined,
        horseId: horseId || undefined,
        page,
        limit: 10,
      });
      if (currentRequest !== requestId.current) return;
      const lastPage = Math.max(1, Math.ceil(res.total / 10));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setRecords(res.records);
      setTotal(res.total);
    } catch {
      if (currentRequest !== requestId.current) return;
      setRecords([]);
      setTotal(0);
      setLoadError(true);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [debouncedSearch, status, horseId, page]);

  useEffect(() => {
    void fetchRecords();
    return () => { requestId.current += 1; };
  }, [fetchRecords]);

  const displayedRecords = severity
    ? records.filter((r) => r.severity === severity)
    : records;

  return (
    <div className={styles.container}>
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <h1 className={styles.horseTitle}>{tr("Electronic Medical Records")}</h1>
            <span style={{ fontSize: "var(--fs-body)", color: "var(--muted)" }}>
              {tr("Manage clinical diagnoses, treatment protocols, prescriptions, and follow-up history for the entire herd.")}
            </span>
          </div>

          {isVet && (
            <div className={styles.actions}>
              <Button tone="primary" icon="plus" onClick={() => navigate("/medical/records/new")}>
                {tr("Create Medical Record")}
              </Button>
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className={styles.recordFilters}>
          <div className={styles.recordSearch}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon="search"
              aria-label={tr("Search medical records")}
              placeholder={tr("Record number, horse or diagnosis")}
            />
          </div>

          <div style={{ flex: "0 1 180px", minWidth: 160 }}>
            <Select
              aria-label={tr("Horse")}
              options={horseOptions}
              value={horseId}
              onChange={(e) => {
                setHorseId(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className={styles.recordStatus}>
            <Select
              aria-label={tr("Status")}
              options={statusOptions}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ flex: "0 1 160px", minWidth: 140 }}>
            <Select
              aria-label={tr("Severity")}
              options={severityOptions}
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Button
            tone="ghost"
            onClick={() => {
              setSearch("");
              setStatus("");
              setHorseId("");
              setSeverity("");
              setPage(1);
            }}
          >
            {tr("Clear filters")}
          </Button>
        </div>
      </div>

      {/* Main Records Table */}
      <div className={styles.sectionCard}>
        {!loadError && !loading && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--fs-body)", fontWeight: 600, color: "var(--muted)" }}>
              {tr("Showing {{count}} of {{total}} records", { count: displayedRecords.length, total })}
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
            {tr("Loading medical records…")}
          </div>
        ) : loadError ? (
          <Alert
            tone="danger"
            title={tr("Could not load medical records")}
            action={<Button size="sm" tone="secondary" onClick={() => void fetchRecords()}>{tr("Try again")}</Button>}
          >
            {tr("Check your connection and try again.")}
          </Alert>
        ) : displayedRecords.length === 0 ? (
          <EmptyState
            title={tr("No medical records found")}
            description={tr(search.trim() || status || horseId || severity ? "Try adjusting your search keywords or status filter." : "Medical records will appear here when they are created.")}
            action={!search.trim() && !status && !horseId && !severity && isVet ? <Button onClick={() => navigate("/medical/records/new")}>{tr("Create Medical Record")}</Button> : undefined}
          />
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable} style={{ tableLayout: "fixed", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "13%" }}>{tr("Record No.")}</th>
                  <th style={{ width: "16%" }}>{tr("Horse")}</th>
                  <th style={{ width: "11%" }}>{tr("Exam Date")}</th>
                  <th style={{ width: "12%" }}>{tr("Exam Type")}</th>
                  <th style={{ width: "18%" }}>{tr("Diagnosis")}</th>
                  <th style={{ width: "10%" }}>{tr("Severity")}</th>
                  <th style={{ width: "10%" }}>{tr("Status")}</th>
                  <th style={{ width: "10%" }}>{tr("Follow-up")}</th>
                </tr>
              </thead>
              <tbody>
                {displayedRecords.map((r) => {
                  const isHighlighted = Boolean(
                    highlightId &&
                      (r.id === highlightId ||
                        r.recordNumber === highlightId ||
                        (r as any).horseId === highlightId ||
                        (r as any).horse?.horseCode === highlightId)
                  );
                  return (
                    <tr
                      key={r.id}
                      data-highlight-id={r.id}
                      data-highlight-code={r.recordNumber}
                      className={isHighlighted ? "highlight-target-attention" : undefined}
                    >
                      <td className="num nowrap" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      <Link className={styles.recordLink} to={`/medical/records/${r.id}`}>
                        {r.recordNumber}
                      </Link>
                    </td>
                    <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <strong>{r.horseName || (r as any).horse?.name || "—"}</strong>
                      {(r.horseCode || (r as any).horse?.horseCode) ? ` (${r.horseCode || (r as any).horse?.horseCode})` : ""}
                    </td>
                    <td className="num nowrap">{formatDate(r.examinationDate)}</td>
                    <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tr(r.examinationType)}
                    </td>
                    <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.diagnosis || ""}>
                      {r.diagnosis || tr("None recorded")}
                    </td>
                    <td>
                      <Badge
                        tone={
                          !r.severity
                            ? "neutral"
                            : r.severity === "CRITICAL" || r.severity === "SEVERE"
                            ? "danger"
                            : r.severity === "MODERATE"
                            ? "warn"
                            : "ok"
                        }
                      >
                        {r.severity ? tr(capitalize(r.severity)) : "—"}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        tone={r.status === "OPEN" ? "info" : r.status === "CLOSED" ? "ok" : "neutral"}
                      >
                        {r.status === "OPEN" ? tr("In Treatment") : r.status === "CLOSED" ? tr("Closed") : tr("Draft")}
                      </Badge>
                    </td>
                    <td className="num nowrap">
                      {r.followUpDate ? (
                        <div style={{ display: "grid" }}>
                          <span>{formatDate(r.followUpDate)}</span>
                          {new Date(r.followUpDate) < new Date() && r.status === "OPEN" && (
                            <span style={{ fontSize: "var(--fs-caption)", color: "var(--danger)", fontWeight: 600 }}>
                              {tr("Overdue")}
                            </span>
                          )}
                        </div>
                      ) : r.requiresFollowUp ? (
                        <Badge tone="warn">{tr("Required")}</Badge>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > 10 && <Pagination page={page} pageSize={10} total={total} noun="records" onPage={setPage} />}
      </div>
    </div>
  );
}
