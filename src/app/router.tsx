import { Suspense, useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, useParams, useRouteError } from "react-router-dom";
import { tr } from "@/shared/i18n/tr";
import AuditLogPage from "@/features/dashboard/pages/AuditLogPage";
import AccountListPage from "@/features/accounts/pages/AccountListPage";
import StaffDirectoryPage from "@/features/master-data/pages/StaffDirectoryPage";
import HorseListPage from "@/features/horses/pages/HorseListPage";
import HorseDetailPage from "@/features/horses/pages/HorseDetailPage";
import HorseFormPage from "@/features/horses/pages/HorseFormPage";
import DeletedHorsesPage from "@/features/horses/pages/DeletedHorsesPage";
import AcceptInvitePage from "@/features/auth/pages/AcceptInvitePage";
import PermissionMatrix from "@/features/accounts/pages/PermissionMatrix";
import ChangePasswordPage from "@/features/auth/pages/ChangePasswordPage";
import Forbidden403Page from "@/features/auth/pages/Forbidden403Page";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import MyProfilePage from "@/features/auth/pages/MyProfilePage";
import PendingApprovalPage from "@/features/auth/pages/PendingApprovalPage";
import ResetOtpPage from "@/features/auth/pages/ResetOtpPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import SessionExpiredPage from "@/features/auth/pages/SessionExpiredPage";
import SignUpPage from "@/features/auth/pages/SignUpPage";
import VerifyEmailPage from "@/features/auth/pages/VerifyEmailPage";
import ComingSoonPage from "@/features/dashboard/pages/ComingSoonPage";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import NotificationsPage from "@/features/dashboard/pages/NotificationsPage";
import NotificationSettingsPage from "@/features/dashboard/pages/NotificationSettingsPage";
import HorseCatalogPage from "@/features/horses/pages/HorseCatalogPage";
import StableMapPage from "@/features/stable/pages/StableMapPage";
import StallCatalogPage from "@/features/stable/pages/StallCatalogPage";
import SuppliesCatalogPage from "@/features/master-data/pages/SuppliesCatalogPage";
import ShiftCatalogPage from "@/features/master-data/pages/ShiftCatalogPage";
import ShiftRosterPage from "@/features/stable/pages/ShiftRosterPage";
import MealRationsPage from "@/features/stable/pages/MealRationsPage";
import DailyChecklistPage from "@/features/stable/pages/DailyChecklistPage";
import IncidentListPage from "@/features/stable/pages/IncidentListPage";
import InventoryPage from "@/features/stable/pages/InventoryPage";
import RestockRequestsPage from "@/features/stable/pages/RestockRequestsPage";
import {
  MedicalRecordPage,
  RecordListPage,
  RecordDetailPage,
  RecordFormPage,
  InjuryMapPage,
  TrainingLockPage,
  CareSchedulePage,
  HerdHealthPage,
  PlanListPage,
  PlanWizardPage,
  PlanHistoryPage,
  WeeklyCalendarPage,
  TrialRunsPage,
  SessionMetricsPage,
  LiveMonitorPage,
  AlertListPage,
  TrainingOverviewPage,
  PlanDetailPage,
  SessionResultPage,
  FitnessChartPage,
  MyTrainingPage,
  RaceEntryPage,
  RaceResultsPage,
  OwnerFinancialReportsPage,
} from "./lazyPages";
import { AppShell } from "@/shared/components/layout/AppShell";
import { Providers } from "@/shared/components/layout/Providers";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { RoleGuard } from "./RoleGuard";


// BẢNG ROUTE DUY NHẤT của ứng dụng: đường dẫn URL → trang thật nằm trong features/*/pages.
// Thêm màn hình mới = thêm một dòng { path, element } vào đây (xem CONTRIBUTING.md).

// Bắt lỗi phát sinh từ các tuyến đường hoặc xung đột DOM do tiện ích dịch tự động
function RouteErrorBoundary() {
  const error = useRouteError();
  console.error("Route error captured:", error);
  return (
    <div style={{ padding: "4rem 1.5rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <h2 style={{ fontSize: "var(--fs-kpi)", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
        {tr("Unexpected Display Conflict")}
      </h2>
      <p style={{ color: "var(--muted)", maxWidth: 520, margin: 0, fontSize: "var(--fs-body)", lineHeight: 1.6 }}>
        {tr("The browser encountered a DOM reconciliation conflict (often caused by auto-translation extensions). Please reload or navigate back to the dashboard.")}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "0.625rem 1.25rem",
            background: "var(--brand)",
            color: "var(--text-on-brand)",
            border: "none",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {tr("Reload Page")}
        </button>
        <a
          href="/herd"
          style={{
            padding: "0.625rem 1.25rem",
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {tr("Back to Herd Health")}
        </a>
      </div>
    </div>
  );
}

// Bọc mọi trang bằng các provider toàn cục (toast, trạng thái đăng nhập).
function RootLayout() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}

import { SkeletonPage } from "@/shared/components/ui/Skeleton";

// Khung chung của mọi trang SAU đăng nhập: Sidebar + Topbar. Chưa đăng nhập thì AppShell đưa về /login.
function AppLayout() {
  return (
    <AppShell>
      {/* RoleGuard chặn trang khi tài khoản không đủ quyền (hiện 403 ngay tại URL đó). */}
      <RoleGuard>
        {/* Nhóm Y tế và Huấn luyện tải theo route (React.lazy) để file JS đầu tiên nhẹ hơn. */}
        <Suspense fallback={<SkeletonPage />}>
          <Outlet />
        </Suspense>
      </RoleGuard>
    </AppShell>
  );
}

// "/": đã đăng nhập → dashboard; khách → landing tĩnh public/landing.html (trang HTML riêng, không đi qua React).
function HomeRoute() {
  const { status } = useAuth();
  useEffect(() => {
    if (status === "anonymous") window.location.replace("/landing.html");
  }, [status]);
  return status === "authenticated" ? <Navigate to="/dashboard" replace /> : null;
}

// Lấy :id từ URL /accounts/:id/permissions rồi truyền cho trang.
function PermissionMatrixRoute() {
  const { id = "" } = useParams();
  return <PermissionMatrix accountId={id} />;
}

// "Training Progress" trên menu: Xem danh sách tiến độ giáo án & kế hoạch huấn luyện (SC-2.02).
function TrainingProgressRoute() {
  return <PlanListPage />;
}

// Mọi đường dẫn chưa có trang riêng (ngựa, huấn luyện, y tế...). RoleGuard trong AppShell đã kiểm quyền trước đó.
function ComingSoonRoute() {
  const { "*": path = "" } = useParams();
  return <ComingSoonPage slug={path.split("/")[0] ?? ""} />;
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: <HomeRoute /> },

      // ---- Trang công khai (chưa đăng nhập)
      { path: "/login", element: <LoginPage /> },
      { path: "/sign-up", element: <SignUpPage /> },
      { path: "/sign-up/verify", element: <VerifyEmailPage /> },
      { path: "/sign-up/pending", element: <PendingApprovalPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/forgot-password/verify", element: <ResetOtpPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/accept-invite", element: <AcceptInvitePage /> },

      // ---- Trang sau đăng nhập (nằm trong khung AppShell)
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/audit", element: <AuditLogPage /> },
          { path: "/accounts", element: <AccountListPage /> },
          { path: "/accounts/:id/permissions", element: <PermissionMatrixRoute /> },
          { path: "/staff", element: <StaffDirectoryPage /> },
          { path: "/horses", element: <HorseListPage /> },
          { path: "/horses/new", element: <HorseFormPage /> },
          { path: "/horses/deleted", element: <DeletedHorsesPage /> },
          { path: "/horses/:id", element: <HorseDetailPage /> },
          { path: "/horses/:id/edit", element: <HorseFormPage /> },
          { path: "/my-horses", element: <HorseListPage /> },
          { path: "/profile", element: <MyProfilePage /> },
          { path: "/profile/password", element: <ChangePasswordPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/notifications/settings", element: <NotificationSettingsPage /> },
          { path: "/settings/notifications", element: <NotificationSettingsPage /> },
          { path: "/forbidden", element: <Forbidden403Page /> },
          { path: "/session-expired", element: <SessionExpiredPage /> },

          // ---- Phân hệ Y tế & Sức khỏe (Flow 3: P2-01 -> P2-05)
          { path: "/records", element: <RecordListPage /> },
          { path: "/medical/records", element: <RecordListPage /> },
          { path: "/medical/records/new", element: <RecordFormPage /> },
          { path: "/medical/records/:id/edit", element: <RecordFormPage /> },
          { path: "/medical/records/:id", element: <RecordDetailPage /> },
          { path: "/medical/horses/:id", element: <MedicalRecordPage /> },
          { path: "/records/horse/:id", element: <MedicalRecordPage /> },
          { path: "/medical/horses/:id/injuries", element: <InjuryMapPage /> },
          { path: "/injuries/:id", element: <InjuryMapPage /> },
          { path: "/injuries", element: <InjuryMapPage /> },
          { path: "/medical/locks", element: <TrainingLockPage /> },
          { path: "/rx", element: <Navigate to="/records" replace /> },
          { path: "/locks", element: <TrainingLockPage /> },
          { path: "/medical/preventive", element: <CareSchedulePage /> },
          { path: "/catalogs/preventive-types", element: <CareSchedulePage /> },
          { path: "/vaccine", element: <CareSchedulePage /> },
          { path: "/medical/herd", element: <HerdHealthPage /> },
          { path: "/herd", element: <HerdHealthPage /> },

          // ---- Phân hệ Huấn luyện & Giáo án (Flow 2: P2-06 -> P2-09)
          { path: "/training", element: <TrainingOverviewPage /> },
          { path: "/progress", element: <TrainingProgressRoute /> },
          { path: "/training/plans", element: <PlanListPage /> },
          { path: "/plans", element: <PlanListPage /> },
          { path: "/training/plans/new", element: <PlanWizardPage /> },
          { path: "/plans/new", element: <PlanWizardPage /> },
          { path: "/training/plans/:id", element: <PlanDetailPage /> },
          { path: "/plans/:id", element: <PlanDetailPage /> },
          { path: "/training/plans/:id/edit", element: <PlanWizardPage /> },
          { path: "/training/plans/history", element: <PlanHistoryPage /> },
          { path: "/training/sessions/:id/result", element: <SessionResultPage /> },
          { path: "/horses/:id/fitness", element: <FitnessChartPage /> },
          { path: "/my-training", element: <MyTrainingPage /> },
          { path: "/my/training", element: <MyTrainingPage /> },
          { path: "/training/calendar", element: <WeeklyCalendarPage /> },
          { path: "/training/schedule", element: <WeeklyCalendarPage /> },
          { path: "/calendar", element: <WeeklyCalendarPage /> },
          { path: "/training/trials", element: <TrialRunsPage /> },
          { path: "/trials", element: <TrialRunsPage /> },
          { path: "/training/metrics", element: <SessionMetricsPage /> },
          { path: "/metrics", element: <SessionMetricsPage /> },
          { path: "/training/monitor", element: <LiveMonitorPage /> },
          { path: "/monitor", element: <LiveMonitorPage /> },
          { path: "/training/alerts", element: <AlertListPage /> },
          { path: "/alerts", element: <AlertListPage /> },

          // ---- Phân hệ Chuồng trại (Flow 4 & P1-09)
          { path: "/stables/map", element: <StableMapPage /> },
          { path: "/stalls", element: <StableMapPage /> },
          { path: "/catalogs/stalls", element: <StallCatalogPage /> },
          { path: "/catalogs/breeds", element: <HorseCatalogPage /> },
          { path: "/catalogs/supplies", element: <SuppliesCatalogPage /> },
          { path: "/catalog", element: <Navigate to="/catalogs/supplies" replace /> },
          { path: "/catalogs/shifts", element: <ShiftCatalogPage /> },
          { path: "/stable/shifts", element: <ShiftRosterPage /> },
          { path: "/shifts", element: <Navigate to="/stable/shifts" replace /> },
          { path: "/rations", element: <MealRationsPage /> },
          { path: "/stable/rations", element: <Navigate to="/rations" replace /> },
          { path: "/stable/meals", element: <Navigate to="/rations" replace /> },
          { path: "/tasks", element: <DailyChecklistPage /> },
          { path: "/checklist", element: <Navigate to="/tasks" replace /> },
          { path: "/stable/tasks", element: <Navigate to="/tasks" replace /> },
          { path: "/incidents", element: <IncidentListPage /> },
          { path: "/stable/incidents", element: <Navigate to="/incidents" replace /> },

          // ---- Phân hệ Vật tư & Tồn kho khu chuồng (Flow 4: Phase 4)
          { path: "/supplies/inventory", element: <InventoryPage /> },
          { path: "/inventory", element: <Navigate to="/supplies/inventory" replace /> },
          { path: "/supplies", element: <Navigate to="/supplies/inventory" replace /> },
          { path: "/supplies/requests", element: <RestockRequestsPage /> },
          { path: "/restock-requests", element: <Navigate to="/supplies/requests" replace /> },

          // ---- Phân hệ Thi đấu & Giải đua (Flow 5: SC-5.01 -> SC-5.04)
          { path: "/races", element: <RaceEntryPage /> },
          { path: "/races/results", element: <RaceResultsPage /> },
          { path: "/racing", element: <RaceEntryPage /> },

          // ---- Phân hệ Tài chính & Quyết toán (Flow 5: SC-5.05 -> SC-5.06)
          { path: "/financial-reports", element: <OwnerFinancialReportsPage /> },
          { path: "/owner/financial-reports", element: <OwnerFinancialReportsPage /> },
          { path: "/invoices", element: <OwnerFinancialReportsPage /> },

          { path: "*", element: <ComingSoonRoute /> },
        ],
      },
    ],
  },
]);

