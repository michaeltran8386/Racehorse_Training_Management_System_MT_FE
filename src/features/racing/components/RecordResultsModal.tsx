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
  startTournamentSimulation,
  quickSimulateTournamentRace,
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
    }>
  >([]);
  const [detailTournament, setDetailTournament] = useState<Tournament | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [simBusy, setSimBusy] = useState(false);
  const [draftSummary, setDraftSummary] = useState<ResultDraftSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const simLaunchedRef = useRef(false);
  const prevDraftSigRef = useRef("");
  const lastSyncRef = useRef(0);
  const toastRef = useRef(toast);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    toastRef.current = toast;
    onSuccessRef.current = onSuccess;
  }, [toast, onSuccess]);
  const tournamentId = tournament?.id;

  const loadTournamentData = useCallback((silent = false, notifyOnSimSync = false) => {
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

            return {
              registrationId: reg.id,
              horseName: reg.horse.name,
              finalRank: rank,
              finishTimeSeconds: existing?.finishTimeSeconds ?? "",
              avgSpeedKmh: existing?.avgSpeedKmh ?? "",
              prizeMoneyWon: prize,
              officialNotes: existing?.officialNotes ?? "",
            };
          });
          setRows(initial);
        } else {
          setRows([]);
        }

        if (notifyOnSimSync) {
          if (summary.kind !== "NONE" && summary.signature !== prevDraftSigRef.current) {
            prevDraftSigRef.current = summary.signature;
            simLaunchedRef.current = false;
            toastRef.current.show(
              isVietnamese()
                ? `Đã tự động đồng bộ kết quả mô phỏng 2D (${summary.recordedCount}/${summary.activeCount} ngựa) vào biểu mẫu! Vui lòng kiểm tra trước khi bấm "Khóa kết quả chính thức".`
                : `2D simulation results auto-imported (${summary.recordedCount}/${summary.activeCount} entries)! Review before locking official results.`,
              "ok",
              { durationMs: 6500 },
            );
            onSuccessRef.current();
          }
        } else {
          prevDraftSigRef.current = summary.signature;
        }
      })
      .catch((err) => setError(localizeServerText(err?.message) || tr("Failed to load tournament registrations")))
      .finally(() => {
        if (!silent) setLoadingDetail(false);
      });
  }, [tournamentId]);

  useEffect(() => {
    if (!isOpen || !tournamentId) {
      simLaunchedRef.current = false;
      prevDraftSigRef.current = "";
      return;
    }
    loadTournamentData();
  }, [tournamentId, isOpen, loadTournamentData]);

  // Tự động đồng bộ lại số liệu khi người dùng quay về từ tab Simulator 2D
  useEffect(() => {
    if (!isOpen) return;
    const syncFromSimulator = () => {
      if (!simLaunchedRef.current || document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastSyncRef.current < 800) return;
      lastSyncRef.current = now;
      loadTournamentData(true, true);
    };
    window.addEventListener("focus", syncFromSimulator);
    document.addEventListener("visibilitychange", syncFromSimulator);
    return () => {
      window.removeEventListener("focus", syncFromSimulator);
      document.removeEventListener("visibilitychange", syncFromSimulator);
    };
  }, [isOpen, loadTournamentData]);

  if (!isOpen) return null;

  const currentTourney = detailTournament ?? tournament;
  const isCompleted = currentTourney.status === "COMPLETED";
  const isClosedReg = currentTourney.status === "CLOSED_REGISTRATION";
  const hasExistingResults = (currentTourney.registrations || []).some((r: any) => r.result !== null);
  const isRaceFinished = new Date() >= new Date(currentTourney.raceDate) || isClosedReg || hasExistingResults;
  const canRecord = isClubManager && isClosedReg && !isCompleted;
  const isReadOnly = isCompleted || !isClubManager || !isClosedReg;

  async function handleOpen2DSimulator() {
    setSimBusy(true);
    setError(null);
    const hasDraftBefore = Boolean(draftSummary && draftSummary.kind !== "NONE");
    prevDraftSigRef.current = draftSummary?.signature ?? "";
    try {
      const res = await startTournamentSimulation(currentTourney.id);
      simLaunchedRef.current = true;
      window.open(res.launchUrl, "_blank");
      toast.show(
        hasDraftBefore && draftSummary
          ? isVietnamese()
            ? `Đã mở trường đua 2D (${currentTourney.distanceMeters}m). Lưu ý: biểu mẫu hiện đã có kết quả nháp (${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa) — khi cuộc đua 2D mới hoàn tất và bạn quay lại đây, số liệu mới sẽ tự động cập nhật thay thế.`
            : `Opened 2D Simulator (${currentTourney.distanceMeters}m). Existing draft (${draftSummary.recordedCount}/${draftSummary.activeCount} entries) will be replaced automatically when you return after finishing.`
          : isVietnamese()
            ? `Đã mở trường đua 2D (${currentTourney.distanceMeters}m). Sau khi ngựa cán đích trên tab Simulator, quay lại đây kết quả sẽ tự động đồng bộ vào biểu mẫu!`
            : `Opened 2D Simulator (${currentTourney.distanceMeters}m). Results will sync automatically when you return here after finishing!`,
        "ok",
        { durationMs: 6500 },
      );
    } catch (err: any) {
      setError(localizeServerText(err?.message) || (isVietnamese() ? "Không thể mở Simulator 2D" : "Failed to open 2D Simulator"));
    } finally {
      setSimBusy(false);
    }
  }

  async function handleQuickReading() {
    setSimBusy(true);
    setError(null);
    try {
      const res = await quickSimulateTournamentRace(currentTourney.id);
      const resultByReg = new Map(res.results.map((r) => [r.registrationId, r]));
      setRows((prev) =>
        prev.map((row) => {
          const sim = resultByReg.get(row.registrationId);
          if (!sim) return row;
          return {
            ...row,
            finalRank: sim.finalRank,
            finishTimeSeconds: sim.finishTimeSeconds,
            avgSpeedKmh: sim.avgSpeedKmh,
            prizeMoneyWon: sim.prizeMoneyWon,
            officialNotes: sim.officialNotes,
          };
        }),
      );
      loadTournamentData(true, false);
      toast.show(
        isVietnamese()
          ? "Đã nạp chỉ số đua & tự động chia thưởng từ TMEC Simulator! Bạn có thể sửa trực tiếp các ô trước khi bấm Chốt kết quả."
          : "Race measurements & prizes loaded from TMEC Simulator! Review or edit any field before locking.",
        "ok",
      );
      onSuccess();
    } catch (err: any) {
      setError(localizeServerText(err?.message) || (isVietnamese() ? "Không thể lấy chỉ số nhanh từ Simulator" : "Failed to load quick simulation results"));
    } finally {
      setSimBusy(false);
    }
  }

  function handleFieldChange(index: number, field: string, val: any) {
    if (isReadOnly) return;
    setRows((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: val };
      if (field === "finishTimeSeconds") {
        target.avgSpeedKmh = val > 0 ? Math.round(((currentTourney.distanceMeters / Number(val)) * 3.6) * 100) / 100 : "";
      } else if (field === "finalRank") {
        const pool = currentTourney.prizePool || 0;
        if (pool > 0) {
          if (val === 1) target.prizeMoneyWon = Math.round(pool * 0.5);
          else if (val === 2) target.prizeMoneyWon = Math.round(pool * 0.3);
          else if (val === 3) target.prizeMoneyWon = Math.round(pool * 0.2);
          else if (typeof val === "number" && val > 3) target.prizeMoneyWon = 0;
          else if (val === "") target.prizeMoneyWon = "";
        }
      }
      next[index] = target;
      return next;
    });
  }

  async function handleSave(lock: boolean = false) {
    if (rows.length === 0) {
      setError(tr("No registered horses to record results for"));
      return;
    }

    if (!isClubManager) {
      setError(tr("Only the Club Manager has the authority to record or edit tournament results."));
      return;
    }

    if (currentTourney.status !== "CLOSED_REGISTRATION") {
      setError(tr("Results can only be drafted or locked when tournament status is CLOSED_REGISTRATION."));
      return;
    }

    if (!isRaceFinished) {
      setError(tr("Cannot draft or lock results before raceDate has arrived."));
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

    if (lock) {
      const confirmLock = window.confirm(
        isVietnamese()
          ? "Bạn có chắc muốn chốt chính thức kết quả giải đấu? Hành động này sẽ chuyển trạng thái giải sang HOÀN THÀNH, tự động phân bổ tiền thưởng theo tỷ lệ (85% Chủ ngựa, 10% HLV, 5% Nài) và ghi nhận vào Báo cáo tài chính."
          : "Are you sure you want to officially lock the race results? This will complete the tournament and distribute prize winnings (85% Owner, 10% Trainer, 5% Jockey).",
      );
      if (!confirmLock) return;
    }

    setLoading(true);
    setError(null);
    try {
      const resultsPayload: SingleResultInput[] = rows.map((r) => ({
        registrationId: r.registrationId,
        finalRank: Number(r.finalRank),
        finishTimeSeconds: Number(r.finishTimeSeconds),
        avgSpeedKmh: r.avgSpeedKmh === "" ? undefined : r.avgSpeedKmh,
        prizeMoneyWon: r.prizeMoneyWon === "" ? 0 : Number(r.prizeMoneyWon),
        officialNotes: r.officialNotes.trim() || undefined,
      }));

      await recordRaceResults(tournament.id, resultsPayload, lock);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(localizeServerText(err?.message) || tr("Failed to record race results"));
    } finally {
      setLoading(false);
    }
  }

  return (
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
              <Badge tone="neutral">{tr("Registration Open (Draft Locked)")}</Badge>
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
                <Button tone="quiet" onClick={() => handleSave(false)} disabled={loading || loadingDetail || rows.length === 0}>
                  {loading ? tr("Saving...") : tr("Save Draft")}
                </Button>
                <Button tone="primary" onClick={() => handleSave(true)} disabled={loading || loadingDetail || rows.length === 0}>
                  {loading ? tr("Locking...") : tr("Lock Official Results")}
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
                  tone={isCompleted || draftSummary.kind === "MANUAL" ? "info" : "ok"}
                  title={
                    isCompleted
                      ? isVietnamese()
                        ? `Kết quả chính thức · Nguồn: ${draftSummary.sourceLabelVi}`
                        : `Official Results · Source: ${draftSummary.sourceLabelEn}`
                      : draftSummary.kind === "SIMULATOR_2D"
                        ? isVietnamese()
                          ? `Đã chạy mô phỏng 2D · Đã tự động nhập ${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa vào biểu mẫu`
                          : `2D simulation completed · Auto-imported ${draftSummary.recordedCount}/${draftSummary.activeCount} entries`
                        : draftSummary.kind === "QUICK_SIM"
                          ? isVietnamese()
                            ? `Đã chạy Lấy kết quả nhanh · Đã tự động điền ${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa vào biểu mẫu`
                            : `Quick result imported · Auto-filled ${draftSummary.recordedCount}/${draftSummary.activeCount} entries`
                          : isVietnamese()
                            ? `Đã có bản nháp kết quả (${draftSummary.recordedCount}/${draftSummary.activeCount} ngựa) · Chưa khóa chính thức`
                            : `Draft results saved (${draftSummary.recordedCount}/${draftSummary.activeCount} entries) · Not locked`
                  }
                >
                  {isCompleted
                    ? isVietnamese()
                      ? "Kết quả giải đấu đã được khóa chính thức và quyết toán tiền thưởng."
                      : "Official results are locked and prize payouts have been settled."
                    : isVietnamese()
                      ? "Các chỉ số Hạng, Thời gian, Tốc độ và Tiền thưởng dự kiến đã sẵn sàng trong bảng dưới. Bạn vẫn có thể chỉnh sửa trực tiếp hoặc chạy lại mô phỏng trước khi bấm \"Khóa kết quả chính thức\"."
                      : "Rank, Time, Speed, and projected Prizes are loaded below. You can still edit any field or re-run simulation before locking official results."}
                </Alert>
              </div>
            )}
            {!isReadOnly && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem 1rem",
                  padding: "0.75rem 1rem",
                  marginBottom: "0.75rem",
                  background: "var(--surface-2, rgba(0, 0, 0, 0.02))",
                  borderRadius: "var(--r-md, 8px)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem", minWidth: 0 }}>
                  <span style={{ fontSize: "var(--fs-body, 0.875rem)", fontWeight: 700, color: "var(--ink)" }}>
                    {isVietnamese() ? "Thu thập số liệu giải đua" : "Simulator Data Collection"}
                  </span>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                    {isVietnamese()
                      ? `Quỹ thưởng: ${formatVND(currentTourney.prizePool || 0)} · Cự ly: ${currentTourney.distanceMeters}m`
                      : `Prize pool: ${formatVND(currentTourney.prizePool || 0)} · Distance: ${currentTourney.distanceMeters}m`}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flexShrink: 0 }}>
                  <Button
                    size="sm"
                    tone="secondary"
                    onClick={handleOpen2DSimulator}
                    disabled={simBusy || loading}
                  >
                    {isVietnamese() ? "Mở mô phỏng 2D" : "Open 2D Simulation"}
                  </Button>
                  <Button
                    size="sm"
                    tone="primary"
                    onClick={handleQuickReading}
                    disabled={simBusy || loading}
                  >
                    {simBusy
                      ? (isVietnamese() ? "Đang xử lý..." : "Calculating...")
                      : (isVietnamese() ? "Lấy kết quả nhanh" : "Quick Result Import")}
                  </Button>
                </div>
              </div>
            )}
            <div style={{ maxHeight: "380px", overflow: "auto", width: "100%" }}>
            <table style={{ width: "100%", minWidth: "800px", tableLayout: "fixed", borderCollapse: "collapse", fontSize: "var(--fs-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "0.5rem", width: "20%", whiteSpace: "normal" }}>{tr("Horse")}</th>
                  <th style={{ padding: "0.5rem", width: "11%", whiteSpace: "normal" }}>{tr("Rank")}</th>
                  <th style={{ padding: "0.5rem", width: "13%", whiteSpace: "normal" }}>{tr("Time (s)")}</th>
                  <th style={{ padding: "0.5rem", width: "13%", whiteSpace: "normal" }}>{tr("Speed (km/h)")}</th>
                  <th style={{ padding: "0.5rem", width: "18%", whiteSpace: "normal" }}>{tr("Prize Won (VND)")}</th>
                  <th style={{ padding: "0.5rem", width: "25%", whiteSpace: "normal" }}>{tr("Official Notes")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.registrationId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.625rem 0.5rem", fontWeight: 700, color: "var(--ink)", wordBreak: "break-word" }}>
                      {row.horseName}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {isReadOnly ? (
                        <strong style={{ color: row.finalRank === 1 ? "var(--brand-700)" : "inherit" }}>
                          {row.finalRank === "" ? "—" : `#${row.finalRank}`}
                        </strong>
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
                      {isReadOnly ? (
                        <span>{row.finishTimeSeconds === "" ? "—" : `${row.finishTimeSeconds}s`}</span>
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
                      {isReadOnly ? (
                        <span>{row.avgSpeedKmh === "" ? "—" : typeof row.avgSpeedKmh === "number" ? formatNumber(row.avgSpeedKmh, 2) : row.avgSpeedKmh}</span>
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
                      {isReadOnly ? (
                        <span style={{ fontWeight: 600, color: row.prizeMoneyWon !== "" && row.prizeMoneyWon > 0 ? "var(--brand-700)" : "var(--muted)", whiteSpace: "nowrap" }}>
                          {row.prizeMoneyWon === "" ? "—" : formatVND(row.prizeMoneyWon)}
                        </span>
                      ) : (
                        <input
                          type="number"
                          aria-label={`${tr("Prize Won (VND)")} — ${row.horseName}`}
                          step={1000000}
                          min={0}
                          value={row.prizeMoneyWon}
                          onChange={(e) =>
                            handleFieldChange(idx, "prizeMoneyWon", e.target.value === "" ? "" : Number(e.target.value))
                          }
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "0.375rem 0.5rem",
                            borderRadius: "var(--r-sm, 4px)",
                            border: "1px solid var(--border)",
                            background: "var(--surface)",
                            color: "var(--ink)",
                          }}
                        />
                      )}
                    </td>
                    <td style={{ padding: "0.5rem", wordBreak: "break-word" }}>
                      {isReadOnly ? (
                        <span style={{ color: "var(--muted)", wordBreak: "break-word", whiteSpace: "normal", lineHeight: 1.4, fontSize: "var(--fs-xs)" }}>
                          {row.officialNotes || "—"}
                        </span>
                      ) : (
                        <input
                          type="text"
                          aria-label={`${tr("Official Notes")} — ${row.horseName}`}
                          placeholder={tr("e.g. Broke out cleanly, strong stretch run")}
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
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

