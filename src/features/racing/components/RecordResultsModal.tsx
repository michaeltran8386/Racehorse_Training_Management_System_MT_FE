import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { formatNumber, formatVND } from "@/shared/lib/format";
import { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { useToast } from "@/shared/components/ui/Toast";
import { localizeServerText, tr, isVietnamese } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import {
  recordRaceResults,
  fetchTournamentDetail,
  type SingleResultInput,
} from "../api";
import type { Tournament } from "../types";
import {
  summarizeDraftResults,
  type ResultDraftSummary,
} from "../resultDraftSummary";

interface RecordResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  isClubManager: boolean;
  onSuccess: () => void;
}

function cleanOfficialNotesForModal(notes: string, rank: number | ""): string {
  const cleaned = notes
    .replace(/\s*·\s*(TMEC Simulator \(Đo nhanh\)|mô phỏng 2D|Đo nhanh|Ghi nhận từ mô phỏng 2D chính thức).*/gi, "")
    .trim();

  if (cleaned.startsWith("TMEC Simulator") || cleaned.startsWith("Ghi nhận từ mô phỏng") || !cleaned) {
    if (rank === 1) return "Quán quân";
    if (rank === 2) return "Á quân";
    if (rank === 3) return "Hạng 3";
    if (typeof rank === "number" && rank > 3) return `Hạng ${rank}`;
    return "";
  }
  return cleaned;
}

export function RecordResultsModal({
  isOpen,
  onClose,
  tournament,
  isClubManager,
  onSuccess,
}: RecordResultsModalProps) {
  useAppLanguage();
  const toast = useToast();
  const [rows, setRows] = useState<
    Array<{
      registrationId: string;
      horseName: string;
      finalRank: number | "";
      finishTimeSeconds: number | "";
      avgSpeedKmh: number | "";
      prizeMoneyWon: number | "";
      officialNotes: string;
      simOrigin?: "SIMULATOR_2D" | "QUICK_SIM";
    }>
  >([]);
  const [detailTournament, setDetailTournament] = useState<Tournament | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmLock, setShowConfirmLock] = useState(false);
  const [draftSummary, setDraftSummary] = useState<ResultDraftSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toastRef = useRef(toast);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    toastRef.current = toast;
    onSuccessRef.current = onSuccess;
  }, [toast, onSuccess]);
  const tournamentId = tournament?.id;

  const loadTournamentData = useCallback((silent = false) => {
    if (!tournamentId) return;
    Promise.resolve()
      .then(() => {
        if (!silent) setLoadingDetail(true);
        setError(null);
        return fetchTournamentDetail(tournamentId);
      })
      .then((full) => {
        setDetailTournament(full);
        const pool = full.prizePool || 0;
        const summary = summarizeDraftResults(full.registrations);
        setDraftSummary(summary);

        if (full.registrations && full.registrations.length > 0) {
          const activeRegs = full.registrations.filter(
            (r) => r.status !== "SCRATCHED_MEDICAL" && r.status !== "DISQUALIFIED",
          );
          const initial: typeof rows = activeRegs.map((reg) => {
            const existing = reg.result;
            const rank = existing?.finalRank ?? "";
            let prize = existing?.prizeMoneyWon !== undefined && existing?.prizeMoneyWon !== null ? Number(existing.prizeMoneyWon) : ("" as const);
            if ((prize === "" || prize === 0) && typeof rank === "number" && pool > 0 && full.status !== "COMPLETED") {
              if (rank === 1) prize = Math.round(pool * 0.5);
              else if (rank === 2) prize = Math.round(pool * 0.3);
              else if (rank === 3) prize = Math.round(pool * 0.2);
              else prize = 0;
            }

            let rawNotes = existing?.officialNotes ?? "";
            let simOrigin: "SIMULATOR_2D" | "QUICK_SIM" | undefined = undefined;
            if (rawNotes.includes("Đo nhanh") || rawNotes.includes("Quick")) {
              simOrigin = "QUICK_SIM";
            } else if (rawNotes.includes("mô phỏng 2D") || rawNotes.includes("Simulator 2D") || rawNotes.includes("Mô phỏng 2D")) {
              simOrigin = "SIMULATOR_2D";
            }

            const notes = cleanOfficialNotesForModal(rawNotes, rank);

            return {
              registrationId: reg.id,
              horseName: reg.horse.name,
              finalRank: rank,
              finishTimeSeconds: existing?.finishTimeSeconds ?? "",
              avgSpeedKmh: existing?.avgSpeedKmh ?? "",
              prizeMoneyWon: prize,
              officialNotes: notes,
              simOrigin,
            };
          });
          setRows(initial);
          const hasAnyRank = initial.some((r) => r.finalRank !== "");
          setIsEditing(!hasAnyRank && full.status === "CLOSED_REGISTRATION");
        } else {
          setRows([]);
        }
      })
      .catch((err) => setError(localizeServerText(err?.message) || tr("Failed to load tournament registrations")))
      .finally(() => {
        if (!silent) setLoadingDetail(false);
      });
  }, [tournamentId]);

  useEffect(() => {
    if (!isOpen || !tournamentId) {
      return;
    }
    loadTournamentData();
  }, [tournamentId, isOpen, loadTournamentData]);

  if (!isOpen) return null;

  const currentTourney = detailTournament ?? tournament;
  const isCompleted = currentTourney.status === "COMPLETED";
  const isClosedReg = currentTourney.status === "CLOSED_REGISTRATION";
  const hasExistingResults = (currentTourney.registrations || []).some((r: any) => r.result !== null);
  const isRaceFinished = effectiveClubNow() >= new Date(currentTourney.raceDate) || isClosedReg || hasExistingResults;
  const canRecord = isClubManager && isClosedReg && !isCompleted;
  const isReadOnly = isCompleted || !isClubManager || !isClosedReg;

  function handleFieldChange(index: number, field: string, val: any) {
    if (isReadOnly) return;
    setRows((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: val };
      if (field === "finishTimeSeconds") {
        target.avgSpeedKmh = val > 0 ? Number(((currentTourney.distanceMeters / Number(val)) * 3.6).toFixed(2)) : "";
      } else if (field === "finalRank") {
        const pool = currentTourney.prizePool || 0;
        if (pool > 0) {
          if (val === 1) target.prizeMoneyWon = Math.round(pool * 0.5);
          else if (val === 2) target.prizeMoneyWon = Math.round(pool * 0.3);
          else if (val === 3) target.prizeMoneyWon = Math.round(pool * 0.2);
          else if (typeof val === "number" && val > 3) target.prizeMoneyWon = 0;
          else if (val === "") target.prizeMoneyWon = "";
        }
        if (!target.officialNotes || ["Quán quân", "Á quân", "Hạng ba", "Hạng 3", "Hoàn thành chặng đua"].includes(target.officialNotes) || target.officialNotes.startsWith("Hạng ")) {
          if (val === 1) target.officialNotes = "Quán quân";
          else if (val === 2) target.officialNotes = "Á quân";
          else if (val === 3) target.officialNotes = "Hạng 3";
          else if (typeof val === "number" && val > 3) target.officialNotes = `Hạng ${val}`;
          else if (val === "") target.officialNotes = "";
        }
      }
      next[index] = target;
      return next;
    });
  }

  async function handleLockResults() {
    if (rows.length === 0) {
      setError(tr("No registered horses to record results for"));
      return;
    }

    if (!isClubManager) {
      setError(tr("Only the Club Manager has the authority to record or edit tournament results."));
      return;
    }

    if (currentTourney.status !== "CLOSED_REGISTRATION") {
      setError(
        isVietnamese()
          ? "Chỉ có thể ghi nhận và khóa kết quả khi giải đấu đã đóng đăng ký."
          : tr("Results can only be recorded or locked when tournament status is CLOSED_REGISTRATION.")
      );
      return;
    }

    if (!isRaceFinished) {
      setError(
        isVietnamese()
          ? "Không thể khóa kết quả trước thời điểm diễn ra giải đấu."
          : tr("Cannot lock results before raceDate has arrived.")
      );
      return;
    }
    if (
      rows.some(
        (r) =>
          r.finalRank === "" ||
          !Number.isInteger(r.finalRank) ||
          r.finalRank < 1 ||
          r.finishTimeSeconds === "" ||
          r.finishTimeSeconds <= 0 ||
          (r.prizeMoneyWon !== "" && r.prizeMoneyWon < 0),
      )
    ) {
      setError(
        isVietnamese()
          ? "Vui lòng nhập đầy đủ thứ hạng và thời gian về đích hợp lệ cho từng ngựa."
          : tr("Enter a valid rank, finish time and prize for every horse. Use 0 when no prize was awarded."),
      );
      return;
    }

    setShowConfirmLock(true);
  }

  async function executeSave() {
    setLoading(true);
    setError(null);
    try {
      const resultsPayload: SingleResultInput[] = rows.map((r) => {
        let notes = r.officialNotes.trim();
        if (r.simOrigin === "QUICK_SIM" && !notes.includes("Đo nhanh")) {
          notes = notes ? `${notes} · Đo nhanh` : "TMEC Simulator (Đo nhanh)";
        } else if (r.simOrigin === "SIMULATOR_2D" && !notes.includes("mô phỏng 2D")) {
          notes = notes ? `${notes} · mô phỏng 2D` : "Ghi nhận từ mô phỏng 2D chính thức";
        }

        return {
          registrationId: r.registrationId,
          finalRank: Number(r.finalRank),
          finishTimeSeconds: Number(r.finishTimeSeconds),
          avgSpeedKmh: r.avgSpeedKmh === "" ? undefined : r.avgSpeedKmh,
          prizeMoneyWon: r.prizeMoneyWon === "" ? 0 : Number(r.prizeMoneyWon),
          officialNotes: notes || undefined,
        };
      });

      await recordRaceResults(tournament.id, resultsPayload, true);
      setShowConfirmLock(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(localizeServerText(err?.message) || tr("Failed to record race results"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <Modal
      title={isCompleted ? tr("Official Race Results (Locked)") : tr("Record Race Execution & Official Results")}
      subtitle={`${currentTourney.name} · ${currentTourney.distanceMeters}m (${tr(currentTourney.trackType)})`}
      width={960}
      onClose={loading ? undefined : onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div>
            {isCompleted ? (
              <Badge tone="ok" icon="trophy">{tr("Official Results Locked")}</Badge>
            ) : canRecord ? (
              <Badge tone="warn">{tr("Club Manager: Authorized to Record & Lock")}</Badge>
            ) : !isClosedReg ? (
              <Badge tone="neutral">{isVietnamese() ? "Đang mở đăng ký (Chưa thể chốt)" : tr("Registration Open (Results Locked)")}</Badge>
            ) : !isRaceFinished ? (
              <Badge tone="neutral">{tr("Awaiting Race Date")}</Badge>
            ) : (
              <Badge tone="neutral">{tr("Read Only")}</Badge>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {isReadOnly ? (
              <Button tone="primary" onClick={onClose}>
                {tr("Close")}
              </Button>
            ) : (
              <>
                <Button tone="secondary" onClick={onClose} disabled={loading}>
                  {tr("Cancel")}
                </Button>
                <Button tone="primary" onClick={handleLockResults} disabled={loading || loadingDetail || rows.length === 0}>
                  {loading
                    ? (isVietnamese() ? "Đang khóa..." : tr("Locking..."))
                    : (isVietnamese() ? "Khóa kết quả chính thức" : tr("Lock Official Results"))}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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

        {!isCompleted && !isClosedReg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--warn-bg, #fffbeb)",
              color: "var(--warn-ink, #b45309)",
              borderRadius: "var(--r-sm, 6px)",
              fontSize: "var(--fs-sm, 0.875rem)",
              border: "1px solid var(--warn-border, #fcd34d)",
            }}
          >
            {tr("Results can only be recorded or locked after registration closes.")}
          </div>
        )}

        {!isCompleted && isClosedReg && !isRaceFinished && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--warn-bg, #fffbeb)",
              color: "var(--warn-ink, #b45309)",
              borderRadius: "var(--r-sm, 6px)",
              fontSize: "var(--fs-sm, 0.875rem)",
              border: "1px solid var(--warn-border, #fcd34d)",
            }}
          >
            {tr("Official results can only be recorded on or after the race date:")} {new Date(currentTourney.raceDate).toLocaleString()}
          </div>
        )}

        {loadingDetail ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
            {tr("Loading race entries and results...")}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted)", background: "var(--surface)", borderRadius: "var(--r-md)", border: "1px dashed var(--border)" }}>
            <Icon name="flag" size={32} style={{ margin: "0 auto 0.5rem" }} />
            <strong style={{ display: "block", color: "var(--ink)", fontSize: "var(--fs-body)", marginBottom: "0.25rem" }}>
              {tr("No results or entries for this tournament")}
            </strong>
            <p style={{ margin: 0, fontSize: "var(--fs-sm)" }}>
              {isCompleted
                ? tr("This completed tournament has no recorded horse results.")
                : tr("No horses are registered. Register horses before recording results.")}
            </p>
          </div>
        ) : (
          <div>
            {draftSummary && draftSummary.kind !== "NONE" && (
              <div style={{ marginBottom: "0.75rem" }}>
                <Alert
                  tone={isCompleted ? "ok" : draftSummary.kind === "MANUAL" ? "info" : "ok"}
                  title={
                    isCompleted
                      ? isVietnamese()
                        ? "Kết quả thi đấu chính thức đã được phê chuẩn"
                        : "Official Race Results Approved & Locked"
                      : draftSummary.kind === "SIMULATOR_2D"
                        ? isVietnamese()
                          ? `Đã chạy mô phỏng · Đã tự động nạp ${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa vào biểu mẫu`
                          : `Simulation completed · Auto-imported ${draftSummary.recordedCount}/${draftSummary.activeCount} entries`
                        : draftSummary.kind === "QUICK_SIM"
                          ? isVietnamese()
                            ? `Đã chạy mô phỏng (Nhanh) · Đã tự động điền ${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa vào biểu mẫu`
                            : `Quick simulation imported · Auto-filled ${draftSummary.recordedCount}/${draftSummary.activeCount} entries`
                          : isVietnamese()
                            ? `Kết quả thi đấu (${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa) · Chưa khóa chính thức`
                            : `Race results (${draftSummary.recordedCount}/${draftSummary.activeCount} entries) · Pending lock`
                  }
                >
                  {isCompleted
                    ? isVietnamese()
                      ? "Kết quả giải đấu đã được khóa chính thức và quyết toán tiền thưởng thành công (85% Chủ ngựa; 15% Huấn luyện viên = 10% huấn luyện + 5% phần nài vì HLV kiêm nài)."
                      : "Official results are locked and prize payouts have been settled (85% Owner; 15% Trainer = 10% training + 5% riding share, since the trainer rides)."
                    : isVietnamese()
                      ? "Các chỉ số Hạng, Thời gian, Tốc độ và Tiền thưởng dự kiến đã sẵn sàng trong bảng dưới. Bạn có thể chỉnh sửa trực tiếp trước khi bấm \"Khóa kết quả chính thức\"."
                      : "Rank, Time, Speed, and projected Prizes are loaded below. You can edit any field before locking official results."}
                </Alert>
              </div>
            )}
            {!isReadOnly && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0.6rem",
                  background: isEditing ? "rgba(245, 158, 11, 0.08)" : "var(--surface-2, rgba(0, 0, 0, 0.02))",
                  borderRadius: "var(--r-sm, 6px)",
                  border: isEditing ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid var(--border)",
                  marginBottom: "0.625rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--fs-xs, 0.75rem)" }}>
                  <Icon name={isEditing ? "edit" : "lock"} size={14} style={{ color: isEditing ? "var(--warn-ink, #b45309)" : "var(--muted)" }} />
                  <span style={{ color: isEditing ? "var(--warn-ink, #b45309)" : "var(--muted)", fontWeight: 500 }}>
                    {isEditing
                      ? (isVietnamese() ? "Đang bật chế độ chỉnh sửa — Bạn có thể sửa trực tiếp các ô bên dưới." : "Edit mode active — You can edit fields below.")
                      : (isVietnamese() ? "Bảng thành tích đang khóa xem. Bấm bút chì để điều chỉnh thủ công nếu cần." : "Results table is locked for viewing. Click edit to adjust manually.")}
                  </span>
                </div>
                <Button
                  tone={isEditing ? "primary" : "secondary"}
                  size="sm"
                  icon="edit"
                  onClick={() => setIsEditing((prev) => !prev)}
                >
                  {isEditing
                    ? (isVietnamese() ? "Xong (Khóa xem)" : "Done (Lock)")
                    : (isVietnamese() ? "Chỉnh sửa kết quả" : "Edit Results")}
                </Button>
              </div>
            )}
            <div style={{ maxHeight: "380px", overflow: "auto", width: "100%" }}>
            <table style={{ width: "100%", minWidth: "800px", tableLayout: "fixed", borderCollapse: "collapse", fontSize: "var(--fs-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "0.5rem", width: "18%", whiteSpace: "normal" }}>{tr("Horse")}</th>
                  <th style={{ padding: "0.5rem", width: "12%", whiteSpace: "normal" }}>{tr("Rank")}</th>
                  <th style={{ padding: "0.5rem", width: "12%", whiteSpace: "normal" }}>{tr("Time (s)")}</th>
                  <th style={{ padding: "0.5rem", width: "13%", whiteSpace: "normal" }}>{tr("Speed (km/h)")}</th>
                  <th style={{ padding: "0.5rem", width: "20%", whiteSpace: "normal" }}>{tr("Prize Won (VND)")}</th>
                  <th style={{ padding: "0.5rem", width: "25%", whiteSpace: "normal" }}>{tr("Official Notes")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const cellReadOnly = isReadOnly || !isEditing;
                  return (
                    <tr key={row.registrationId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.625rem 0.5rem", fontWeight: 700, color: "var(--ink)", wordBreak: "break-word" }}>
                        {row.horseName}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {cellReadOnly ? (
                          row.finalRank === 1 ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "#b45309", background: "rgba(245, 158, 11, 0.15)", padding: "2px 8px", borderRadius: "12px", fontSize: "var(--fs-xs)" }}>
                              🏆 #1
                            </span>
                          ) : row.finalRank === 2 ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "#475569", background: "rgba(100, 116, 139, 0.15)", padding: "2px 8px", borderRadius: "12px", fontSize: "var(--fs-xs)" }}>
                              🥈 #2
                            </span>
                          ) : row.finalRank === 3 ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "#92400e", background: "rgba(180, 83, 9, 0.12)", padding: "2px 8px", borderRadius: "12px", fontSize: "var(--fs-xs)" }}>
                              🥉 #3
                            </span>
                          ) : (
                            <strong style={{ color: "var(--muted)" }}>
                              {row.finalRank === "" ? "—" : `#${row.finalRank}`}
                            </strong>
                          )
                        ) : (
                          <input
                            type="number"
                            aria-label={`${tr("Rank")} — ${row.horseName}`}
                            min={1}
                            value={row.finalRank}
                            onChange={(e) => handleFieldChange(idx, "finalRank", e.target.value === "" ? "" : Number(e.target.value))}
                            style={{
                              width: "100%",
                              padding: "0.375rem 0.5rem",
                              borderRadius: "var(--r-sm, 4px)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--ink)",
                            }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {cellReadOnly ? (
                          <span>{row.finishTimeSeconds === "" ? "—" : `${formatNumber(row.finishTimeSeconds, 2)}s`}</span>
                        ) : (
                          <input
                            type="number"
                            aria-label={`${tr("Time (s)")} — ${row.horseName}`}
                            step={0.01}
                            min={1}
                            value={row.finishTimeSeconds}
                            onChange={(e) =>
                              handleFieldChange(idx, "finishTimeSeconds", e.target.value === "" ? "" : Number(e.target.value))
                            }
                            style={{
                              width: "100%",
                              padding: "0.375rem 0.5rem",
                              borderRadius: "var(--r-sm, 4px)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--ink)",
                            }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "0.5rem", fontWeight: 600, color: "var(--brand-700)" }}>
                        {cellReadOnly ? (
                          <span>{row.avgSpeedKmh === "" ? "—" : `${formatNumber(row.avgSpeedKmh, 2)} km/h`}</span>
                        ) : (
                          <input
                            type="number"
                            aria-label={`${tr("Speed (km/h)")} — ${row.horseName}`}
                            step={0.01}
                            min={1}
                            value={row.avgSpeedKmh}
                            onChange={(e) =>
                              handleFieldChange(idx, "avgSpeedKmh", e.target.value === "" ? "" : Number(e.target.value))
                            }
                            style={{
                              width: "100%",
                              padding: "0.375rem 0.5rem",
                              borderRadius: "var(--r-sm, 4px)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--brand-700)",
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "0.5rem", wordBreak: "break-word" }}>
                        {cellReadOnly ? (
                          <span style={{ fontWeight: 700, color: row.prizeMoneyWon !== "" && row.prizeMoneyWon > 0 ? "var(--brand-700)" : "var(--muted)", whiteSpace: "nowrap" }}>
                            {row.prizeMoneyWon === "" || row.prizeMoneyWon === 0 ? "0 đ" : formatVND(row.prizeMoneyWon)}
                          </span>
                        ) : (
                          <input
                            type="text"
                            inputMode="numeric"
                            aria-label={`${tr("Prize Won (VND)")} — ${row.horseName}`}
                            placeholder="0"
                            value={row.prizeMoneyWon === "" ? "" : Number(row.prizeMoneyWon).toLocaleString("vi-VN")}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              handleFieldChange(idx, "prizeMoneyWon", raw === "" ? "" : Number(raw));
                            }}
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: "0.375rem 0.5rem",
                              borderRadius: "var(--r-sm, 4px)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--ink)",
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "0.5rem", wordBreak: "break-word" }}>
                        {cellReadOnly ? (
                          <span style={{
                            color: row.finalRank === 1 ? "var(--brand-700)" : "var(--ink)",
                            fontWeight: typeof row.finalRank === "number" && row.finalRank <= 3 ? 600 : 400,
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            lineHeight: 1.4,
                            fontSize: "var(--fs-xs)",
                          }}>
                            {row.officialNotes || "—"}
                          </span>
                        ) : (
                          <input
                            type="text"
                            aria-label={`${tr("Official Notes")} — ${row.horseName}`}
                            placeholder={isVietnamese() ? "Ví dụ: Quán quân, Á quân, Hạng ba..." : "e.g. Champion, Runner-up..."}
                            value={row.officialNotes}
                            onChange={(e) => handleFieldChange(idx, "officialNotes", e.target.value)}
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding: "0.375rem 0.5rem",
                              borderRadius: "var(--r-sm, 4px)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--ink)",
                              fontSize: "var(--fs-xs)",
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {(() => {
              // Ngựa rút / bị loại không có kết quả: liệt kê để số ngựa khớp với số đăng ký.
              const excluded = (currentTourney.registrations ?? []).filter(
                (r) => r.status === "SCRATCHED_MEDICAL" || r.status === "DISQUALIFIED",
              );
              if (excluded.length === 0) return null;
              return (
                <p style={{ margin: "0.5rem 0 0", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                  {isVietnamese() ? "Không có kết quả: " : "No result: "}
                  {excluded
                    .map((r) => `${r.horse.name} (${r.status === "DISQUALIFIED" ? (isVietnamese() ? "bị loại" : "disqualified") : (isVietnamese() ? "rút vì y tế" : "medical scratch")})`)
                    .join(", ")}
                </p>
              );
            })()}
          </div>
        )}
      </div>
    </Modal>
    {showConfirmLock && (
      <Modal
        title={isVietnamese() ? "Xác nhận khóa kết quả chính thức" : "Confirm Official Results Lock"}
        subtitle={`${currentTourney.name} · ${currentTourney.distanceMeters}m (${tr(currentTourney.trackType)})`}
        tone="warn"
        width={560}
        onClose={() => setShowConfirmLock(false)}
        foot={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
            <Button tone="secondary" onClick={() => setShowConfirmLock(false)} disabled={loading}>
              {tr("Cancel")}
            </Button>
            <Button tone="primary" onClick={executeSave} disabled={loading}>
              {loading
                ? (isVietnamese() ? "Đang khóa..." : "Locking...")
                : (isVietnamese() ? "Xác nhận & Khóa chính thức" : "Confirm & Lock Official Results")}
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--ink)", lineHeight: 1.5 }}>
            {isVietnamese()
              ? "Bạn đang chuẩn bị khóa chính thức kết quả cho giải đấu này. Vui lòng kiểm tra kỹ các thông tin sau:"
              : "You are about to officially lock the tournament results. Please verify the following summary:"}
          </p>

          {/* Podium preview */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "0.75rem 1rem" }}>
            <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              {isVietnamese() ? "Bảng vinh danh dự kiến" : "Podium Placements"}
            </div>
            {rows.slice(0, 3).map((r) => (
              <div key={r.registrationId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px dashed var(--border)", fontSize: "var(--fs-sm)" }}>
                <span>
                  <strong>{r.finalRank === 1 ? "🏆 #1" : r.finalRank === 2 ? "🥈 #2" : "🥉 #3"}</strong> {r.horseName} <span style={{ color: "var(--muted)", fontSize: "var(--fs-xs)" }}>({r.officialNotes || (r.finalRank === 1 ? "Quán quân" : r.finalRank === 2 ? "Á quân" : "Hạng ba")})</span>
                </span>
                <strong style={{ color: "var(--brand-700)" }}>{formatVND(r.prizeMoneyWon || 0)}</strong>
              </div>
            ))}
          </div>

          {/* Payout & Status Explanation */}
          <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "var(--r-md)", padding: "0.75rem 1rem", fontSize: "var(--fs-xs)", color: "var(--warn-ink, #b45309)" }}>
            <strong style={{ display: "block", marginBottom: "0.35rem" }}>
              {isVietnamese() ? "Quy chế phân bổ tiền thưởng & Quyết toán tự động:" : "Prize Allocation Rules:"}
            </strong>
            <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0, lineHeight: 1.6 }}>
              <li>{isVietnamese() ? "85% tiền thưởng chuyển về Chủ ngựa (Owner)" : "85% payout to Horse Owner"}</li>
              <li>{isVietnamese() ? "10% tiền thưởng chuyển về Huấn luyện viên (Trainer)" : "10% payout to Trainer"}</li>
              <li>{isVietnamese() ? "5% phần nài cũng về Huấn luyện viên (HLV kiêm nài)" : "5% jockey share, also to the Trainer (the trainer rides)"}</li>
            </ul>
            <div style={{ marginTop: "0.5rem", fontWeight: 600, color: "var(--danger, #dc2626)" }}>
              {isVietnamese()
                ? "⚠️ Lưu ý: Giải đấu sẽ chuyển sang HOÀN THÀNH và không thể hoàn tác sau khi đã khóa."
                : "⚠️ Tournament status will become COMPLETED and cannot be undone."}
            </div>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}

