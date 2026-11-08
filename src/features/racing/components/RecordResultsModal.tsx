import { vndUnit, formatVND } from "@/shared/lib/format";
import { useState, useEffect } from "react";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { localizeServerText, tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import { recordRaceResults, fetchTournamentDetail, type SingleResultInput } from "../api";
import type { Tournament } from "../types";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !tournament?.id) return;
    setLoadingDetail(true);
    setError(null);
    fetchTournamentDetail(tournament.id)
      .then((full) => {
        setDetailTournament(full);
        if (full.registrations && full.registrations.length > 0) {
          const activeRegs = full.registrations.filter((r) => r.status !== "SCRATCHED_MEDICAL");
          const initial: typeof rows = activeRegs.map((reg) => {
            const existing = reg.result;

            return {
              registrationId: reg.id,
              horseName: reg.horse.name,
              finalRank: existing?.finalRank ?? "",
              finishTimeSeconds: existing?.finishTimeSeconds ?? "",
              avgSpeedKmh: existing?.avgSpeedKmh ?? "",
              prizeMoneyWon: existing?.prizeMoneyWon ?? "",
              officialNotes: existing?.officialNotes ?? "",
            };
          });
          setRows(initial);
        } else {
          setRows([]);
        }
      })
      .catch((err) => setError(localizeServerText(err?.message) || tr("Failed to load tournament registrations")))
      .finally(() => setLoadingDetail(false));
  }, [tournament?.id, isOpen]);

  if (!isOpen) return null;

  const currentTourney = detailTournament ?? tournament;
  const isCompleted = currentTourney.status === "COMPLETED";
  const isClosedReg = currentTourney.status === "CLOSED_REGISTRATION";
  const isRaceFinished = new Date() >= new Date(currentTourney.raceDate);
  const canRecord = isClubManager && isClosedReg && isRaceFinished && !isCompleted;
  const isReadOnly = isCompleted || !isClubManager || !isClosedReg || !isRaceFinished;

  function handleFieldChange(index: number, field: string, val: any) {
    if (isReadOnly) return;
    setRows((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: val };
      if (field === "finishTimeSeconds") {
        target.avgSpeedKmh = val > 0 ? Math.round(((tournament.distanceMeters / Number(val)) * 3.6) * 100) / 100 : "";
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
    if (rows.some((r) => r.finalRank === "" || !Number.isInteger(r.finalRank) || r.finalRank < 1 || r.finishTimeSeconds === "" || r.finishTimeSeconds <= 0 || r.prizeMoneyWon === "" || r.prizeMoneyWon < 0)) {
      setError(tr("Enter a valid rank, finish time and prize for every horse. Use 0 when no prize was awarded."));
      return;
    }

    if (lock) {
      const confirmLock = window.confirm(
        tr(
          "Are you sure you want to officially lock the race results? This will complete the tournament, transition horses to RESTING, and auto-credit 70% prize winnings to owners.",
        ),
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
        prizeMoneyWon: Number(r.prizeMoneyWon),
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
                  <Icon name="lock" inline size={14} /> {loading ? tr("Locking...") : tr("Lock Official Results")}
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
            <Icon name="alert" inline size={14} /> {tr("Results can only be recorded or locked after registration closes.")}
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
            <Icon name="clock" inline size={14} /> {tr("Official results can only be recorded on or after the race date:")} {new Date(currentTourney.raceDate).toLocaleString()}
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
                      {row.avgSpeedKmh === "" ? "—" : row.avgSpeedKmh}
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
        )}
      </div>
    </Modal>
  );
}

