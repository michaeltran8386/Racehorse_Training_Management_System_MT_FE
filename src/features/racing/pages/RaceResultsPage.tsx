import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import styles from "./RaceResultsPage.module.css";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { tr } from "@/shared/i18n/tr";
import { messageFor } from "@/shared/lib/messages";
import { formatDate, formatVND } from "@/shared/lib/format";
import { useAppLanguage } from "@/shared/lib/language";
import { fetchTournaments, fetchTournamentDetail } from "../api";
import type { Tournament } from "../types";

export default function RaceResultsPage() {
  useScreenTranslation();
  useAppLanguage();
  const isOwner = useCurrentUser().role === "HORSE_OWNER";
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [detail, setDetail] = useState<{ id: string; tournament: Tournament | null; error: string } | null>(null);
  const [detailRetry, setDetailRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCompletedTournaments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchTournaments({ status: "COMPLETED" });
      const completedList = res.items;
      setTournaments(completedList);
      if (completedList.length > 0) {
        setSelectedTournamentId(completedList[0].id);
      }
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompletedTournaments();
  }, [loadCompletedTournaments]);

  useEffect(() => {
    if (!selectedTournamentId) return;
    let active = true;
    setDetail(null);
    fetchTournamentDetail(selectedTournamentId)
      .then((tournament) => { if (active) setDetail({ id: selectedTournamentId, tournament, error: "" }); })
      .catch((err) => { if (active) setDetail({ id: selectedTournamentId, tournament: null, error: messageFor(err) }); });
    return () => { active = false; };
  }, [selectedTournamentId, detailRetry]);

  const currentDetail = detail?.id === selectedTournamentId ? detail : null;
  const selectedTournament = currentDetail?.tournament ?? null;

  const finishedRegistrations = (selectedTournament?.registrations ?? [])
    .filter((r) => r.result)
    .sort((a, b) => (a.result?.finalRank ?? 99) - (b.result?.finalRank ?? 99));

  const firstPlace = finishedRegistrations.find((entry) => entry.result?.finalRank === 1);
  const secondPlace = finishedRegistrations.find((entry) => entry.result?.finalRank === 2);
  const thirdPlace = finishedRegistrations.find((entry) => entry.result?.finalRank === 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={tr("Race Results")}
        description={tr(
          isOwner ? "Results recorded for your horses in completed events." : "Official tournament standings, sprint speeds, and prize distributions.",
        )}
      />

      {loading ? (
        <SkeletonTable columns={5} rows={5} />
      ) : error ? (
        <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => void loadCompletedTournaments()}>{tr("Try again")}</Button>}>{error}</Alert>
      ) : tournaments.length === 0 ? (
        <Card pad={32}>
          <EmptyState
            title={tr("No Completed Tournaments Yet")}
            description={tr("Race results and champion podiums will appear here once official results are locked.")}
          />
        </Card>
      ) : (
        <>
          {/* Tournament Selector */}
          <Card pad={16}>
            <div className={styles.selectorBar}>
              <div className={styles.selectorField}>
                <label htmlFor="results-tournament">
                  {tr("Select Championship Event:")}
                </label>
                <select
                  id="results-tournament"
                  value={selectedTournamentId}
                  onChange={(e) => setSelectedTournamentId(e.target.value)}
                  className={styles.select}
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({formatDate(t.raceDate)} · {t.distanceMeters}m)
                    </option>
                  ))}
                </select>
              </div>

              {selectedTournament && (
                <div className={styles.eventMeta}>
                  <span>{selectedTournament.location}</span>
                  <span>{selectedTournament.distanceMeters}m ({tr(selectedTournament.trackType)})</span>
                  <span>{tr("Purse:")} {formatVND(selectedTournament.prizePool)}</span>
                </div>
              )}
            </div>
          </Card>

          {!currentDetail ? <SkeletonTable columns={5} rows={5} /> : currentDetail.error ? (
            <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => setDetailRetry((n) => n + 1)}>{tr("Try again")}</Button>}>{currentDetail.error}</Alert>
          ) : <>
          {/* Podium for Top 3 */}
          {(firstPlace || secondPlace || thirdPlace) && (
            <div className={styles.podium}>
              {/* Gold 1st */}
              {firstPlace && <Card pad={20} className={styles.champion}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className={styles.podiumHeading}>
                    <span className={styles.podiumLabel}>
                      {tr("CHAMPION / 1ST PLACE")}
                    </span>
                    <Badge tone="ok">{firstPlace.result?.avgSpeedKmh} km/h</Badge>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "var(--fs-kpi, 1.25rem)", fontWeight: 800, color: "var(--ink)" }}>
                      {firstPlace.horse.name}
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                      {firstPlace.horse.breed} · #{firstPlace.horse.horseCode || "N/A"}
                    </p>
                  </div>
                  <div className={styles.podiumStat}>
                    <span style={{ color: "var(--muted)" }}>{tr("Finish Time:")}</span>
                    <strong>{firstPlace.result?.finishTimeSeconds}s</strong>
                  </div>
                  <div className={styles.podiumStat}>
                    <span style={{ color: "var(--muted)" }}>{tr("Prize Won:")}</span>
                    <strong style={{ color: "var(--brand-700)" }}>
                      {formatVND(firstPlace.result?.prizeMoneyWon)}
                    </strong>
                  </div>
                  {firstPlace.result?.officialNotes && (
                    <p style={{ margin: 0, fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                      "{firstPlace.result.officialNotes}"
                    </p>
                  )}
                </div>
              </Card>}

              {/* Silver 2nd */}
              {secondPlace && (
                <Card pad={20}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div className={styles.podiumHeading}>
                      <span className={styles.podiumLabel}>
                        {tr("RUNNER-UP / 2ND PLACE")}
                      </span>
                      <Badge tone="neutral">{secondPlace.result?.avgSpeedKmh} km/h</Badge>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "var(--fs-kpi, 1.25rem)", fontWeight: 800, color: "var(--ink)" }}>
                        {secondPlace.horse.name}
                      </h3>
                      <p style={{ margin: "2px 0 0 0", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                        {secondPlace.horse.breed} · #{secondPlace.horse.horseCode || "N/A"}
                      </p>
                    </div>
                    <div className={styles.podiumStat}>
                      <span style={{ color: "var(--muted)" }}>{tr("Finish Time:")}</span>
                      <strong>{secondPlace.result?.finishTimeSeconds}s</strong>
                    </div>
                    <div className={styles.podiumStat}>
                      <span style={{ color: "var(--muted)" }}>{tr("Prize Won:")}</span>
                      <strong style={{ color: "var(--brand-700)" }}>
                        {formatVND(secondPlace.result?.prizeMoneyWon)}
                      </strong>
                    </div>
                  </div>
                </Card>
              )}

              {/* Bronze 3rd */}
              {thirdPlace && (
                <Card pad={20}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div className={styles.podiumHeading}>
                      <span className={styles.podiumLabel}>
                        {tr("3RD PLACE")}
                      </span>
                      <Badge tone="neutral">{thirdPlace.result?.avgSpeedKmh} km/h</Badge>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "var(--fs-kpi, 1.25rem)", fontWeight: 800, color: "var(--ink)" }}>
                        {thirdPlace.horse.name}
                      </h3>
                      <p style={{ margin: "2px 0 0 0", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                        {thirdPlace.horse.breed} · #{thirdPlace.horse.horseCode || "N/A"}
                      </p>
                    </div>
                    <div className={styles.podiumStat}>
                      <span style={{ color: "var(--muted)" }}>{tr("Finish Time:")}</span>
                      <strong>{thirdPlace.result?.finishTimeSeconds}s</strong>
                    </div>
                    <div className={styles.podiumStat}>
                      <span style={{ color: "var(--muted)" }}>{tr("Prize Won:")}</span>
                      <strong style={{ color: "var(--brand-700)" }}>
                        {formatVND(thirdPlace.result?.prizeMoneyWon)}
                      </strong>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Complete Final Standings Table */}
          <Card pad={20}>
            <h3 className={styles.sectionTitle}>
              {tr(isOwner ? "Your horses' results" : "Complete Official Standings")}
            </h3>

            {finishedRegistrations.length === 0 ? (
              <p style={{ color: "var(--muted)", margin: 0 }}>{tr(isOwner ? "No results for your horses in this event." : "No finishes recorded for this tournament.")}</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className={styles.table}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Rank")}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Horse")}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Owner")}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Finish Time")}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Avg Speed")}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Prize Won")}</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Official Verdict / Notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finishedRegistrations.map((reg) => (
                      <tr key={reg.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 700 }}>
                          #{reg.result?.finalRank}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          <strong style={{ color: "var(--ink)" }}>{reg.horse.name}</strong>
                          <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", display: "block" }}>
                            {reg.horse.breed}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", color: "var(--muted)" }}>
                          {reg.horse.owner?.fullName || tr("Club Owned")}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>
                          {reg.result?.finishTimeSeconds}s
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", color: "var(--brand-700)", fontWeight: 700 }}>
                          {reg.result?.avgSpeedKmh} km/h
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>
                          {reg.result?.prizeMoneyWon != null ? formatVND(reg.result.prizeMoneyWon) : "—"}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", color: "var(--muted)" }}>
                          {reg.result?.officialNotes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          </>}
        </>
      )}
    </div>
  );
}
