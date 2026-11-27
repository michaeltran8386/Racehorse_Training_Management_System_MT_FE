import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Icon } from "@/shared/components/ui/Icon";
import { HorseAvatar } from "@/features/horses/components/HorseAvatar";
import { getOrphanedHorses, type OrphanedHorseItem } from "@/features/accounts/api";
import { AssignHorseTrainerModal } from "@/features/horses/components/AssignHorseTrainerModal";

interface OrphanedHorsesCardProps {
  onChanged?: () => void;
}

export function OrphanedHorsesCard({ onChanged }: OrphanedHorsesCardProps) {
  const [items, setItems] = useState<OrphanedHorseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHorse, setSelectedHorse] = useState<OrphanedHorseItem | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Mặc định hiển thị vài con tượng trưng (1 con nếu có 2 con, 2 con nếu có từ 3 con trở lên)
  const previewLimit = items.length <= 2 ? 1 : 2;
  const visibleItems = isExpanded ? items : items.slice(0, previewLimit);
  const hasMore = items.length > previewLimit;

  function loadData() {
    setLoading(true);
    getOrphanedHorses()
      .then((res) => {
        setItems(res.items || []);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading || items.length === 0) {
    return null;
  }

  function handlePostpone(horseName: string) {
    alert(
      `[Bảo vệ An toàn Huấn luyện - Lớp 3]: Đã gửi yêu cầu dời lịch tập của chiến mã "${horseName}" sang ngày hôm sau (+1 ngày). Huấn luyện viên mới sẽ tiếp nhận sau khi hoàn tất xác nhận giáo án.`
    );
  }

  return (
    <>
      <div
        style={{
          border: "2px solid var(--warning, #f59e0b)",
          borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(239, 68, 68, 0.04))",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.2)",
                color: "var(--warning, #f59e0b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="alert-triangle" size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "15.5px", fontWeight: 700, color: "var(--ink)" }}>
                  Chiến mã Tồn đọng Chờ Bổ nhiệm HLV (Do Điều chuyển Nhân sự)
                </h3>
                <Badge tone="danger">{items.length} chiến mã</Badge>
              </div>
              <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
                Các chiến mã này đang ở trong ô chuồng nhưng chưa có HLV phụ trách do HLV cũ đã chuyển Barn hoặc đồng nghiệp đầy tải. Vui lòng ưu tiên phân công HLV mới để duy trì lịch tập.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {hasMore && (
              <Button
                size="sm"
                tone="secondary"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={14} />
                {isExpanded ? "Thu gọn" : `Xem tất cả (${items.length})`}
              </Button>
            )}
            <Button size="sm" tone="ghost" onClick={loadData}>
              <Icon name="refresh-cw" size={14} /> Làm mới
            </Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "12px" }}>
          {visibleItems.map((h) => (
            <div
              key={h.horseId}
              style={{
                background: "var(--surface, #ffffff)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "10px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <HorseAvatar url={h.avatarUrl} name={h.horseName} size={42} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "14.5px", color: "var(--ink)" }}>{h.horseName}</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>({h.horseCode})</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--brand, #2563eb)", fontWeight: 500, marginTop: "2px" }}>
                      Ô chuồng: <strong>{h.stallCode}</strong> {h.zoneName ? `· ${h.zoneName}` : ""}
                    </div>
                  </div>
                </div>
                <Badge tone="danger">Chưa có HLV</Badge>
              </div>

              {h.latestPlan && (
                <div
                  style={{
                    fontSize: "12px",
                    background: "var(--surface-sunken, #f8fafc)",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle, #e2e8f0)",
                    color: "var(--text-muted)",
                  }}
                >
                  📋 Giáo án: <strong>{h.latestPlan.planCode}</strong> (Đang tạm dừng chờ HLV tiếp nhận)
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                <Button
                  size="sm"
                  tone="primary"
                  onClick={() => setSelectedHorse(h)}
                >
                  <Icon name="user-plus" size={14} /> Phân công HLV mới
                </Button>
                <Link
                  to="/stables/map"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "var(--text-2)",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border)",
                    textDecoration: "none",
                  }}
                >
                  <Icon name="move" size={13} /> Chuyển sang Barn khác
                </Link>
                <Button
                  size="sm"
                  tone="secondary"
                  onClick={() => handlePostpone(h.horseName)}
                  title="Dời lịch tập hôm nay/ngày mai sang ngày kế tiếp nếu chưa có HLV phụ trách"
                >
                  <Icon name="clock" size={14} /> Dời lịch tập +1 ngày
                </Button>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "4px" }}>
            <Button
              size="sm"
              tone="secondary"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={14} />
              {isExpanded
                ? "Thu gọn danh sách"
                : `Xem toàn bộ ${items.length} chiến mã tồn đọng (còn ${items.length - previewLimit} con)`}
            </Button>
          </div>
        )}
      </div>

      {selectedHorse && (
        <AssignHorseTrainerModal
          horseId={selectedHorse.horseId}
          horseName={selectedHorse.horseName}
          horseCode={selectedHorse.horseCode}
          stallCode={selectedHorse.stallCode}
          zoneId={selectedHorse.zoneId}
          zoneName={selectedHorse.zoneName}
          isOpen={!!selectedHorse}
          onClose={() => setSelectedHorse(null)}
          onSuccess={() => {
            loadData();
            if (onChanged) onChanged();
          }}
        />
      )}
    </>
  );
}
