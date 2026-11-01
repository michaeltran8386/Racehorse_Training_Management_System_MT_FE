import { api } from '@/shared/lib/api';
import type {
  AdjustStockPayload,
  CreateRestockRequestPayload,
  DeliverRestockRequestPayload,
  QueryInventoryParams,
  QueryRestockRequestsParams,
  RestockRequestItem,
  RestockRequestsListResponse,
  ReviewRestockRequestPayload,
  StockItemRow,
  StockListResponse,
} from '../types/inventory';

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      p.set(k, String(v));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const inventoryApi = {
  /** SC-4.06 Lấy danh sách tồn kho vật tư theo Khu chuồng */
  async listStock(params?: QueryInventoryParams): Promise<StockListResponse> {
    return api<StockListResponse>(
      'GET',
      `/inventory${qs({
        zoneId: params?.zoneId,
        category: params?.category,
        search: params?.search,
        lowStockOnly: params?.lowStockOnly ? 'true' : undefined,
      })}`
    );
  },

  /** SC-4.06 / DL-4.06 Kiểm kê & Điều chỉnh số lượng tồn kho (Club Manager) */
  async adjustStock(payload: AdjustStockPayload): Promise<StockItemRow> {
    return api<StockItemRow>('POST', '/inventory/adjust', payload);
  },

  /** SC-4.07 Lấy danh sách phiếu đề xuất vật tư */
  async listRequests(params?: QueryRestockRequestsParams): Promise<RestockRequestsListResponse> {
    return api<RestockRequestsListResponse>(
      'GET',
      `/inventory/requests${qs({
        status: params?.status,
        zoneId: params?.zoneId,
        supplyId: params?.supplyId,
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
      })}`
    );
  },

  /** SC-4.07 / DL-4.07 Tạo phiếu đề xuất bổ sung vật tư mới (Groom/Vet/Trainer) */
  async createRequest(payload: CreateRestockRequestPayload): Promise<RestockRequestItem> {
    return api<RestockRequestItem>('POST', '/inventory/requests', payload);
  },

  /** Quản lý CLB nhập bổ sung kho trực tiếp — BE tạo phiếu APPROVED ngay */
  async createDirectRestock(payload: CreateRestockRequestPayload): Promise<RestockRequestItem> {
    return api<RestockRequestItem>('POST', '/inventory/requests/direct', payload);
  },

  /** SC-4.07 Duyệt hoặc từ chối phiếu đề xuất (Club Manager) */
  async reviewRequest(id: string, payload: ReviewRestockRequestPayload): Promise<RestockRequestItem> {
    return api<RestockRequestItem>('POST', `/inventory/requests/${id}/review`, payload);
  },

  /** SC-4.07 Xác nhận đã nhận hàng & tự động cộng tồn kho (Club Manager / Staff) */
  async deliverRequest(id: string, payload: DeliverRestockRequestPayload): Promise<RestockRequestItem> {
    return api<RestockRequestItem>('POST', `/inventory/requests/${id}/deliver`, payload);
  },
};
