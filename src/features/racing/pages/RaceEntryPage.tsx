import { useTranslation as useScreenTranslation } from "react-i18next";
import { Icon } from "@/shared/components/ui/Icon";
import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./RaceEntryPage.module.css";
import { Card } from "@/shared/components/ui/Card";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { DataTable, CellPrimary, type Column } from "@/shared/components/ui/DataTable";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { Menu, type MenuItem } from "@/shared/components/ui/Menu";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Pagination } from "@/shared/components/ui/Pagination";
import { cx } from "@/shared/lib/cx";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { tr, isVietnamese, localizeServerText } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { messageFor } from "@/shared/lib/messages";
import { formatDate, vndUnit, formatCurrency, formatVND, formatNumber } from "@/shared/lib/format";

const TOURNAMENT_STATUS_LABEL: Record<string, string> = {
  UPCOMING: "Sắp diễn ra",
  OPEN_REGISTRATION: "Đang mở đăng ký",
  CLOSED_REGISTRATION: "Đã đóng đăng ký",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

const TOURNAMENT_STATUS_LABEL_EN: Record<string, string> = {
  UPCOMING: "Upcoming",
  OPEN_REGISTRATION: "Open for Registration",
  CLOSED_REGISTRATION: "Registration Closed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function getTournamentStatusLabel(status: string) {
  return isVietnamese()
    ? (TOURNAMENT_STATUS_LABEL[status] ?? status)
    : (TOURNAMENT_STATUS_LABEL_EN[status] ?? status);
}

function getTournamentStatusTone(status: string): "ok" | "neutral" | "info" | "warn" | "danger" {
  switch (status) {
    case "OPEN_REGISTRATION":
      return "ok";
    case "COMPLETED":
      return "neutral";
    case "UPCOMING":
      return "info";
    case "CLOSED_REGISTRATION":
      return "warn";
    default:
      return "danger";
  }
}

function getDraftBadgeText(kind: ReturnType<typeof summarizeDraftResults>["kind"], isVi: boolean): string {
  if (kind === "SIMULATOR_2D") return isVi ? "Đã chạy mô phỏng 2D" : "2D Simulated";
  if (kind === "QUICK_SIM") return isVi ? "Đã lấy kết quả nhanh" : "Quick Simulated";
  return isVi ? "Đã có bản nháp" : "Draft Saved";
}

function getSurfaceShortLabel(trackType: string, isVi: boolean): string {
  switch (trackType) {
    case "TURF":
      return isVi ? "Mặt cỏ (Turf)" : "Turf";
    case "DIRT":
      return isVi ? "Đường cát (Dirt)" : "Dirt";
    case "SYNTHETIC":
      return isVi ? "Tổng hợp" : "Synthetic";
    default:
      return trackType;
  }
}

import { useNavigate } from "react-router-dom";
import { useToast } from "@/shared/components/ui/Toast";
import {
  fetchTournaments,
  createTournament,
  updateTournament,
  changeTournamentStatus,
  deleteTournament,
  startTournamentSimulation,
  quickSimulateTournamentRace,
} from "../api";
import type { Tournament } from "../types";
import { summarizeDraftResults } from "../resultDraftSummary";
import { TournamentModal } from "../components/TournamentModal";
import { RaceRegistrationModal } from "../components/RaceRegistrationModal";
import { RecordResultsModal } from "../components/RecordResultsModal";

export default function RaceEntryPage() {
  useScreenTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { isVietnamese: isVi } = useAppLanguage();
  const locale = isVi ? "vi-VN" : "en-US";
  const user = useCurrentUser();
  const isClubManager = user.role === "CLUB_MANAGER";
  const isTrainer = user.role === "HEAD_TRAINER";
  const isOwner = user.role === "HORSE_OWNER";
  const canManage = isClubManager || isTrainer;

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [quickSimulatingId, setQuickSimulatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const PAGE_SIZE = 10;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [registeringTournament, setRegisteringTournament] = useState<Tournament | null>(null);
  const [resultsTournament, setResultsTournament] = useState<Tournament | null>(null);

  // In-app Confirmation Modals (Replacing browser window.confirm alerts)
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Tournament | null>(null);
  const [closeTarget, setCloseTarget] = useState<Tournament | null>(null);
  const [openRegTarget, setOpenRegTarget] = useState<Tournament | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);
  const loadData = reload;
  const launchedSimRef = useRef<{
    tournamentId: string;
    tournamentName: string;
    prevSignature: string;
  } | null>(null);
  const lastSimSyncRef = useRef(0);

  // Tự động đồng bộ card giải đấu & thông báo khi người dùng quay về từ tab Simulator 2D
  useEffect(() => {
    if (resultsTournament !== null) return;
    const syncFromSimulator = () => {
      const pending = launchedSimRef.current;
      if (!pending || document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastSimSyncRef.current < 800) return;
      lastSimSyncRef.current = now;

      fetchTournaments({
        status: statusFilter,
        search: searchTerm,
        limit: 100,
      })
        .then((res) => {
          setTournaments(res.items);
          const updated = res.items.find((t) => t.id === pending.tournamentId);
          if (!updated) return;
          const nextSummary = summarizeDraftResults(updated.registrations);
          if (
            nextSummary.kind !== "NONE" &&
            nextSummary.signature !== pending.prevSignature
          ) {
            launchedSimRef.current = null;
            toast.show(
              isVietnamese()
                ? `Đã chạy xong mô phỏng 2D cho giải "${pending.tournamentName}" (${nextSummary.recordedCount}/${nextSummary.activeCount} ngựa)! Hệ thống đã tự động nhập số liệu vào bản nháp — bấm "Ghi nhận & Chốt kết quả" để kiểm tra và khóa chính thức.`
                : `2D simulation completed for "${pending.tournamentName}" (${nextSummary.recordedCount}/${nextSummary.activeCount} entries)! Draft results were imported — click "Record & Lock Results" to review.`,
              "ok",
              { durationMs: 6500 },
            );
          }
        })
        .catch(() => {
          // Bỏ qua lỗi mạng thoáng qua khi tự động đồng bộ lại danh sách
        });
    };
    window.addEventListener("focus", syncFromSimulator);
    document.addEventListener("visibilitychange", syncFromSimulator);
    return () => {
      window.removeEventListener("focus", syncFromSimulator);
      document.removeEventListener("visibilitychange", syncFromSimulator);
    };
  }, [resultsTournament, statusFilter, searchTerm, toast]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchTournaments({
      status: statusFilter,
      search: searchTerm,
      limit: 100,
    })
      .then((res) => {
        if (active) {
          setTournaments(res.items);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(messageFor(err));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [statusFilter, searchTerm, refreshKey]);

  // KPIs
  const totalTournaments = tournaments.length;
  const openCount = tournaments.filter((t) => t.status === "OPEN_REGISTRATION").length;
  const totalPrize = tournaments.reduce((acc, t) => acc + (t.prizePool || 0), 0);
  const totalRegisteredHorses = tournaments.reduce(
    (acc, t) => acc + (t.registeredCount ?? t.registrations?.length ?? 0),
    0,
  );

  async function handleCreateOrEdit(data: Partial<Tournament>) {
    if (editingTournament) {
      await updateTournament(editingTournament.id, data);
    } else {
      await createTournament(data);
    }
    await loadData();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      await deleteTournament(deleteTarget.id);
      const targetId = deleteTarget.id;
      setDeleteTarget(null);
      setTournaments((prev) => prev.filter((t) => t.id !== targetId));
    } catch (err) {
      console.error("Failed to delete tournament", err);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setActionBusy(true);
    try {
      await changeTournamentStatus(cancelTarget.id, "CANCELLED");
      const targetId = cancelTarget.id;
      setCancelTarget(null);
      setTournaments((prev) =>
        prev
          .map((t) => (t.id === targetId ? { ...t, status: "CANCELLED" as const } : t))
          .filter((t) => statusFilter === "ALL" || t.status === statusFilter),
      );
    } catch (err) {
      console.error("Failed to cancel tournament", err);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmClose() {
    if (!closeTarget) return;
    setActionBusy(true);
    try {
      await changeTournamentStatus(closeTarget.id, "CLOSED_REGISTRATION");
      const targetId = closeTarget.id;
      setCloseTarget(null);
      setTournaments((prev) =>
        prev
          .map((t) => (t.id === targetId ? { ...t, status: "CLOSED_REGISTRATION" as const } : t))
          .filter((t) => statusFilter === "ALL" || t.status === statusFilter),
      );
    } catch (err) {
      console.error("Failed to close tournament registration", err);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmOpenReg() {
    if (!openRegTarget) return;
    setActionBusy(true);
    try {
      await changeTournamentStatus(openRegTarget.id, "OPEN_REGISTRATION");
      const targetId = openRegTarget.id;
      setOpenRegTarget(null);
      setTournaments((prev) =>
        prev
          .map((t) => (t.id === targetId ? { ...t, status: "OPEN_REGISTRATION" as const } : t))
          .filter((t) => statusFilter === "ALL" || t.status === statusFilter),
      );
    } catch (err) {
      console.error("Failed to open tournament registration", err);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleLaunchSimulator(tourney: Tournament) {
    setSimulatingId(tourney.id);
    const existingDraft = summarizeDraftResults(tourney.registrations);
    try {
      const res = await startTournamentSimulation(tourney.id);
      launchedSimRef.current = {
        tournamentId: tourney.id,
        tournamentName: tourney.name,
        prevSignature: existingDraft.signature,
      };
      window.open(res.launchUrl, "_blank");
      toast.show(
        existingDraft.kind !== "NONE"
          ? isVietnamese()
            ? `Đã mở trường đua 2D (${tourney.distanceMeters}m). Lưu ý: giải này đang có bản nháp (${existingDraft.recordedCount}/${existingDraft.activeCount} ngựa) — khi cuộc đua 2D mới hoàn tất, số liệu mới sẽ tự động cập nhật thay thế.`
            : `Launched 2D race simulation (${tourney.distanceMeters}m). Note: existing draft (${existingDraft.recordedCount}/${existingDraft.activeCount} entries) will be updated automatically upon completion.`
          : isVietnamese()
            ? `Đã khởi tạo phiên đua mô phỏng 6 làn (${tourney.distanceMeters}m). Kết quả và thời gian thi đấu sẽ tự động đồng bộ vào giải đấu khi chặng đua kết thúc!`
            : `Launched 6-lane race simulation (${tourney.distanceMeters}m). Results will auto-sync to this tournament upon completion!`,
        "ok",
        { durationMs: 6000 },
      );
    } catch (err: any) {
      toast.show(
        localizeServerText(err?.message) || (isVietnamese() ? "Không thể khởi động mô phỏng giải đấu" : "Failed to launch simulation"),
        "danger",
      );
    } finally {
      setSimulatingId(null);
    }
  }

  async function handleQuickSimulate(tourney: Tournament) {
    setQuickSimulatingId(tourney.id);
    try {
      await quickSimulateTournamentRace(tourney.id);
      toast.show(
        isVietnamese()
          ? "Đã lấy kết quả đua nhanh từ Simulator và tự động chia thưởng dự kiến! Bạn có thể kiểm tra hoặc chỉnh sửa số liệu thực tế trước khi Chốt."
          : "Quick race results loaded from Simulator with auto-distributed prizes! Review or edit before locking.",
        "ok",
      );
      setRefreshKey((k) => k + 1);
      setResultsTournament(tourney);
    } catch (err: any) {
      toast.show(
        localizeServerText(err?.message) || (isVietnamese() ? "Không thể lấy kết quả đua nhanh từ Simulator" : "Failed to load quick race results"),
        "danger",
      );
    } finally {
      setQuickSimulatingId(null);
    }
  }

  const filtered = tournaments.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.location.toLowerCase().includes(term) ||
      (t.code ?? "").toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTournaments = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function getTournamentMenuItems(tourney: Tournament, registeredCount: number): MenuItem[] {
    const isCompleted = tourney.status === "COMPLETED";
    const isClosedReg = tourney.status === "CLOSED_REGISTRATION";
    const isCancelled = tourney.status === "CANCELLED";
    const simBusy = simulatingId === tourney.id || quickSimulatingId === tourney.id;
    const items: MenuItem[] = [
      {
        label: isVi ? "Mở mô phỏng 2D" : "Run 2D Simulation",
        icon: "play",
        hidden: !(canManage && isClosedReg && registeredCount > 0),
        disabledReason: simBusy ? (isVi ? "Đang xử lý mô phỏng..." : "Simulation in progress...") : undefined,
        onSelect: () => handleLaunchSimulator(tourney),
      },
      {
        label: isVi ? "Lấy kết quả nhanh" : "Quick Result Import",
        icon: "zap",
        hidden: !(canManage && isClosedReg && registeredCount > 0),
        disabledReason: simBusy ? (isVi ? "Đang xử lý mô phỏng..." : "Simulation in progress...") : undefined,
        onSelect: () => handleQuickSimulate(tourney),
      },
      {
        label: isVi ? "Quản lý danh sách ngựa" : tr("Manage Entries / Scratch"),
        icon: "users",
        hidden: !(canManage && isClosedReg && registeredCount > 0),
        onSelect: () => setRegisteringTournament(tourney),
      },
      {
        label: isVi ? "Báo cáo tài chính & Quyết toán" : "Financial Reports",
        icon: "chart",
        hidden: !(isClubManager && isCompleted && registeredCount > 0),
        onSelect: () => navigate("/financial-reports"),
      },
      {
        label: tr("Edit Tournament"),
        icon: "edit",
        hidden: !(isClubManager && !isCancelled && !isCompleted),
        onSelect: () => setEditingTournament(tourney),
      },
      {
        label: isVi ? "Đóng đăng ký" : tr("Close Registration"),
        icon: "lock",
        hidden: !(isClubManager && tourney.status === "OPEN_REGISTRATION"),
        onSelect: () => setCloseTarget(tourney),
      },
      {
        label: isVi ? "Hủy giải" : tr("Cancel Event"),
        icon: "ban",
        danger: true,
        divider: true,
        hidden: !(isClubManager && !isCompleted && !isCancelled),
        onSelect: () => setCancelTarget(tourney),
      },
      {
        label: isVi ? "Xóa giải" : tr("Delete Unused Event"),
        icon: "trash",
        danger: true,
        hidden: !(
          isClubManager &&
          registeredCount === 0 &&
          (tourney.status === "UPCOMING" || tourney.status === "OPEN_REGISTRATION")
        ),
        onSelect: () => setDeleteTarget(tourney),
      },
    ];
    return items.filter((item) => !item.hidden);
  }

  function renderPrimaryTableAction(tourney: Tournament, registeredCount: number) {
    if ((isTrainer || isOwner) && tourney.status === "OPEN_REGISTRATION") {
      return (
        <Button size="sm" tone="primary" onClick={() => setRegisteringTournament(tourney)}>
          {isVi ? "Đăng ký" : "Register"}
        </Button>
      );
    }
    if (isClubManager && tourney.status === "UPCOMING") {
      return (
        <Button size="sm" tone="primary" onClick={() => setOpenRegTarget(tourney)}>
          {isVi ? "Mở ĐK" : "Open Reg"}
        </Button>
      );
    }
    if (isClubManager && tourney.status === "CLOSED_REGISTRATION" && registeredCount > 0) {
      return (
        <Button size="sm" tone="primary" onClick={() => setResultsTournament(tourney)}>
          {isVi ? "Ghi KQ" : "Record"}
        </Button>
      );
    }
    if (registeredCount > 0 && tourney.status === "COMPLETED") {
      return (
        <Button size="sm" tone="secondary" onClick={() => setResultsTournament(tourney)}>
          {isVi ? "Xem KQ" : "Results"}
        </Button>
      );
    }
    return null;
  }

  const columns: Column<Tournament>[] = [
    {
      key: "tournament",
      header: isVi ? "Giải đua" : "Tournament",
      render: (tourney) => {
        const draftSummary = summarizeDraftResults(tourney.registrations);
        const podium =
          tourney.status === "COMPLETED" && tourney.registrations
            ? tourney.registrations
                .filter((r) => r.result)
                .sort((a, b) => (a.result?.finalRank ?? 99) - (b.result?.finalRank ?? 99))
                .slice(0, 3)
            : [];
        const subLine =
          podium.length > 0
            ? podium
                .map((r) => `#${r.result?.finalRank} ${r.horse?.name ?? "—"}`)
                .join(" · ")
            : tourney.status === "CLOSED_REGISTRATION" && draftSummary.kind !== "NONE"
              ? `${getDraftBadgeText(draftSummary.kind, isVi)} (${draftSummary.recordedCount}/${draftSummary.activeCount})`
              : undefined;

        return (
          <div style={{ minWidth: 210 }}>
            <CellPrimary
              title={tourney.name}
              meta={tourney.code ? `${tourney.code} · ${tourney.location}` : tourney.location}
              sub={subLine}
            />
          </div>
        );
      },
    },
    {
      key: "schedule",
      header: isVi ? "Ngày thi đấu" : "Schedule",
      render: (tourney) => (
        <div style={{ display: "grid", gap: 2 }}>
          <span className="num nowrap" style={{ fontWeight: 600 }}>
            {formatDate(tourney.raceDate)}
          </span>
          <span className="num nowrap" style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>
            {isVi ? "Hạn ĐK:" : "Reg:"} {formatDate(tourney.registrationDeadline)}
          </span>
        </div>
      ),
    },
    {
      key: "specs",
      header: isVi ? "Cự ly & Sân" : "Specs",
      render: (tourney) => (
        <div style={{ display: "grid", gap: 2 }}>
          <span className="num nowrap" style={{ fontWeight: 600 }}>
            {tourney.distanceMeters}m
          </span>
          <span
            className="nowrap"
            title={tr(tourney.trackType)}
            style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}
          >
            {getSurfaceShortLabel(tourney.trackType, isVi)}
          </span>
        </div>
      ),
    },
    {
      key: "prizePool",
      header: tr("Purse Pool"),
      align: "right",
      render: (tourney) => (
        <strong className="num nowrap" style={{ color: "var(--brand-700)" }}>
          {formatVND(tourney.prizePool)}
        </strong>
      ),
    },
    {
      key: "entries",
      header: isVi ? "Ngựa ĐK" : "Entries",
      align: "right",
      render: (tourney) => {
        const registeredCount = tourney.registeredCount ?? tourney.registrations?.length ?? 0;
        return (
          <span className="num nowrap">
            <strong>{registeredCount}</strong>
            {tourney.maxFieldSize ? ` / ${tourney.maxFieldSize}` : ""}
          </span>
        );
      },
    },
    {
      key: "status",
      header: tr("Status"),
      render: (tourney) => {
        const draftSummary = summarizeDraftResults(tourney.registrations);
        const hasDraft = draftSummary.kind !== "NONE" && tourney.status !== "COMPLETED";
        return (
          <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <Badge tone={getTournamentStatusTone(tourney.status)}>
              {getTournamentStatusLabel(tourney.status)}
            </Badge>
            {hasDraft && (
              <Badge tone={draftSummary.kind === "MANUAL" ? "info" : "ok"}>
                {getDraftBadgeText(draftSummary.kind, isVi)}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (tourney) => {
        const registeredCount = tourney.registeredCount ?? tourney.registrations?.length ?? 0;
        const primaryAction = renderPrimaryTableAction(tourney, registeredCount);
        const menuItems = getTournamentMenuItems(tourney, registeredCount);
        if (!primaryAction && menuItems.length === 0) {
          return <span style={{ color: "var(--muted)" }}>—</span>;
        }
        return (
          <div className={styles.rowActions}>
            {primaryAction}
            {menuItems.length > 0 && (
              <Menu
                label={isVi ? `Thao tác cho ${tourney.name}` : `Actions for ${tourney.name}`}
                items={menuItems}
              />
            )}
          </div>
        );
      },
    },
  ];

  const emptyStateNode = (
    <EmptyState
      icon="trophy"
      title={tr("No Tournaments Found")}
      description={tr("No championship events match your current filter parameters.")}
      action={
        isClubManager ? (
          <Button tone="primary" onClick={() => setIsCreateOpen(true)}>
            + {tr("Create New Tournament")}
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={tr("Tournaments & Entries")}
        description={tr(
          "Tournament schedule, horse eligibility screening, and race registrations.",
        )}
        action={
          isClubManager ? (
            <Button tone="primary" onClick={() => setIsCreateOpen(true)}>
              + {tr("Create Tournament")}
            </Button>
          ) : undefined
        }
      />

      {/* KPI Tiles */}
      <div className={styles.metrics}>
        <KpiTile
          label={tr("Championship Tournaments")}
          value={loading || error ? "—" : String(totalTournaments)}
          caption={tr("Events in the current results")}
        />
        <KpiTile
          label={tr("Registration Open")}
          value={loading || error ? "—" : String(openCount)}
          caption={tr("Actively recruiting club horses")}
          accent={openCount > 0}
        />
        <KpiTile
          label={tr("Total Prize Pool")}
          value={loading || error ? "—" : formatCurrency(totalPrize)}
          unit="VND"
          caption={tr("Purse in the current results")}
        />
        <KpiTile
          label={tr("Enrolled Horses")}
          value={loading || error ? "—" : String(totalRegisteredHorses)}
          caption={tr("Entries in the current results")}
        />
      </div>

      {/* Status Guide Accordion / Information Card */}
      <div className={styles.guide}>
        <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>ℹ️</span> {isVietnamese() ? "Giải thích trạng thái giải đấu & Quy trình đăng ký:" : tr("Tournament Status & Registration Process:")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "0.75rem", marginTop: "0.5rem" }}>
          <div>
            <strong style={{ color: "var(--info, #3b82f6)" }}>• {isVietnamese() ? "Sắp diễn ra (Upcoming):" : "Upcoming:"}</strong>{" "}
            {isVietnamese()
              ? "Giải đấu đã được công bố trên lịch thi đấu nhưng chưa mở nhận hồ sơ. Huấn luyện viên theo dõi điều lệ và cự ly để lên kế hoạch chuẩn bị."
              : tr("Tournament is scheduled on the calendar but registration is not open yet.")}
          </div>
          <div>
            <strong style={{ color: "var(--brand-700)" }}>• {isVietnamese() ? "Đang mở đăng ký (Open for Registration):" : "Open for Registration:"}</strong>{" "}
            {isVietnamese()
              ? "Cổng nộp hồ sơ đang mở để tiếp nhận chiến mã đủ điều kiện tham gia tranh tài."
              : tr("Registration is open for eligible horses to enter the event.")}
          </div>
          <div>
            <strong style={{ color: "var(--text-muted)" }}>• {isVietnamese() ? "Đã hoàn thành (Completed):" : "Completed:"}</strong>{" "}
            {isVietnamese()
              ? "Giải đấu đã hoàn tất thi đấu. Bấm 'Xem kết quả' để xem bảng xếp hạng thứ tự, thời gian chạy và giải thưởng được ghi nhận."
              : tr("Race finished. Click 'View Results' to inspect final rankings, finish times, and prize money.")}
          </div>
          <div>
            <strong style={{ color: "var(--danger, #ef4444)" }}>• {isVietnamese() ? "Đã hủy (Cancelled):" : "Cancelled:"}</strong>{" "}
            {isVietnamese()
              ? "Giải bị hủy tổ chức. Hồ sơ giải đấu và danh sách ngựa đăng ký được lưu trữ an toàn tại tab 'Đã hủy' để phục vụ kiểm toán (trạng thái hủy là cuối cùng, không thể mở lại)."
              : tr("Event cancelled. Safely archived under 'Cancelled' tab for audit history (cancellation is terminal and cannot be reopened).")}
          </div>
        </div>
      </div>

      {/* Filter, View Mode Toggle, and Table / Card List */}
      <Card pad={0}>
        <div className={styles.toolbarWrap}>
          <div className={styles.statusStrip}>
            <Tabs
              items={[
                { id: "ALL", label: tr("All Events") },
                { id: "OPEN_REGISTRATION", label: tr("Open for Registration") },
                { id: "UPCOMING", label: tr("Upcoming") },
                { id: "CLOSED_REGISTRATION", label: isVietnamese() ? "Đã đóng đăng ký" : tr("Registration Closed") },
                { id: "COMPLETED", label: tr("Completed") },
                { id: "CANCELLED", label: tr("Cancelled") },
              ]}
              active={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className={styles.mainBar}>
            <div className={styles.searchBar}>
              <input
                type="text"
                aria-label={tr("Search by name or location...")}
                placeholder={tr("Search by name or location...")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadData();
                }}
                style={{
                  padding: "0.5rem 0.875rem",
                  borderRadius: "var(--r-sm, 6px)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  fontSize: "var(--fs-sm)",
                  width: "min(240px, 100%)",
                }}
              />
              <Button tone="secondary" onClick={() => loadData()}>
                {tr("Filter")}
              </Button>
            </div>

            <div className={styles.toolbarActions}>
              <div
                className={styles.viewToggle}
                role="group"
                aria-label={isVi ? "Chế độ hiển thị" : "View mode"}
              >
                <button
                  type="button"
                  className={cx(styles.viewBtn, viewMode === "table" && styles.viewBtnActive)}
                  aria-pressed={viewMode === "table"}
                  onClick={() => setViewMode("table")}
                >
                  <Icon name="list" size={14} />
                  <span>{tr("Table")}</span>
                </button>
                <button
                  type="button"
                  className={cx(styles.viewBtn, viewMode === "cards" && styles.viewBtnActive)}
                  aria-pressed={viewMode === "cards"}
                  onClick={() => setViewMode("cards")}
                >
                  <Icon name="grid" size={14} />
                  <span>{tr("Cards")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === "table" && (
          error ? (
            <div style={{ padding: "16px 20px 20px", borderTop: "1px solid var(--border)" }}>
              <Alert
                tone="danger"
                title={tr("Could not load data")}
                action={
                  <Button tone="secondary" onClick={loadData}>
                    {tr("Try again")}
                  </Button>
                }
              >
                {error}
              </Alert>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <DataTable
                  caption={tr("Tournaments & Entries")}
                  columns={columns}
                  rows={paginatedTournaments}
                  rowKey={(t) => t.id}
                  loading={loading}
                  pageSize={PAGE_SIZE}
                  empty={emptyStateNode}
                />
              </div>
              {!loading && filtered.length > PAGE_SIZE && (
                <Pagination
                  page={safePage}
                  pageSize={PAGE_SIZE}
                  total={filtered.length}
                  noun="tournaments"
                  onPage={setCurrentPage}
                />
              )}
            </>
          )
        )}
      </Card>

      {/* Tournaments Card Grid (10 items / page) */}
      {viewMode === "cards" && (
        loading ? (
          <Card pad={32}>
            <div style={{ textAlign: "center", color: "var(--muted)" }}>{tr("Loading tournaments...")}</div>
          </Card>
        ) : error ? (
          <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={loadData}>{tr("Try again")}</Button>}>
            {error}
          </Alert>
        ) : filtered.length === 0 ? (
          <Card pad={32}>{emptyStateNode}</Card>
        ) : (
          <div className={styles.events}>
          {paginatedTournaments.map((tourney) => {
            const registeredCount = tourney.registeredCount ?? tourney.registrations?.length ?? 0;
            const isCompleted = tourney.status === "COMPLETED";
            const isOpenReg = tourney.status === "OPEN_REGISTRATION";
            const isClosedReg = tourney.status === "CLOSED_REGISTRATION";
            const draftSummary = summarizeDraftResults(tourney.registrations);
            const hasSimResults = draftSummary.kind !== "NONE";

            return (
              <Card key={tourney.id} pad={20}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%", justifyContent: "space-between" }}>
                  <div>
                    {/* Header */}
                    <div className={styles.eventHeading}>
                      <div className={styles.eventTitle}>
                        <h3 style={{ margin: 0, fontSize: "var(--fs-kpi, 1.125rem)", fontWeight: 700, color: "var(--ink)" }}>
                          {tourney.name}
                        </h3>
                        <p style={{ margin: "4px 0 0 0", fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>
                          {tourney.location}
                        </p>
                      </div>
                      <div className={styles.eventHeaderActions}>
                        <Badge tone={getTournamentStatusTone(tourney.status)}>
                          {getTournamentStatusLabel(tourney.status)}
                        </Badge>
                        {hasSimResults && !isCompleted && (
                          <Badge tone={draftSummary.kind === "MANUAL" ? "info" : "ok"}>
                            {getDraftBadgeText(draftSummary.kind, isVi)}
                          </Badge>
                        )}
                        {isClubManager && tourney.status !== "CANCELLED" && !isCompleted && (
                          <Button
                            tone="secondary"
                            icon="edit"
                            aria-label={tr("Edit")}
                            title={tr("Edit")}
                            className={styles.eventEdit}
                            onClick={() => setEditingTournament(tourney)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Specs Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.75rem",
                        marginTop: "1rem",
                        padding: "0.75rem",
                        background: "var(--surface-muted, rgba(0,0,0,0.02))",
                        borderRadius: "var(--r-sm, 6px)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", display: "block" }}>
                          {tr("Race Date")}
                        </span>
                        <strong style={{ fontSize: "var(--fs-sm)", color: "var(--ink)" }}>
                          {formatDate(tourney.raceDate)}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", display: "block" }}>
                          {tr("Distance & Surface")}
                        </span>
                        <strong style={{ fontSize: "var(--fs-sm)", color: "var(--ink)" }}>
                          {tourney.distanceMeters}m · {tr(tourney.trackType)}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", display: "block" }}>
                          {tr("Registration Deadline")}
                        </span>
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--ink)", fontWeight: 600 }}>
                          {formatDate(tourney.registrationDeadline)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", display: "block" }}>
                          {tr("Purse Pool")}
                        </span>
                        <strong style={{ fontSize: "var(--fs-sm)", color: "var(--brand-700)" }}>
                          {formatVND(tourney.prizePool)}
                        </strong>
                      </div>
                    </div>

                    {/* Enrolled horses notice */}
                    <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", fontSize: "var(--fs-xs)" }}>
                      <span style={{ color: "var(--muted)" }}>{tr("Entries from Club:")}</span>
                      <strong style={{ color: "var(--ink)" }}>
                        {registeredCount} {tr("horses registered")}
                      </strong>
                    </div>

                    {/* Results Podium if completed */}
                    {isCompleted && tourney.registrations && tourney.registrations.some((r) => r.result) && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--r-sm)",
                          background: "var(--brand-muted, rgba(16, 185, 129, 0.08))",
                          fontSize: "var(--fs-xs)",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "var(--brand-700)" }}>{tr("Official Results:")}</div>
                        {tourney.registrations
                          .filter((r) => r.result)
                          .sort((a, b) => (a.result?.finalRank ?? 99) - (b.result?.finalRank ?? 99))
                          .slice(0, 3)
                          .map((r) => (
                            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                              <span>
                                #{r.result?.finalRank} {r.horse?.name ?? "Chiến mã"}
                              </span>
                              <span style={{ fontWeight: 600 }}>{r.result?.avgSpeedKmh != null ? `${formatNumber(r.result.avgSpeedKmh, 2)} km/h` : "—"}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Draft Results / Simulation Status Banner */}
                    {isClosedReg && draftSummary.kind !== "NONE" && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.65rem 0.75rem",
                          borderRadius: "var(--r-sm, 6px)",
                          background:
                            draftSummary.kind === "MANUAL"
                              ? "rgba(59, 130, 246, 0.08)"
                              : "rgba(16, 185, 129, 0.1)",
                          border:
                            draftSummary.kind === "MANUAL"
                              ? "1px solid rgba(59, 130, 246, 0.25)"
                              : "1px solid rgba(16, 185, 129, 0.28)",
                          fontSize: "var(--fs-xs, 0.75rem)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ color: draftSummary.kind === "MANUAL" ? "#1d4ed8" : "#047857" }}>
                            {draftSummary.kind === "SIMULATOR_2D"
                              ? isVi
                                ? `Đã chạy mô phỏng 2D · Có bản nháp (${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa)`
                                : `2D simulation completed · Draft saved (${draftSummary.recordedCount}/${draftSummary.activeCount})`
                              : draftSummary.kind === "QUICK_SIM"
                                ? isVi
                                  ? `Đã chạy lấy kết quả nhanh · Có bản nháp (${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa)`
                                  : `Quick result imported · Draft saved (${draftSummary.recordedCount}/${draftSummary.activeCount})`
                                : isVi
                                  ? `Đã lưu bản nháp kết quả (${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa)`
                                  : `Draft results saved (${draftSummary.recordedCount}/${draftSummary.activeCount})`}
                          </strong>
                          <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                            {isVi ? "Chưa khóa chính thức" : "Pending lock"}
                          </span>
                        </div>
                        {draftSummary.podium.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 0.75rem", color: "var(--ink)" }}>
                            {draftSummary.podium.map((entry) => (
                              <span key={entry.registrationId}>
                                {entry.isDnf
                                  ? `DNF ${entry.horseName}`
                                  : `#${entry.finalRank} ${entry.horseName} (${entry.finishTimeSeconds.toFixed(2)}s)`}
                              </span>
                            ))}
                          </div>
                        )}
                        <span style={{ color: "var(--muted)" }}>
                          {isClubManager
                            ? isVi
                              ? 'Số liệu đã tự động nhập vào biểu mẫu — bấm "Ghi nhận & Chốt kết quả" để kiểm tra và chốt.'
                              : 'Auto-imported into the results form — click "Record Results" to review and lock.'
                            : isVi
                              ? "Chờ Quản lý câu lạc bộ kiểm tra và khóa kết quả chính thức."
                              : "Awaiting Club Manager review and official lock."}
                        </span>
                      </div>
                    )}

                    {/* Telemetry & Results Collection Section */}
                    {canManage && isClosedReg && registeredCount > 0 && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.75rem",
                          background: "var(--surface-2, rgba(0, 0, 0, 0.02))",
                          borderRadius: "var(--r-sm, 6px)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "var(--fs-xs, 0.75rem)",
                            fontWeight: 600,
                            color: "var(--muted)",
                          }}
                        >
                          <span>{isVietnamese() ? "Thu thập dữ liệu giải đua" : "Race Telemetry & Results"}</span>
                          <span>{tourney.distanceMeters}m · {registeredCount} {isVietnamese() ? "ngựa" : "entries"}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                          <Button
                            tone="secondary"
                            size="sm"
                            disabled={simulatingId === tourney.id || quickSimulatingId === tourney.id}
                            onClick={() => handleLaunchSimulator(tourney)}
                          >
                            {simulatingId === tourney.id
                              ? (isVietnamese() ? "Đang mở mô phỏng..." : "Opening...")
                              : (isVietnamese() ? "Mở mô phỏng 2D" : "Run 2D Simulation")}
                          </Button>
                          <Button
                            tone="primary"
                            size="sm"
                            disabled={quickSimulatingId === tourney.id || simulatingId === tourney.id}
                            onClick={() => handleQuickSimulate(tourney)}
                          >
                            {quickSimulatingId === tourney.id
                              ? (isVietnamese() ? "Đang tính toán..." : "Calculating...")
                              : (isVietnamese() ? "Lấy kết quả nhanh" : "Quick Result Import")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className={styles.eventActions}>
                    <div className={styles.eventActionGroup}>
                      {(isTrainer || isOwner) && isOpenReg && (
                        <Button
                          tone="primary"
                          onClick={() => setRegisteringTournament(tourney)}
                        >
                          {tr("Register Horse")}
                        </Button>
                      )}

                      {isClubManager && tourney.status === "UPCOMING" && (
                        <Button
                          tone="primary"
                          onClick={() => setOpenRegTarget(tourney)}
                        >
                          {isVietnamese() ? "Mở đăng ký" : tr("Open Registration")}
                        </Button>
                      )}

                      {isClubManager && tourney.status === "OPEN_REGISTRATION" && (
                        <Button
                          tone="secondary"
                          onClick={() => setCloseTarget(tourney)}
                        >
                          {isVietnamese() ? "Đóng đăng ký" : tr("Close Registration")}
                        </Button>
                      )}

                      {canManage && isClosedReg && registeredCount > 0 && (
                        <Button
                          tone="secondary"
                          onClick={() => setRegisteringTournament(tourney)}
                        >
                          {isVietnamese() ? "Quản lý danh sách ngựa" : tr("Manage Entries / Scratch")}
                        </Button>
                      )}

                      {registeredCount > 0 &&
                        (isCompleted ? (
                          <>
                            <Button
                              tone="quiet"
                              onClick={() => setResultsTournament(tourney)}
                            >
                              {tr("View Results")}
                            </Button>
                            {isClubManager && (
                              <Button
                                tone="secondary"
                                onClick={() => navigate("/financial-reports")}
                              >
                                {isVietnamese() ? "Báo cáo tài chính & Quyết toán" : "Financial Reports"}
                              </Button>
                            )}
                          </>
                        ) : isClubManager && isClosedReg ? (
                          <Button
                            tone="primary"
                            onClick={() => setResultsTournament(tourney)}
                          >
                            {isVietnamese() ? "Ghi nhận & Chốt kết quả" : tr("Record Results")}
                          </Button>
                        ) : null)}
                    </div>

                    {isClubManager && (!isCompleted || registeredCount === 0) && (
                      <div className={styles.eventLifecycleActions}>
                        {!isCompleted && tourney.status !== "CANCELLED" && (
                          <Button
                            tone="quiet"
                            size="sm"
                            onClick={() => setCancelTarget(tourney)}
                          >
                            {isVietnamese() ? "Hủy giải" : tr("Cancel Event")}
                          </Button>
                        )}
                        {registeredCount === 0 && (tourney.status === "UPCOMING" || tourney.status === "OPEN_REGISTRATION") && (
                          <Button
                            tone="ghost"
                            size="sm"
                            style={{ color: "var(--danger)" }}
                            onClick={() => setDeleteTarget(tourney)}
                          >
                            {isVietnamese() ? "Xóa giải" : tr("Delete Unused Event")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          </div>
        )
      )}

      {/* Numeric Pagination (10 items / page) */}
      {viewMode === "cards" && !loading && !error && filtered.length > PAGE_SIZE && (
        <Pagination
          page={safePage}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          noun="tournaments"
          onPage={setCurrentPage}
        />
      )}

      {/* Modal 1: Create Tournament */}
      <TournamentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateOrEdit}
      />

      {/* Modal 2: Edit Tournament */}
      {editingTournament && (
        <TournamentModal
          isOpen={true}
          initialData={editingTournament}
          onClose={() => setEditingTournament(null)}
          onSubmit={handleCreateOrEdit}
        />
      )}

      {/* Modal 3: Race Registration (Eligibility screening) */}
      {registeringTournament && (
        <RaceRegistrationModal
          isOpen={true}
          tournament={registeringTournament}
          onClose={() => setRegisteringTournament(null)}
          onSuccess={loadData}
        />
      )}

      {/* Modal 4: Record Results & Lock */}
      {resultsTournament && (
        <RecordResultsModal
          isOpen={true}
          tournament={resultsTournament}
          isClubManager={isClubManager}
          onClose={() => setResultsTournament(null)}
          onSuccess={loadData}
        />
      )}

      {/* Confirmation 1: Delete Unused Tournament Modal */}
      {deleteTarget && (
        <ConfirmModal
          title={isVietnamese() ? "Xóa giải đua chưa sử dụng?" : tr("Delete unused tournament?")}
          subtitle={
            isVietnamese()
              ? `Bạn có chắc chắn muốn xóa bản ghi giải đua "${deleteTarget.name}"? Thao tác này chỉ áp dụng cho giải đấu mới tạo chưa phát sinh đăng ký hoặc lịch sử thi đấu.`
              : tr(`Are you sure you want to delete unused tournament record "${deleteTarget.name}"? Only newly created tournaments without registrations or match history can be deleted.`)
          }
          callout={
            isVietnamese()
              ? 'Đối với các giải đấu đang diễn ra hoặc đã có dữ liệu, hãy sử dụng "Đóng đăng ký" hoặc "Hủy giải" để lưu vết kiểm toán.'
              : tr('For active tournaments or events with history, use "Close Registration" or "Cancel Event" to preserve audit history.')
          }
          tone="danger"
          confirmLabel={isVietnamese() ? "Xóa giải chưa dùng" : tr("Delete unused event")}
          cancelLabel={isVietnamese() ? "Giữ lại" : tr("Cancel")}
          busy={actionBusy}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Confirmation 2: Close Registration Modal */}
      {closeTarget && (
        <ConfirmModal
          title={isVietnamese() ? "Đóng cổng đăng ký thi đấu?" : tr("Close tournament registration?")}
          subtitle={
            isVietnamese()
              ? `Chuyển trạng thái giải đua "${closeTarget.name}" sang "Đã đóng đăng ký" (CLOSED_REGISTRATION).`
              : tr(`Change tournament "${closeTarget.name}" status to CLOSED_REGISTRATION.`)
          }
          callout={
            isVietnamese()
              ? "Cổng nộp hồ sơ sẽ đóng lại. Danh sách ngựa đã đăng ký được bảo lưu để chuẩn bị xuất phát."
              : tr("Registration will be closed. Enrolled horses will be preserved to prepare for the race.")
          }
          tone="warn"
          confirmLabel={isVietnamese() ? "Đóng đăng ký" : tr("Close registration")}
          cancelLabel={isVietnamese() ? "Hủy" : tr("Cancel")}
          busy={actionBusy}
          onConfirm={handleConfirmClose}
          onCancel={() => setCloseTarget(null)}
        />
      )}

      {/* Confirmation 3: Open / Reopen Registration Modal */}
      {openRegTarget && (
        <ConfirmModal
          title={isVietnamese() ? "Mở cổng đăng ký thi đấu?" : tr("Open tournament registration?")}
          subtitle={
            isVietnamese()
              ? `Chuyển trạng thái giải đua "${openRegTarget.name}" sang "Đang mở đăng ký" (OPEN_REGISTRATION).`
              : tr(`Change tournament "${openRegTarget.name}" status to OPEN_REGISTRATION.`)
          }
          callout={
            isVietnamese()
              ? "Cổng nộp hồ sơ sẽ bắt đầu tiếp nhận các lượt đăng ký chiến mã từ huấn luyện viên."
              : tr("The tournament will begin accepting horse registrations from trainers.")
          }
          tone="info"
          confirmLabel={isVietnamese() ? "Mở đăng ký" : tr("Open registration")}
          cancelLabel={isVietnamese() ? "Hủy" : tr("Cancel")}
          busy={actionBusy}
          onConfirm={handleConfirmOpenReg}
          onCancel={() => setOpenRegTarget(null)}
        />
      )}

      {/* Confirmation 4: Cancel Tournament Modal */}
      {cancelTarget && (
        <ConfirmModal
          title={isVietnamese() ? "Hủy tổ chức giải đua?" : tr("Cancel Tournament?")}
          subtitle={
            isVietnamese()
              ? `Chuyển trạng thái giải đua "${cancelTarget.name}" sang "Đã hủy" (CANCELLED).`
              : tr(`Change tournament "${cancelTarget.name}" status to CANCELLED.`)
          }
          callout={
            isVietnamese()
              ? "Tất cả thông tin giải đấu và các lượt đăng ký hiện tại sẽ được bảo lưu hồ sơ để phục vụ kiểm toán (trạng thái hủy là cuối cùng, không thể mở lại)."
              : tr("All existing tournament entries will be safely preserved for audit history (cancellation is terminal and cannot be reopened).")
          }
          tone="warn"
          confirmLabel={isVietnamese() ? "Hủy giải đua" : tr("Cancel tournament")}
          cancelLabel={isVietnamese() ? "Giữ lại" : tr("Keep")}
          busy={actionBusy}
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}


    </div>
  );
}
