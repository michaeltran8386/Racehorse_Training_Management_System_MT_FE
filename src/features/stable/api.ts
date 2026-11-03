import { api } from "@/shared/lib/api";
import type {
  AssignHorseDto,
  CreateStallDto,
  ReturnStallDto,
  SettableStallStatus,
  Stall,
  TransferHorseDto,
  UpdateStallDto,
  Zone,
  ZoneInput,
} from "./types";

function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** SC-1.04 bỏ ô Ngừng dùng; SC-1.07 truyền includeInactive để thấy đủ. */
export async function getStalls(filters?: {
  zoneId?: string;
  status?: string;
  search?: string;
  includeInactive?: boolean;
}): Promise<Stall[]> {
  return api<Stall[]>(
    "GET",
    `/stalls${qs({
      zoneId: filters?.zoneId,
      status: filters?.status,
      search: filters?.search,
      includeInactive: filters?.includeInactive ? "true" : undefined,
    })}`,
  );
}

export async function getZones(includeInactive = false): Promise<Zone[]> {
  return api<Zone[]>("GET", `/stalls/zones${qs({ includeInactive: includeInactive ? "true" : undefined })}`);
}

export async function createZone(input: ZoneInput): Promise<Zone> {
  return api<Zone>("POST", "/stalls/zones", input);
}

export async function updateZone(id: string, input: Omit<ZoneInput, "code" | "autoCreateStalls">): Promise<Zone> {
  return api<Zone>("PUT", `/stalls/zones/${id}`, input);
}

export async function setZoneActive(id: string, isActive: boolean): Promise<Zone> {
  return api<Zone>("PATCH", `/stalls/zones/${id}/status`, { isActive });
}

export async function createStall(dto: CreateStallDto): Promise<Stall> {
  return api<Stall>("POST", "/stalls", dto);
}

export async function updateStall(id: string, dto: UpdateStallDto): Promise<Stall> {
  return api<Stall>("PUT", `/stalls/${id}`, dto);
}

export async function setStallStatus(id: string, status: SettableStallStatus, notes?: string): Promise<Stall> {
  return api<Stall>("PATCH", `/stalls/${id}/status`, { status, ...(notes && { notes }) });
}

export async function assignHorse(
  stallId: string,
  dto: AssignHorseDto,
): Promise<{ stallCode: string; horseName: string }> {
  return api("POST", `/stalls/${stallId}/allocations`, dto);
}

export async function transferHorse(
  allocId: string,
  dto: TransferHorseDto,
): Promise<{ fromStallCode: string; stallCode: string; horseName: string }> {
  return api("PUT", `/stalls/allocations/${allocId}/transfer`, dto);
}

export async function returnStall(
  allocId: string,
  dto: ReturnStallDto,
): Promise<{ stallCode: string; horseName: string }> {
  return api("PUT", `/stalls/allocations/${allocId}/return`, dto);
}

export interface GroomOption {
  id: string;
  fullName: string;
  email: string;
  horseCount: number;
}

/** DL-1.02: Groom đang hoạt động kèm số ngựa đang phụ trách (CM, HT). */
export async function getGrooms(): Promise<GroomOption[]> {
  return api<GroomOption[]>("GET", "/stalls/grooms");
}
