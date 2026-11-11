import type { TournamentRegistration } from "./types";

export type ResultDraftKind = "NONE" | "SIMULATOR_2D" | "QUICK_SIM" | "MANUAL";

export interface ResultDraftSummary {
  kind: ResultDraftKind;
  recordedCount: number;
  activeCount: number;
  sourceLabelVi: string;
  sourceLabelEn: string;
  latestUpdatedAt: string | null;
  signature: string;
  podium: Array<{
    registrationId: string;
    horseName: string;
    finalRank: number;
    finishTimeSeconds: number;
    avgSpeedKmh: number;
    isDnf: boolean;
  }>;
}

/**
 * Classifies recorded/draft tournament results by their origin notes
 * and summarizes podium placement and update signature.
 */
export function summarizeDraftResults(
  registrations?: TournamentRegistration[] | null,
): ResultDraftSummary {
  const activeRegs = (registrations ?? []).filter(
    (reg) => reg.status !== "SCRATCHED_MEDICAL",
  );
  const recordedRegs = activeRegs.filter((reg) => reg.result != null);

  if (recordedRegs.length === 0) {
    return {
      kind: "NONE",
      recordedCount: 0,
      activeCount: activeRegs.length,
      sourceLabelVi: "",
      sourceLabelEn: "",
      latestUpdatedAt: null,
      signature: "",
      podium: [],
    };
  }

  let latestQuickMs = -1;
  let latest2DMs = -1;
  let latestMs = 0;
  let latestUpdatedAt: string | null = null;

  for (const reg of recordedRegs) {
    const res = reg.result!;
    const notes = res.officialNotes ?? "";
    const stamp = res.updatedAt || res.createdAt;
    const ms = stamp ? Date.parse(stamp) : Number.NaN;
    const validMs = Number.isFinite(ms) ? ms : 0;

    if (notes.includes("Đo nhanh") || notes.includes("Quick")) {
      if (validMs >= latestQuickMs) latestQuickMs = validMs;
    } else if (
      notes.includes("mô phỏng 2D") ||
      notes.includes("Simulator 2D") ||
      notes.includes("DNF - Dừng thi đấu")
    ) {
      if (validMs >= latest2DMs) latest2DMs = validMs;
    }

    if (stamp && validMs >= latestMs) {
      latestMs = validMs;
      latestUpdatedAt = stamp;
    }
  }

  const kind: ResultDraftKind =
    latestQuickMs >= 0 && latest2DMs >= 0
      ? latest2DMs >= latestQuickMs
        ? "SIMULATOR_2D"
        : "QUICK_SIM"
      : latestQuickMs >= 0
        ? "QUICK_SIM"
        : latest2DMs >= 0
          ? "SIMULATOR_2D"
          : "MANUAL";

  const sourceLabelMap: Record<
    Exclude<ResultDraftKind, "NONE">,
    { vi: string; en: string }
  > = {
    SIMULATOR_2D: {
      vi: "Mô phỏng 2D (Trường đua 6 làn)",
      en: "2D Race Simulator (6-Lane Track)",
    },
    QUICK_SIM: {
      vi: "TMEC Simulator (Đo nhanh)",
      en: "TMEC Simulator (Quick Import)",
    },
    MANUAL: {
      vi: "Bản nháp đã lưu",
      en: "Saved Draft",
    },
  };

  const sorted = [...recordedRegs].sort(
    (a, b) => (a.result?.finalRank ?? 99) - (b.result?.finalRank ?? 99),
  );

  const podium = sorted.slice(0, 3).map((reg) => {
    const res = reg.result!;
    const rank = Number(res.finalRank ?? 99);
    const notes = res.officialNotes ?? "";
    return {
      registrationId: reg.id,
      horseName: reg.horse?.name ?? "Chiến mã",
      finalRank: rank,
      finishTimeSeconds: Number(res.finishTimeSeconds ?? 0),
      avgSpeedKmh: Number(res.avgSpeedKmh ?? 0),
      isDnf: rank >= 99 || notes.startsWith("DNF"),
    };
  });

  const signature = sorted
    .map((reg) => {
      const res = reg.result!;
      return `${reg.id}:${res.finalRank}:${res.finishTimeSeconds}:${res.updatedAt ?? ""}:${res.officialNotes ?? ""}`;
    })
    .join("|");

  return {
    kind,
    recordedCount: recordedRegs.length,
    activeCount: activeRegs.length,
    sourceLabelVi: sourceLabelMap[kind].vi,
    sourceLabelEn: sourceLabelMap[kind].en,
    latestUpdatedAt,
    signature,
    podium,
  };
}
