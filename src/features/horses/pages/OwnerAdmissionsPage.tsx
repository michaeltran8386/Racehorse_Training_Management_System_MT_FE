import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/form/Input";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Alert } from "@/shared/components/ui/Alert";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { messageFor } from "@/shared/lib/messages";
import { getAdmissions } from "../services/admissionService";
import type { AdmissionStatus, HorseAdmissionRecord } from "../types/admission.types";
import { OwnerAdmissionDossierCard } from "../components/OwnerAdmissionDossierCard";

const STATUS_TABS: Array<{ id: AdmissionStatus | "ALL"; label: string }> = [
  { id: "ALL", label: "Tất cả hồ sơ" },
  { id: "PENDING_VERIFICATION", label: "Chờ xếp lịch" },
  { id: "APPOINTED", label: "Đã có lịch hẹn" },
  { id: "INSPECTION_IN_PROGRESS", label: "Đang thẩm định" },
  { id: "APPROVED", label: "Đã tiếp nhận" },
  { id: "REJECTED", label: "Bị từ chối" },
  { id: "CANCELLED", label: "Đã rút / hủy" },
];

export default function OwnerAdmissionsPage() {
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
        title="Hồ sơ đăng ký đã nộp"
        description="Theo dõi tiến độ tiếp nhận chiến mã, lịch hẹn thẩm định, lời nhắn hướng dẫn từ CLB và giấy tờ pháp lý đã nộp."
        action={
          <>
            <Button tone="secondary" icon="refresh" disabled={loading} onClick={reload}>
              Làm mới
            </Button>
            <LinkButton to="/horses/new" tone="primary" icon="plus">
              Nộp hồ sơ mới
            </LinkButton>
          </>
        }
      />

      <Card pad={16}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <Tabs
            label="Lọc trạng thái hồ sơ"
            items={STATUS_TABS.map((t) => ({
              id: t.id,
              label: t.label,
              count: t.id === status && !loading && !error ? total : undefined,
            }))}
            active={status}
            onChange={(id) => setStatus(id as AdmissionStatus | "ALL")}
          />
          <div style={{ maxWidth: 420 }}>
            <Input
              icon="search"
              placeholder="Tìm theo mã hồ sơ ADM, tên chiến mã hoặc microchip..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert tone="danger" title="Không tải được danh sách hồ sơ">
          {error}
        </Alert>
      )}

      {loading ? (
        <Card pad={32}>
          <p style={{ margin: 0, color: "var(--ink-muted)" }} role="status">
            Đang tải danh sách hồ sơ đăng ký của bạn...
          </p>
        </Card>
      ) : records.length === 0 ? (
        <Card pad={32}>
          <EmptyState
            icon="clipboard"
            title={
              status !== "ALL" || search.trim()
                ? "Không có hồ sơ nào khớp bộ lọc"
                : "Bạn chưa nộp hồ sơ đăng ký ngựa nào"
            }
            description={
              status !== "ALL" || search.trim()
                ? "Hãy thử chọn trạng thái khác hoặc xóa từ khóa tìm kiếm."
                : "Điền tờ khai thông tin chiến mã, đính kèm ảnh giấy tờ pháp lý và ghi chú mong muốn để gửi CLB xét duyệt."
            }
            action={
              <LinkButton to="/horses/new" tone="primary" icon="plus">
                Nộp hồ sơ đăng ký đầu tiên
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
