import { useState, useEffect } from "react";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { isVietnamese, localizeServerText, tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { fetchEligibility, registerHorseForRace, scratchHorseFromRace, fetchTournamentDetail, fetchHorseEligibilityDetail } from "../api";
import { vndUnit } from "@/shared/lib/format";
import type { EligibilityResponse, Tournament, HorseEligibilityDetail } from "../types";

function formatIneligibleReason(reason: string, isVi: boolean): string {
  if (!isVi) return reason;

  // 1. Khóa y tế
  if (/veterinary medical lock/i.test(reason)) {
    return "Đang bị Khóa y tế thú y (Cấm xuất chuồng / Cấm thi đấu)";
  }

  // 1b. Lưu giữ do nợ phí
  if (/debt impound|overdue payment/i.test(reason)) {
    return "Đang bị Lưu giữ do nợ phí quá hạn (Cấm thi đấu / Cấm chuyển nhượng)";
  }

  // 2. Trạng thái sức khỏe
  if (/Horse health status is (currently\s+)?(\w+)/i.test(reason)) {
    const match = reason.match(/Horse health status is (currently\s+)?(\w+)/i);
    const code = match ? match[2].toUpperCase() : "";
    const map: Record<string, string> = {
      ISOLATED: "Đang cách ly kiểm dịch y tế (ISOLATED)",
      INJURED: "Đang điều trị chấn thương (INJURED)",
      UNDER_OBSERVATION: "Đang theo dõi sức khỏe đặc biệt (UNDER_OBSERVATION)",
      SICK: "Đang bị bệnh / trị liệu (SICK)",
      RESTING: "Đang nghỉ dưỡng phục hồi (RESTING)",
      RETIRED: "Đã giải nghệ (RETIRED)",
    };
    return `Tình trạng sức khỏe: ${map[code] || code}`;
  }

  // 3. Thiếu số buổi tập gần đây
  const workoutMatch = reason.match(/Insufficient recent training sessions \((\d+)\/(\d+) required in past (\d+) days\)/i);
  if (workoutMatch) {
    const [, curr, req, days] = workoutMatch;
    return `Chưa đủ thể lực thi đấu (Mới hoàn thành ${curr}/${req} buổi tập yêu cầu trong ${days} ngày qua)`;
  }

  if (/insufficient recent training/i.test(reason)) {
    return "Chưa hoàn thành đủ các bài tập chuẩn bị thi đấu";
  }

  return reason;
}

interface RaceRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onSuccess: () => void;
}

export function RaceRegistrationModal({
  isOpen,
  onClose,
  tournament,
  onSuccess,
}: RaceRegistrationModalProps) {
  useAppLanguage();
  const currentUser = useCurrentUser();
  const canManageScratch =
    currentUser.role === "CLUB_MANAGER" || currentUser.role === "HEAD_TRAINER";
  const [currentTournament, setCurrentTournament] = useState<Tournament>(tournament);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<EligibilityResponse | null>(null);
  const [selectedHorseId, setSelectedHorseId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [eligibilityDetail, setEligibilityDetail] = useState<HorseEligibilityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (selectedHorseId && currentTournament?.id) {
      setDetailLoading(true);
      fetchHorseEligibilityDetail(currentTournament.id, selectedHorseId)
        .then(setEligibilityDetail)
        .catch(() => setEligibilityDetail(null))
        .finally(() => setDetailLoading(false));
    } else {
      setEligibilityDetail(null);
    }
  }, [selectedHorseId, currentTournament?.id]);

  // Scratch states
  const [scratchingRegId, setScratchingRegId] = useState<string | null>(null);
  const [scratchReason, setScratchReason] = useState<string>("");
  const [scratchSubmitting, setScratchSubmitting] = useState(false);

  useEffect(() => {
    if (tournament) {
      setCurrentTournament(tournament);
    }
  }, [tournament]);

  useEffect(() => {
    if (isOpen && tournament) {
      loadEligibility();
    }
  }, [isOpen, tournament]);

  async function loadEligibility() {
    setLoading(true);
    setError(null);
    try {
      const [res, fresh] = await Promise.all([
        fetchEligibility(tournament.id),
        fetchTournamentDetail(tournament.id).catch(() => tournament),
      ]);
      setData(res);
      if (fresh) setCurrentTournament(fresh);

      // Auto select first eligible horse if not already registered
      const firstAvailable = res.eligible.find((h) => !h.isRegistered);
      if (firstAvailable) {
        setSelectedHorseId(firstAvailable.id);
      }
    } catch (err: any) {
      setError(localizeServerText(err?.message) || tr("Failed to load race eligibility"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!selectedHorseId) {
      setError(tr("Please select an eligible horse to register"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await registerHorseForRace(tournament.id, selectedHorseId, notes.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(localizeServerText(err?.message) || tr("Failed to register horse for tournament"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScratch(regId: string) {
    if (!scratchReason.trim()) {
      setError(isVietnamese() ? "Lý do rút ngựa là bắt buộc" : tr("Scratch reason is required"));
      return;
    }

    setScratchSubmitting(true);
    setError(null);
    try {
      await scratchHorseFromRace(tournament.id, regId, scratchReason.trim());
      setScratchingRegId(null);
      setScratchReason("");
      onSuccess();
      await loadEligibility();
    } catch (err: any) {
      setError(localizeServerText(err?.message) || tr("Failed to scratch horse"));
    } finally {
      setScratchSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const isClosed = currentTournament.status === "CLOSED_REGISTRATION";
  const isOpenReg = currentTournament.status === "OPEN_REGISTRATION";
  const registrations = currentTournament.registrations || [];
  const activeRegistrations = registrations.filter((r) => r.status !== "SCRATCHED_MEDICAL");

  return (
    <Modal
      title={
        isClosed
          ? (isVietnamese() ? "Quản lý danh sách thi đấu & Rút ngựa" : tr("Manage Entries & Scratch"))
          : tr("Register Horse for Tournament")
      }
      subtitle={`${currentTournament.name} · ${currentTournament.distanceMeters}m (${tr(currentTournament.trackType)})${currentTournament.entryFee ? ` · ${isVietnamese() ? "Phí:" : "Fee:"} ${Number(currentTournament.entryFee).toLocaleString("vi-VN")} ${vndUnit()}` : ""}`}
      width={720}
      onClose={onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>
            {tr("Deadline:")} {new Date(currentTournament.registrationDeadline).toLocaleDateString()}
          </span>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {isClosed ? (
              <Button tone="primary" onClick={onClose}>
                {tr("Close")}
              </Button>
            ) : (
              <>
                <Button tone="secondary" onClick={onClose} disabled={submitting}>
                  {tr("Cancel")}
                </Button>
                <Button
                  tone="primary"
                  onClick={handleRegister}
                  disabled={submitting || !selectedHorseId || !isOpenReg}
                >
                  {submitting ? tr("Registering...") : tr("Confirm Registration")}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--danger-bg, #fef2f2)",
              color: "var(--danger, #dc2626)",
              borderRadius: "var(--r-sm, 6px)",
              fontSize: "var(--fs-sm, 0.875rem)",
              border: "1px solid var(--danger-border, #fecaca)",
            }}
          >
            {error}
          </div>
        )}

        {isClosed && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--surface-muted, #f3f4f6)",
              color: "var(--ink)",
              borderRadius: "var(--r-sm, 6px)",
              fontSize: "var(--fs-sm, 0.875rem)",
              border: "1px solid var(--border)",
            }}
          >
            ℹ️ {isVietnamese()
              ? "Đăng ký mới đã đóng (CLOSED_REGISTRATION). Bạn có thể xem danh sách chiến mã đã đăng ký và rút ngựa (Scratch) nếu có sự cố."
              : tr("New registrations are closed. You can review registered horses or scratch entries with a valid reason.")}
          </div>
        )}

        {/* Section: Registered Horses & Scratch Management */}
        {registrations.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h4 style={{ margin: 0, fontSize: "var(--fs-base, 1rem)", fontWeight: 700, color: "var(--ink)" }}>
                {isVietnamese() ? "Chiến mã đã đăng ký" : tr("Registered Horses")} ({registrations.length})
              </h4>
              <Badge tone="info">
                {activeRegistrations.length} {isVietnamese() ? "đang thi đấu" : "active"}
              </Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {registrations.map((reg) => {
                const isScratched = reg.status === "SCRATCHED_MEDICAL";
                const isScratchingThis = scratchingRegId === reg.id;
                const canScratch =
                  canManageScratch &&
                  !isScratched &&
                  currentTournament.status !== "COMPLETED" &&
                  currentTournament.status !== "CANCELLED";

                return (
                  <div
                    key={reg.id}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--r-md, 8px)",
                      border: isScratched ? "1px dashed var(--danger-border, #fecaca)" : "1px solid var(--border)",
                      background: isScratched ? "var(--danger-bg, #fff5f5)" : "var(--surface)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {reg.horse?.name ?? "Chiến mã"}
                          <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", fontWeight: 400 }}>
                            #{reg.horse?.horseCode || tr("N/A")}
                          </span>
                        </div>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                          {reg.horse?.breed ?? ""} {reg.notes ? `· ${reg.notes}` : ""}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {isScratched ? (
                          <Badge tone="danger">{isVietnamese() ? "Đã rút (Scratched)" : tr("Scratched")}</Badge>
                        ) : (
                          <Badge tone="ok">{isVietnamese() ? "Đã đăng ký" : tr("Registered")}</Badge>
                        )}
                        {canScratch && !isScratchingThis && (
                          <Button
                            tone="quiet"
                            onClick={() => {
                              setScratchingRegId(reg.id);
                              setScratchReason("");
                            }}
                            disabled={scratchSubmitting}
                          >
                            <Icon name="ban" inline size={14} /> {isVietnamese() ? "Rút ngựa" : tr("Scratch")}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isScratched && (reg as any).scratchReason && (
                      <div style={{ fontSize: "var(--fs-xs)", color: "var(--danger, #dc2626)", fontStyle: "italic" }}>
                        {isVietnamese() ? "Lý do rút:" : "Scratch reason:"} {(reg as any).scratchReason}
                      </div>
                    )}

                    {isScratchingThis && (
                      <div
                        style={{
                          marginTop: "0.25rem",
                          padding: "0.5rem",
                          borderRadius: "var(--r-sm, 4px)",
                          background: "var(--surface-muted, #f9fafb)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                        }}
                      >
                        <input
                          type="text"
                          value={scratchReason}
                          onChange={(e) => setScratchReason(e.target.value)}
                          placeholder={isVietnamese() ? "Nhập lý do rút ngựa (bắt buộc, ví dụ: chấn thương nhẹ)..." : "Enter scratch reason (required)..."}
                          style={{
                            width: "100%",
                            padding: "0.375rem 0.5rem",
                            borderRadius: "var(--r-sm, 4px)",
                            border: "1px solid var(--border)",
                            fontSize: "var(--fs-xs)",
                          }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <Button
                            tone="secondary"
                            onClick={() => setScratchingRegId(null)}
                            disabled={scratchSubmitting}
                          >
                            {tr("Cancel")}
                          </Button>
                          <Button
                            tone="danger"
                            onClick={() => handleScratch(reg.id)}
                            disabled={scratchSubmitting || !scratchReason.trim()}
                          >
                            {scratchSubmitting ? tr("Scratching...") : (isVietnamese() ? "Xác nhận rút" : "Confirm Scratch")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            {tr("Screening club herd for medical locks, withdrawal dates, and workout fitness...")}
          </div>
        ) : data && isOpenReg ? (
          <>
            {/* Section 1: Eligible Horses */}
            <div style={{ borderTop: registrations.length > 0 ? "1px solid var(--border)" : "none", paddingTop: registrations.length > 0 ? "1rem" : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "var(--fs-base, 1rem)", fontWeight: 700, color: "var(--ink)" }}>
                  {tr("Eligible Horses")} ({data.eligible.length})
                </h4>
                <Badge tone="ok">{tr("Safe to Compete")}</Badge>
              </div>

              {/* Quick Search & Select (Zone Inventory style) */}
              {data.eligible.length > 0 && (
                <div style={{ marginBottom: "0.875rem" }}>
                  <SearchSelect
                    aria-label={isVietnamese() ? "Tìm và chọn chiến mã" : tr("Search and select horse")}
                    placeholder={isVietnamese() ? "Gõ tìm hoặc chọn chiến mã từ danh sách..." : tr("Type or select horse from list...")}
                    options={[
                      { value: "", label: isVietnamese() ? "— Tìm kiếm & chọn ngựa nhanh —" : "— Search & select horse —" },
                      ...data.eligible.map((h) => ({
                        value: h.id,
                        label: `${h.name} (${h.horseCode || "N/A"})${h.isRegistered ? (isVietnamese() ? " [Đã đăng ký]" : " [Registered]") : ""}`,
                        disabled: h.isRegistered,
                      })),
                    ]}
                    value={selectedHorseId}
                    onChange={(val) => {
                      if (val) setSelectedHorseId(val);
                    }}
                  />
                </div>
              )}

              {data.eligible.length === 0 ? (
                <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--muted)", fontStyle: "italic" }}>
                  {tr("No horses currently meet the safe ACWR and medical requirements for this distance.")}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {data.eligible.map((h) => {
                    const isSelected = selectedHorseId === h.id;
                    return (
                      <div
                        key={h.id}
                        onClick={() => {
                          if (!h.isRegistered) setSelectedHorseId(h.id);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.75rem 1rem",
                          borderRadius: "var(--r-md, 8px)",
                          border: isSelected ? "2px solid var(--brand, #10b981)" : "1px solid var(--border)",
                          background: isSelected ? "var(--brand-muted, rgba(16, 185, 129, 0.08))" : "var(--surface)",
                          cursor: h.isRegistered ? "default" : "pointer",
                          opacity: h.isRegistered ? 0.7 : 1,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <input
                            type="radio"
                            name="selectedHorse"
                            checked={isSelected}
                            disabled={h.isRegistered}
                            onChange={() => setSelectedHorseId(h.id)}
                            style={{ cursor: "pointer" }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {h.name}
                              <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", fontWeight: 400 }}>
                                #{h.horseCode || tr("N/A")}
                              </span>
                            </div>
                            <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                              {h.breed} · {tr("Workouts completed in last 30d:")} {h.completedWorkouts}
                            </div>
                          </div>
                        </div>

                        <div>
                          {h.isRegistered ? (
                            <Badge tone="info">{tr("Already Registered")}</Badge>
                          ) : (
                            <Badge tone="ok">{tr("Ready")}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6-Tier Eligibility Checklist Card */}
            {selectedHorseId && (
              <div
                style={{
                  padding: "0.875rem",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--surface-muted, #f8fafc)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "var(--fs-sm, 0.875rem)", color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Icon name="shield" size={16} />
                    {isVietnamese() ? "Bảng kiểm tra 6 tiêu chí hợp lệ thi đấu:" : tr("6-Tier Race Eligibility Checklist:")}
                  </strong>
                  {eligibilityDetail && (
                    <Badge tone={(eligibilityDetail.isEligible ?? eligibilityDetail.eligible) ? "ok" : "danger"}>
                      {(eligibilityDetail.isEligible ?? eligibilityDetail.eligible)
                        ? (isVietnamese() ? "Đủ điều kiện xuất phát" : "Eligible")
                        : (isVietnamese() ? "Không đủ điều kiện" : "Ineligible")}
                    </Badge>
                  )}
                </div>

                {detailLoading ? (
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", fontStyle: "italic" }}>
                    {isVietnamese() ? "Đang kiểm tra rà soát 6 tiêu chí y tế, độ tuổi, nợ phí và thể lực..." : "Checking 6-tier criteria..."}
                  </div>
                ) : eligibilityDetail ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.5rem" }}>
                    {eligibilityDetail.checks && eligibilityDetail.checks.length > 0 ? (
                      eligibilityDetail.checks.map((chk, idx) => (
                        <div
                          key={chk.key || idx}
                          style={{
                            padding: "0.5rem 0.625rem",
                            borderRadius: "6px",
                            background: chk.passed ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                            border: `1px solid ${chk.passed ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                          }}
                        >
                          <div style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>
                            {idx + 1}. {chk.label}
                          </div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "var(--fs-xs)",
                              color: chk.passed ? "var(--ok, #10b981)" : "var(--danger, #ef4444)",
                              marginTop: "2px",
                            }}
                          >
                            {chk.passed ? "✓ " : "✗ "}
                            {chk.details || (chk.passed ? (isVietnamese() ? "Đạt chuẩn" : "Passed") : (isVietnamese() ? "Không đạt" : "Failed"))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div style={{ padding: "0.5rem 0.625rem", borderRadius: "6px", background: eligibilityDetail.checklist?.statusCheck?.pass ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: `1px solid ${eligibilityDetail.checklist?.statusCheck?.pass ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}` }}>
                          <div style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>{isVietnamese() ? "1. Trạng thái hoạt động" : "1. Status"}</div>
                          <div style={{ fontWeight: 600, fontSize: "var(--fs-xs)", color: eligibilityDetail.checklist?.statusCheck?.pass ? "var(--ok, #10b981)" : "var(--danger, #ef4444)" }}>
                            {eligibilityDetail.checklist?.statusCheck?.pass ? "✓ " : "✗ "}
                            {eligibilityDetail.checklist?.statusCheck?.value ?? "N/A"}
                          </div>
                        </div>

                        <div style={{ padding: "0.5rem 0.625rem", borderRadius: "6px", background: eligibilityDetail.checklist?.ageCheck?.pass ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: `1px solid ${eligibilityDetail.checklist?.ageCheck?.pass ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}` }}>
                          <div style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>{isVietnamese() ? "2. Độ tuổi tối thiểu" : "2. Minimum Age"}</div>
                          <div style={{ fontWeight: 600, fontSize: "var(--fs-xs)", color: eligibilityDetail.checklist?.ageCheck?.pass ? "var(--ok, #10b981)" : "var(--danger, #ef4444)" }}>
                            {eligibilityDetail.checklist?.ageCheck?.pass ? "✓ " : "✗ "}
                            {eligibilityDetail.checklist?.ageCheck?.ageYears ?? 0} {isVietnamese() ? "tuổi" : "yo"} (≥ {eligibilityDetail.checklist?.ageCheck?.minRequired ?? 2})
                          </div>
                        </div>

                        <div style={{ padding: "0.5rem 0.625rem", borderRadius: "6px", background: eligibilityDetail.checklist?.medicalLockCheck?.pass ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: `1px solid ${eligibilityDetail.checklist?.medicalLockCheck?.pass ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}` }}>
                          <div style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>{isVietnamese() ? "3. Khóa y tế thú y" : "3. Medical Lock"}</div>
                          <div style={{ fontWeight: 600, fontSize: "var(--fs-xs)", color: eligibilityDetail.checklist?.medicalLockCheck?.pass ? "var(--ok, #10b981)" : "var(--danger, #ef4444)" }}>
                            {eligibilityDetail.checklist?.medicalLockCheck?.pass ? (isVietnamese() ? "✓ Không có khóa" : "✓ Clear") : (isVietnamese() ? "✗ Đang bị khóa y tế" : "✗ Locked")}
                          </div>
                        </div>

                        <div style={{ padding: "0.5rem 0.625rem", borderRadius: "6px", background: eligibilityDetail.checklist?.debtCheck?.pass ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: `1px solid ${eligibilityDetail.checklist?.debtCheck?.pass ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}` }}>
                          <div style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>{isVietnamese() ? "4. Công nợ / Lưu giữ" : "4. Debt Impoundment"}</div>
                          <div style={{ fontWeight: 600, fontSize: "var(--fs-xs)", color: eligibilityDetail.checklist?.debtCheck?.pass ? "var(--ok, #10b981)" : "var(--danger, #ef4444)" }}>
                            {eligibilityDetail.checklist?.debtCheck?.pass ? (isVietnamese() ? "✓ Sạch công nợ" : "✓ Clear") : (isVietnamese() ? "✗ Bị lưu giữ do nợ" : "✗ Impounded")}
                          </div>
                        </div>

                        <div style={{ padding: "0.5rem 0.625rem", borderRadius: "6px", background: eligibilityDetail.checklist?.withdrawalCheck?.pass ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: `1px solid ${eligibilityDetail.checklist?.withdrawalCheck?.pass ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}` }}>
                          <div style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>{isVietnamese() ? "5. Thời gian thải trừ thuốc" : "5. Doping Clearance"}</div>
                          <div style={{ fontWeight: 600, fontSize: "var(--fs-xs)", color: eligibilityDetail.checklist?.withdrawalCheck?.pass ? "var(--ok, #10b981)" : "var(--danger, #ef4444)" }}>
                            {eligibilityDetail.checklist?.withdrawalCheck?.pass ? (isVietnamese() ? "✓ Đã qua thải trừ" : "✓ Clear") : (isVietnamese() ? "✗ Trong kỳ thải trừ" : "✗ In withdrawal")}
                          </div>
                        </div>

                        <div style={{ padding: "0.5rem 0.625rem", borderRadius: "6px", background: eligibilityDetail.checklist?.fitnessCheck?.pass ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: `1px solid ${eligibilityDetail.checklist?.fitnessCheck?.pass ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}` }}>
                          <div style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)" }}>{isVietnamese() ? "6. Thể lực tập luyện" : "6. Training Fitness"}</div>
                          <div style={{ fontWeight: 600, fontSize: "var(--fs-xs)", color: eligibilityDetail.checklist?.fitnessCheck?.pass ? "var(--ok, #10b981)" : "var(--danger, #ef4444)" }}>
                            {eligibilityDetail.checklist?.fitnessCheck?.pass ? "✓ " : "✗ "}
                            {eligibilityDetail.checklist?.fitnessCheck?.completedWorkouts ?? 0}/{eligibilityDetail.checklist?.fitnessCheck?.required ?? 4} {isVietnamese() ? "buổi" : "workouts"}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Tactical Notes Input */}
            {selectedHorseId && (
              <div>
                <label style={{ display: "block", fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 600, marginBottom: "0.375rem" }}>
                  {tr("Tactical Instructions & Jockey Assignment")}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={tr("e.g. Assigned Jockey: Nguyen Van A, maintain mid-pack pacing until 400m bend.")}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "var(--r-sm, 6px)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    fontSize: "var(--fs-body)",
                    resize: "vertical",
                  }}
                />
              </div>
            )}

            {/* Section 2: Ineligible Horses (Rule Enforced) */}
            {data.ineligible.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h4 style={{ margin: 0, fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 700, color: "var(--muted)" }}>
                    {tr("Ineligible Horses (Blocked by System)")} ({data.ineligible.length})
                  </h4>
                  <Badge tone="neutral">{tr("Rule Enforced")}</Badge>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {data.ineligible.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        padding: "0.625rem 0.75rem",
                        borderRadius: "var(--r-sm, 6px)",
                        border: "1px dashed var(--danger-border, #fecaca)",
                        background: "var(--danger-bg, #fff5f5)",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--ink)" }}>
                          {h.name}
                        </span>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--danger, #dc2626)", marginTop: "3px", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {h.ineligibleReasons && h.ineligibleReasons.length > 0 ? (
                            h.ineligibleReasons.map((r, rIdx) => (
                              <div key={rIdx} style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                                <Icon name="alert" size={14} style={{ marginTop: 2 }} />
                                <span>{formatIneligibleReason(r, isVietnamese())}</span>
                              </div>
                            ))
                          ) : (
                            <div><Icon name="alert" inline size={14} /> {isVietnamese() ? "Không đáp ứng quy định thi đấu" : tr("Did not meet entry criteria")}</div>
                          )}
                        </div>
                      </div>
                      <Badge tone="danger">{tr("Blocked")}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
