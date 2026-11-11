import { HEALTH_STATUS } from "@/shared/lib/status";
import type { HealthStatus } from "@/shared/types/enums";
import { tr } from "@/shared/i18n/tr";
import { Badge } from "./Badge";

interface HealthBadgeProps {
  status: HealthStatus;
  withIcon?: boolean;
}

// Nhãn tình trạng sức khỏe của ngựa (Fit / Under Observation / Injured / Quarantined).
// Dùng ở danh sách ngựa, hồ sơ ngựa, bảng sức khỏe toàn đàn. Nghĩa không chỉ nằm ở màu: có chấm hoặc icon đi kèm.
export function HealthBadge({ status, withIcon = true }: HealthBadgeProps) {
  const h = HEALTH_STATUS[status];
  return (
    <Badge tone={h.tone} icon={withIcon ? h.icon : undefined} dot={!withIcon}>
      {tr(h.label)}
    </Badge>
  );
}
