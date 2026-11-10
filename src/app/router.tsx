import { Suspense, useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, useParams, useRouteError } from "react-router-dom";
import { tr } from "@/shared/i18n/tr";
import styles from "./RouteErrorBoundary.module.css";
import AcceptInvitePage from "@/features/auth/pages/AcceptInvitePage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import Forbidden403Page from "@/features/auth/pages/Forbidden403Page";
import PendingApprovalPage from "@/features/auth/pages/PendingApprovalPage";
import ResetOtpPage from "@/features/auth/pages/ResetOtpPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import SignUpPage from "@/features/auth/pages/SignUpPage";
import VerifyEmailPage from "@/features/auth/pages/VerifyEmailPage";
import {
  AuditLogPage,
  AccountListPage,
  StaffDirectoryPage,
  HorseListPage,
  HorseDetailPage,
  HorseFormPage,
  DeletedHorsesPage,
  PermissionMatrix,
  ChangePasswordPage,
  MyProfilePage,
  SessionExpiredPage,
  ComingSoonPage,
  DashboardPage,
  NotificationsPage,
  AssistantPage,
  NotificationSettingsPage,
  HorseCatalogPage,
  StableMapPage,
  StallCatalogPage,
  SuppliesCatalogPage,
  ShiftCatalogPage,
  ShiftRosterPage,
  MealRationsPage,
  DailyChecklistPage,
  IncidentListPage,
  InventoryPage,
  RestockRequestsPage,
  MedicalRecordPage,
  RecordListPage,
  RecordDetailPage,
  RecordFormPage,
  InjuryMapPage,
  TrainingLockPage,
  CareSchedulePage,
  HerdHealthPage,
  OwnerHealthPage,
  HealthReportPage,
  PlanListPage,
  PlanWizardPage,
  PlanHistoryPage,
  WeeklyCalendarPage,
  TrialRunsPage,
  SessionMetricsPage,
  LiveMonitorPage,
  AlertListPage,
  TrainingOverviewPage,
  PerformanceReportPage,
  PlanDetailPage,
  SessionResultPage,
  FitnessChartPage,
  MyTrainingPage,
  RaceEntryPage,
  RaceResultsPage,
  RaceRecordPage,
  OwnerFinancialReportsPage,
  CostReportPage,
} from "./lazyPages";
import { AppShell } from "@/shared/components/layout/AppShell";
import { Providers } from "@/shared/components/layout/Providers";
import { RoleGuard } from "./RoleGuard";


// BẢNG ROUTE DUY NHẤT của ứng dụng: đường dẫn URL → trang thật nằm trong features/*/pages.
// Thêm màn hình mới = thêm một dòng { path, element } vào đây (xem CONTRIBUTING.md).

// Bắt lỗi phát sinh từ các tuyến đường hoặc xung đột DOM do tiện ích dịch tự động
function RouteErrorBoundary() {
  const error = useRouteError();
  console.error("Route error captured:", error);
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>TMEC</p>
        <h1>{tr("This page could not be displayed.")}</h1>
        <p>{tr("Please reload the page or return to your workspace.")}</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => window.location.reload()}>{tr("Reload Page")}</button>
          <a href="/dashboard">{tr("Back to my workspace")}</a>
        </div>
      </section>
    </main>
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
        {/* Các màn hình workspace tải theo route để giảm mã tải ban đầu. */}
        <Suspense fallback={<SkeletonPage />}>
          <Outlet />
        </Suspense>
      </RoleGuard>
    </AppShell>
  );
}

// "/": đã đăng nhập → dashboard; khách → landing tĩnh public/landing.html (trang HTML riêng, không đi qua React).
// Vào FE luôn mở landing trước; nút Đăng nhập trên landing đưa người đã đăng nhập thẳng vào /dashboard.
function HomeRoute() {
  useEffect(() => {
    window.location.replace("/landing.html");
  }, []);
  return null;
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
          { path: "/assistant", element: <AssistantPage /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/notifications/settings", element: <NotificationSettingsPage /> },
          { path: "/settings/notifications", element: <NotificationSettingsPage /> },
          { path: "/forbidden", element: <Forbidden403Page /> },
          { path: "/session-expired", element: <SessionExpiredPage /> },

          // ---- Phân hệ Y tế & Sức khỏe (Flow 3: P2-01 -> P2-05)
          { path: "/medical", element: <Navigate to="/records" replace /> },
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
          { path: "/health", element: <OwnerHealthPage /> },
          { path: "/health-report", element: <HealthReportPage /> },

          // ---- Phân hệ Huấn luyện & Giáo án (Flow 2: P2-06 -> P2-09)
          { path: "/training", element: <TrainingOverviewPage /> },
          { path: "/performance", element: <PerformanceReportPage /> },
          { path: "/training/performance", element: <PerformanceReportPage /> },
          { path: "/progress", element: <TrainingProgressRoute /> },
          { path: "/training/plans", element: <PlanListPage /> },
          { path: "/plans", element: <PlanListPage /> },
          { path: "/training/plans/new", element: <PlanWizardPage /> },
          { path: "/plans/new", element: <PlanWizardPage /> },
          { path: "/training/plans/:id", element: <PlanDetailPage /> },
          { path: "/plans/:id", element: <PlanDetailPage /> },
          { path: "/training/plans/:id/edit", element: <PlanWizardPage /> },
          { path: "/training/plans/history", element: <Navigate to="/training/plans?status=COMPLETED" replace /> },
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
          { path: "/training/results", element: <SessionMetricsPage /> },
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
          { path: "/race-record", element: <RaceRecordPage /> },
          { path: "/racing", element: <RaceEntryPage /> },

          // ---- Phân hệ Tài chính & Quyết toán (Flow 5: SC-5.05 -> SC-5.06)
          { path: "/financial-reports", element: <OwnerFinancialReportsPage /> },
          { path: "/costs", element: <CostReportPage /> },
          { path: "/owner/financial-reports", element: <OwnerFinancialReportsPage /> },
          { path: "/invoices", element: <OwnerFinancialReportsPage /> },

          { path: "*", element: <ComingSoonPage /> },
        ],
      },
    ],
  },
]);

