import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { DataTable } from "@/shared/components/ui/DataTable";
import type { Column } from "@/shared/components/ui/DataTable";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Textarea } from "@/shared/components/form/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { HEALTH_STATUS } from "@/shared/lib/status";
import { formatDateTime } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import type { HealthStatus } from "@/shared/types/enums";
import { getDeletedHorses, restoreHorse } from "../api";
import type { DeletedHorse } from "../types";

import { tr } from "@/shared/i18n/tr";
import styles from "./DeletedHorsesPage.module.css";
const PAGE_SIZE = 10;

/** SC-1.05 Hồ sơ ngựa đã xóa (chỉ CM, chặn ở screenAccess + BE @Roles). */
export default function DeletedHorsesPage() {
  useScreenTranslation();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DeletedHorse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState<DeletedHorse | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getDeletedHorses({ search: search.trim() || undefined, from: from || undefined, to: to || undefined, page, limit: PAGE_SIZE })
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
      })
      .catch((e: unknown) => setError(messageFor(e)))
      .finally(() => setLoading(false));
  }, [search, from, to, page]);

  useEffect(() => {
    const t = window.setTimeout(load, 300); // chờ người dùng gõ xong ô tìm kiếm
    return () => window.clearTimeout(t);
  }, [load]);

  const columns: Column<DeletedHorse>[] = [
    { key: "code", header: "Horse ID", render: (h) => h.horseCode || "—" },
    { key: "name", header: "Name", render: (h) => <strong>{h.name}</strong> },
    { key: "chip", header: "Microchip", hideOnNarrow: true, render: (h) => h.microchip || "—" },
    {
      key: "status",
      header: "Status when deleted",
      hideOnNarrow: true,
      render: (h) => {
        const cfg = HEALTH_STATUS[h.status as HealthStatus] || { label: h.status, tone: "neutral" };
        return <Badge tone={cfg.tone as any}>{cfg.label}</Badge>;
      },
    },
    { key: "at", header: "Deleted at", render: (h) => formatDateTime(h.deletedAt) },
    { key: "by", header: "Deleted by", hideOnNarrow: true, render: (h) => h.deletedBy?.fullName || "—" },
    {
      key: "reason",
      header: "Reason",
      render: (h) => {
        const r = h.deleteReason || "";
        return <span title={r}>{r.length > 80 ? `${r.slice(0, 80)}…` : r}</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (h) => (
        <Button size="sm" tone="secondary" onClick={() => setRestoring(h)}>
          {tr("Restore")}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={tr("Deleted horse profiles.")}
        description={tr("Profiles deleted by mistake. Restoring brings the horse back in the status it had when deleted, without a stall or groom.")}
        action={
          <LinkButton to="/horses" tone="secondary" icon="arrowLeft">Back to roster</LinkButton>
        }
      />

      <Card pad={16}>
        <div className={styles.filters}>
          <div className={styles.search}>
            <Field label={tr("Search")}>
              <Input
                placeholder={tr("Horse name, horse ID, microchip")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </Field>
          </div>
          <Field label={tr("Deleted from")}>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </Field>
          <Field label={tr("Deleted to")}>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </Field>
        </div>
      </Card>

      {error && <Alert tone="danger" title={tr("Could not load deleted profiles")}>{error}</Alert>}

      <Card pad={0}>
        <DataTable
          caption={tr("Deleted horse profiles")}
          columns={columns}
          rows={rows}
          rowKey={(h) => h.id}
          loading={loading}
          empty={<EmptyState icon="archive" title="No horse profiles have been deleted." />}
        />
        {total > PAGE_SIZE && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="profiles" onPage={setPage} />
        )}
      </Card>

      {restoring && (
        <RestoreDialog
          horse={restoring}
          onClose={() => setRestoring(null)}
          onRestored={() => {
            setRestoring(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/** DL-1.11 Khôi phục hồ sơ: lý do 10-500 ký tự. */
function RestoreDialog({ horse, onClose, onRestored }: { horse: DeletedHorse; onClose: () => void; onRestored: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const n = reason.trim().length;
  const reasonErr = n === 0 ? "Please enter a reason." : n < 10 || n > 500 ? "Reason must be 10 to 500 characters." : "";

  const submit = async () => {
    setTouched(true);
    if (reasonErr) return;
    setSubmitting(true);
    setError("");
    try {
      await restoreHorse(horse.id, { reason: reason.trim() });
      toast.show(`Horse profile ${horse.name} has been restored.`, "ok", {
        action: { label: "View profile", onClick: () => navigate(`/horses/${horse.id}`) },
      });
      onRestored();
    } catch (e: unknown) {
      setError(messageFor(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={tr(`Restore ${horse.name} (${horse.horseCode || horse.id})?`)}
      onClose={onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button tone="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={submitting || Boolean(reasonErr)}>
            {submitting ? "Restoring..." : "Restore"}
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ margin: 0 }}>
          {tr("The horse returns to the status it had when deleted, without a stall and without a groom.")}
        </p>
        {error && <Alert tone="danger" title={tr("Cannot restore")}>{error}</Alert>}
        <Field label={tr("Reason")} required hint={tr("10-500 characters")} error={touched ? reasonErr || undefined : undefined}>
          <Textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
