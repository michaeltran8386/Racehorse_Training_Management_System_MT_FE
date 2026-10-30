import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { listRecords } from "../api";
import type { MedicalRecord } from "../types";
import styles from "./MedicalRecordPage.module.css";
import { capitalize, formatDate } from "@/shared/lib/format";

import { tr } from "@/shared/i18n/tr";

export default function RecordListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const isVet = user?.role === "VETERINARIAN";

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const statusOptions = useMemo(
    () => [
      { value: "", label: tr("All Statuses") },
      { value: "DRAFT", label: tr("Draft") },
      { value: "OPEN", label: tr("In Treatment (Open)") },
      { value: "CLOSED", label: tr("Closed") },
    ],
    []
  );

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRecords({
        search: debouncedSearch.trim() || undefined,
        status: status || undefined,
        page,
        limit: 15,
      });
      setRecords(res.records);
      setTotal(res.total);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 240px" }}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon="search"
              aria-label={tr("Search medical records")}
              placeholder={tr("Record number, horse or diagnosis")}
            />
          </div>

          <div style={{ width: "200px" }}>
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

          <Button tone="ghost" onClick={() => { setSearch(""); setStatus(""); setPage(1); }}>
            {tr("Clear filters")}
          </Button>
        </div>
      </div>

      {/* Main Records Table */}
      <div className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--fs-body)", fontWeight: 600, color: "var(--muted)" }}>
            {tr("Showing {{count}} of {{total}} records", { count: records.length, total })}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
            {tr("Loading medical records…")}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            title={tr("No medical records found")}
            description={tr("Try adjusting your search keywords or status filter.")}
          />
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{tr("Record No.")}</th>
                  <th>{tr("Horse")}</th>
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
                  <tr key={r.id} onClick={() => navigate(`/medical/records/${r.id}`)}>
                    <td className="num nowrap"><strong>{r.recordNumber}</strong></td>
                    <td className="nowrap">{r.horseName || (r as any).horse?.name || '—'}{(r.horseCode || (r as any).horse?.horseCode) ? ` (${r.horseCode || (r as any).horse?.horseCode})` : ''}</td>
                    <td className="num nowrap">{formatDate(r.examinationDate)}</td>
                    <td>{r.examinationType}</td>
                    <td>{r.diagnosis || tr("None recorded")}</td>
                    <td>
                      <Badge
                        tone={
                          r.severity === "CRITICAL" || r.severity === "SEVERE"
                            ? "danger"
                            : r.severity === "MODERATE"
                            ? "warn"
                            : "ok"
                        }
                      >
                        {r.severity ? capitalize(r.severity) : "—"}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        tone={r.status === "OPEN" ? "info" : r.status === "CLOSED" ? "ok" : "neutral"}
                      >
                        {r.status === "OPEN" ? tr("In Treatment") : r.status === "CLOSED" ? tr("Closed") : tr("Draft")}
                      </Badge>
                    </td>
                    <td className="nowrap">{r.vetName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
