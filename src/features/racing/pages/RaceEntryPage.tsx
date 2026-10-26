import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { Tabs } from "@/shared/components/ui/Tabs";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { tr, isVietnamese } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";

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

import {
  fetchTournaments,
  createTournament,
  updateTournament,
  changeTournamentStatus,
  deleteTournament,
} from "../api";
import type { Tournament } from "../types";
import { TournamentModal } from "../components/TournamentModal";
import { RaceRegistrationModal } from "../components/RaceRegistrationModal";
import { RecordResultsModal } from "../components/RecordResultsModal";

export default function RaceEntryPage() {
  useAppLanguage();
  const user = useCurrentUser();
  const isClubManager = user.role === "CLUB_MANAGER";
  const isTrainer = user.role === "HEAD_TRAINER";
  const canManage = isClubManager || isTrainer;

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTournaments({
      status: statusFilter,
      search: searchTerm,
    })
      .then((res) => {
        if (active) {
          setTournaments(res.items);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load tournaments", err);
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

  const filtered = tournaments.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return t.name.toLowerCase().includes(term) || t.location.toLowerCase().includes(term);
  });

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <KpiTile
          label={tr("Championship Tournaments")}
          value={String(totalTournaments)}
          caption={tr("All organized racing events")}
        />
        <KpiTile
          label={tr("Registration Open")}
          value={String(openCount)}
          caption={tr("Actively recruiting club horses")}
          accent={openCount > 0}
        />
        <KpiTile
          label={tr("Total Prize Pool")}
          value={`${(totalPrize / 1000000).toLocaleString()}M`}
          unit="VND"
          caption={tr("Total purse across all seasons")}
        />
        <KpiTile
          label={tr("Enrolled Horses")}
          value={String(totalRegisteredHorses)}
          caption={tr("Active race entries from stable")}
        />
      </div>

      {/* Status Guide Accordion / Information Card */}
      <div
        style={{
          padding: "0.875rem 1.25rem",
          borderRadius: "8px",
          background: "color-mix(in srgb, var(--brand) 6%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--brand) 20%, var(--border))",
          fontSize: "var(--fs-sm)",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>ℹ️</span> {isVietnamese() ? "Giải thích trạng thái giải đấu & Quy trình đăng ký:" : tr("Tournament Status & Registration Process:")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem", marginTop: "0.5rem" }}>
          <div>
            <strong style={{ color: "var(--info, #3b82f6)" }}>• {isVietnamese() ? "Sắp diễn ra (Upcoming):" : "Upcoming:"}</strong>{" "}
            {isVietnamese()
              ? "Giải đấu đã được công bố trên lịch thi đấu nhưng chưa mở nhận hồ sơ. Huấn luyện viên theo dõi điều lệ và cự ly để lên kế hoạch chuẩn bị."
              : tr("Tournament is scheduled on the calendar but registration is not open yet.")}
          </div>
          <div>
            <strong style={{ color: "var(--brand, #10b981)" }}>• {isVietnamese() ? "Đang mở đăng ký (Open for Registration):" : "Open for Registration:"}</strong>{" "}
            {isVietnamese()
              ? "Cổng nộp hồ sơ đang mở. Chủ ngựa và HLV có thể bấm 'Đăng ký ngựa thi đấu' để đưa chiến mã đủ điều kiện tham gia tranh tài."
              : tr("Registration is actively open. Horse Owners and Trainers can enroll eligible horses.")}
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

      {/* Filter and Tab Bar */}
      <Card pad={16}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
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
            onChange={(v) => setStatusFilter(v)}
          />

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="text"
              placeholder={tr("Search by name or location...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                width: "240px",
              }}
            />
            <Button tone="secondary" onClick={() => loadData()}>
              {tr("Filter")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tournaments List */}
      {loading ? (
        <Card pad={32}>
          <div style={{ textAlign: "center", color: "var(--muted)" }}>{tr("Loading tournaments...")}</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card pad={32}>
          <EmptyState
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
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
          {filtered.map((tourney) => {
            const registeredCount = tourney.registeredCount ?? tourney.registrations?.length ?? 0;
            const isCompleted = tourney.status === "COMPLETED";
            const isOpenReg = tourney.status === "OPEN_REGISTRATION";
            const isUpcoming = tourney.status === "UPCOMING";
            const isClosedReg = tourney.status === "CLOSED_REGISTRATION";

            return (
              <Card key={tourney.id} pad={20}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%", justifyContent: "space-between" }}>
                  <div>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "var(--fs-kpi, 1.125rem)", fontWeight: 700, color: "var(--ink)" }}>
                          {tourney.name}
                        </h3>
                        <p style={{ margin: "4px 0 0 0", fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>
                          📍 {tourney.location}
                        </p>
                      </div>
                      <Badge
                        tone={
                          isOpenReg
                            ? "ok"
                            : isCompleted
                            ? "neutral"
                            : isUpcoming
                            ? "info"
                            : tourney.status === "CLOSED_REGISTRATION"
                            ? "warn"
                            : "danger"
                        }
                      >
                        {getTournamentStatusLabel(tourney.status)}
                      </Badge>
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
                          {new Date(tourney.raceDate).toLocaleDateString()}
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
                          {new Date(tourney.registrationDeadline).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", display: "block" }}>
                          {tr("Purse Pool")}
                        </span>
                        <strong style={{ fontSize: "var(--fs-sm)", color: "var(--brand, #10b981)" }}>
                          {tourney.prizePool.toLocaleString()} đ
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
                        <div style={{ fontWeight: 700, color: "var(--brand)" }}>🏆 {tr("Official Results:")}</div>
                        {tourney.registrations
                          .filter((r) => r.result)
                          .sort((a, b) => (a.result?.finalRank ?? 99) - (b.result?.finalRank ?? 99))
                          .slice(0, 3)
                          .map((r) => (
                            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                              <span>
                                #{r.result?.finalRank} {r.horse.name}
                              </span>
                              <span style={{ fontWeight: 600 }}>{r.result?.avgSpeedKmh} km/h</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      paddingTop: "0.75rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {canManage && isOpenReg && (
                        <Button
                          tone="primary"
                          onClick={() => setRegisteringTournament(tourney)}
                        >
                          🏇 {tr("Register Horse")}
                        </Button>
                      )}

                      {canManage && isClosedReg && registeredCount > 0 && (
                        <Button
                          tone="secondary"
                          onClick={() => setRegisteringTournament(tourney)}
                        >
                          🐎 {isVietnamese() ? "Quản lý danh sách / Rút ngựa" : tr("Manage Entries / Scratch")}
                        </Button>
                      )}

                      {registeredCount > 0 &&
                        (isCompleted ? (
                          <Button
                            tone="quiet"
                            onClick={() => setResultsTournament(tourney)}
                          >
                            ⏱️ {tr("View Results")}
                          </Button>
                        ) : isClubManager && isClosedReg ? (
                          <Button
                            tone="quiet"
                            onClick={() => setResultsTournament(tourney)}
                          >
                            ⏱️ {tr("Record Results")}
                          </Button>
                        ) : null)}
                    </div>

                    {isClubManager && (
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                        {tourney.status !== "CANCELLED" && !isCompleted && (
                          <Button
                            tone="secondary"
                            onClick={() => setEditingTournament(tourney)}
                          >
                            {tr("Edit")}
                          </Button>
                        )}
                        {tourney.status === "UPCOMING" && (
                          <Button
                            tone="primary"
                            onClick={() => setOpenRegTarget(tourney)}
                          >
                            {isVietnamese() ? "Mở đăng ký" : tr("Open Registration")}
                          </Button>
                        )}
                        {tourney.status === "OPEN_REGISTRATION" && (
                          <Button
                            tone="secondary"
                            onClick={() => setCloseTarget(tourney)}
                          >
                            {isVietnamese() ? "Đóng đăng ký" : tr("Close Registration")}
                          </Button>
                        )}
                        {!isCompleted && tourney.status !== "CANCELLED" && (
                          <Button
                            tone="quiet"
                            onClick={() => setCancelTarget(tourney)}
                          >
                            {isVietnamese() ? "Hủy giải đua" : tr("Cancel Event")}
                          </Button>
                        )}
                        {registeredCount === 0 && (tourney.status === "UPCOMING" || tourney.status === "OPEN_REGISTRATION") && (
                          <Button
                            tone="danger"
                            onClick={() => setDeleteTarget(tourney)}
                          >
                            {isVietnamese() ? "Xóa giải chưa dùng" : tr("Delete Unused Event")}
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
