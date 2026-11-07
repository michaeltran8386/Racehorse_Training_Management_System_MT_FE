import { api } from "@/shared/lib/api";
import type {
  EligibilityResponse,
  HorseEligibilityDetail,
  Tournament,
  TournamentRegistration,
  TournamentStatus,
} from "./types";

export interface SingleResultInput {
  registrationId: string;
  finalRank: number;
  finishTimeSeconds: number;
  avgSpeedKmh?: number;
  prizeMoneyWon?: number;
  officialNotes?: string;
}

export interface QueryTournamentParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface TournamentListResponse {
  items: Tournament[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchTournaments(params: QueryTournamentParams = {}): Promise<TournamentListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const qs = query.toString();
  return api<TournamentListResponse>("GET", `/tournaments${qs ? `?${qs}` : ""}`);
}

export async function fetchTournamentDetail(id: string): Promise<Tournament> {
  return api<Tournament>("GET", `/tournaments/${id}`);
}

export async function createTournament(data: Partial<Tournament>): Promise<Tournament> {
  return api<Tournament>("POST", "/tournaments", data);
}

export async function updateTournament(id: string, data: Partial<Tournament>): Promise<Tournament> {
  return api<Tournament>("PATCH", `/tournaments/${id}`, data);
}

export async function changeTournamentStatus(
  id: string,
  status: TournamentStatus,
  reason?: string,
): Promise<Tournament> {
  return api<Tournament>("PATCH", `/tournaments/${id}/status`, { status, reason });
}

export async function deleteTournament(id: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>("DELETE", `/tournaments/${id}`);
}

export async function fetchEligibility(tournamentId: string): Promise<EligibilityResponse> {
  return api<EligibilityResponse>("GET", `/tournaments/${tournamentId}/eligibility`);
}

export async function registerHorseForRace(
  tournamentId: string,
  horseId: string,
  notes?: string,
): Promise<TournamentRegistration> {
  return api<TournamentRegistration>("POST", `/tournaments/${tournamentId}/registrations`, {
    horseId,
    notes,
  });
}

export async function scratchHorseFromRace(
  tournamentId: string,
  registrationId: string,
  reason: string,
): Promise<TournamentRegistration> {
  return api<TournamentRegistration>(
    "DELETE",
    `/tournaments/${tournamentId}/registrations/${registrationId}?reason=${encodeURIComponent(reason)}`,
  );
}

export async function recordRaceResults(
  tournamentId: string,
  results: SingleResultInput[],
  lockResults: boolean = false,
): Promise<any> {
  return api("POST", `/tournaments/${tournamentId}/results`, {
    results,
    lockResults,
  });
}

export async function lockRaceResults(tournamentId: string): Promise<Tournament> {
  return api<Tournament>("POST", `/tournaments/${tournamentId}/lock-results`);
}

export async function fetchHorseEligibilityDetail(
  tournamentId: string,
  horseId: string,
): Promise<HorseEligibilityDetail> {
  return api<HorseEligibilityDetail>("GET", `/tournaments/${tournamentId}/eligibility/${horseId}`);
}
