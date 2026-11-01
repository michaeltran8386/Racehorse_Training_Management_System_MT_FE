import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { DashboardHeroBanner } from "../components/DashboardHeroBanner";
import {
  GroomDashboard,
  ManagerDashboard,
  OwnerDashboard,
  TrainerDashboard,
  VetDashboard,
} from "../components/RoleDashboards";

/** Q-0.01 = B: sau đăng nhập mỗi vai trò thấy dashboard của mình (cùng đường dẫn /dashboard). */
export default function DashboardPage() {
  useScreenTranslation();
  const user = useCurrentUser();

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <DashboardHeroBanner user={user} />
      {user.role === "CLUB_MANAGER" && <ManagerDashboard user={user} />}
      {user.role === "HEAD_TRAINER" && <TrainerDashboard />}
      {user.role === "VETERINARIAN" && <VetDashboard />}
      {user.role === "GROOM" && <GroomDashboard />}
      {user.role === "HORSE_OWNER" && <OwnerDashboard />}
    </div>
  );
}
