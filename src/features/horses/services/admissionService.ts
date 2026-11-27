import { api } from "@/shared/lib/api";

export function getAdmissionCapacity(): Promise<{ available: number }> {
  return api('GET', '/horses/admissions/capacity');
}

export function deferAdmissionForCapacity(id: string): Promise<{ deferred: boolean; notified: boolean }> {
  return api('POST', `/horses/admissions/${id}/defer-capacity`);
}

export async function getAdmissionRecord(id: string): Promise<HorseAdmissionRecord> {
  const result = await api<{ admission: HorseAdmissionRecord }>('GET', `/horses/admissions/${encodeURIComponent(id)}/history`);
  return result.admission;
}
import type {
  AdmissionDocumentPhoto,
  AdmissionPlacement,
  PlacementOptions,
  HorseAdmissionRecord,
  AdmissionHistoryLog,
  AdmissionListFilter,
  AdmissionListResponse,
  ScheduleAdmissionDto,
  InspectAdmissionDto,
  RejectAdmissionDto,
  CancelAdmissionDto,
  UpdateOwnerAdmissionSubmissionDto,
} from "../types/admission.types";

/** Trích xuất danh sách ảnh giấy tờ pháp lý chuẩn hóa từ hồ sơ tiếp nhận (hỗ trợ cả bản cũ chỉ có documentsUrl). */
export function extractAdmissionDocumentPhotos(
  record?: Pick<HorseAdmissionRecord, "documentPhotos" | "documentsUrl"> | null,
): AdmissionDocumentPhoto[] {
  if (!record) return [];
  if (Array.isArray(record.documentPhotos) && record.documentPhotos.length > 0) {
    return record.documentPhotos.filter((p) => p && typeof p.url === "string" && p.url.trim().length > 0);
  }
  if (record.documentsUrl && record.documentsUrl.trim().length > 0) {
    return [{ label: "Giấy tờ pháp lý đính kèm", url: record.documentsUrl.trim() }];
  }
  return [];
}

/**
 * Lấy danh sách hồ sơ tiếp nhận ngựa với bộ lọc: status, search, recent7Days, page, pageSize.
 */
export async function getAdmissions(filter?: AdmissionListFilter): Promise<AdmissionListResponse> {
  const params = new URLSearchParams();
  if (filter?.status && filter.status !== "ALL") {
    params.set("status", filter.status);
  }
  if (filter?.search && filter.search.trim()) {
    params.set("search", filter.search.trim());
  }
  if (filter?.recent7Days) {
    params.set("recent7Days", "true");
  }
  if (filter?.page) {
    params.set("page", String(filter.page));
  }
  if (filter?.pageSize) {
    params.set("pageSize", String(filter.pageSize));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await api<AdmissionListResponse | HorseAdmissionRecord[]>("GET", `/horses/admissions${query}`);

  if (Array.isArray(res)) {
    return {
      data: res,
      total: res.length,
      page: filter?.page || 1,
      pageSize: filter?.pageSize || res.length || 20,
      totalPages: 1,
    };
  }

  return res;
}

/**
 * Xếp lịch hẹn mang ngựa đến trung tâm tiếp nhận Cổng A (CLUB_MANAGER).
 */
export async function scheduleAdmission(
  id: string,
  dto: ScheduleAdmissionDto,
): Promise<HorseAdmissionRecord> {
  return await api<HorseAdmissionRecord>("POST", `/horses/admissions/${id}/schedule`, dto);
}

/**
 * Thẩm định vi mạch, pháp lý và khám sàng lọc thú y tại trạm (CLUB_MANAGER + VETERINARIAN).
 */
export async function inspectAdmission(
  id: string,
  dto: InspectAdmissionDto,
): Promise<HorseAdmissionRecord> {
  return await api<HorseAdmissionRecord>("PATCH", `/horses/admissions/${id}/inspect`, dto);
}

/**
 * Club Manager phê duyệt tiếp nhận ngựa chính thức vào CLB (chuyển trạng thái sang APPROVED).
 */
export async function approveAdmission(id: string, dto: AdmissionPlacement): Promise<HorseAdmissionRecord> {
  return await api<HorseAdmissionRecord>("POST", `/horses/admissions/${id}/approve`, dto);
}

/**
 * Club Manager từ chối tiếp nhận ngựa (bắt buộc kèm lý do từ 10 - 500 ký tự).
 */
export async function rejectAdmission(
  id: string,
  dto: RejectAdmissionDto,
): Promise<HorseAdmissionRecord> {
  return await api<HorseAdmissionRecord>("POST", `/horses/admissions/${id}/reject`, dto);
}

/**
 * Hủy hồ sơ tiếp nhận (CLUB_MANAGER hoặc HORSE_OWNER).
 */
export async function cancelAdmission(
  id: string,
  dto?: CancelAdmissionDto,
): Promise<HorseAdmissionRecord> {
  return await api<HorseAdmissionRecord>("POST", `/horses/admissions/${id}/cancel`, dto ?? {});
}

/**
 * Xem toàn bộ dòng thời gian lịch sử các bước của hồ sơ tiếp nhận (Audit Trail).
 */
export async function getAdmissionHistory(id: string): Promise<AdmissionHistoryLog[]> {
  // BE trả { admission, history } (horses.service.getAdmissionHistory) — đọc đúng field.
  const res = await api<{ admission: HorseAdmissionRecord; history: AdmissionHistoryLog[] }>(
    "GET",
    `/horses/admissions/${id}/history`,
  );
  return res?.history ?? [];
}

export function getPlacementOptions(stallId = '', allocationId = ''): Promise<PlacementOptions> {
  return api('GET', `/horses/admissions/placement?${new URLSearchParams({ stallId, allocationId })}`);
}
export function reviewAdmissionHealth(id: string, dto: { isHealthEligible: boolean; healthCheckNotes: string; reason: string }): Promise<HorseAdmissionRecord> {
  return api('POST', `/horses/admissions/${id}/health-review`, dto);
}

/**
 * Chủ ngựa cập nhật ghi chú mong muốn / bổ sung ảnh giấy tờ pháp lý khi hồ sơ chưa xếp lịch.
 */
export function updateOwnerAdmissionSubmission(
  id: string,
  dto: UpdateOwnerAdmissionSubmissionDto,
): Promise<HorseAdmissionRecord> {
  return api<HorseAdmissionRecord>("PATCH", `/horses/admissions/${id}/submission`, dto);
}
