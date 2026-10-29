export type StockHealthStatus = 'SUFFICIENT' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type RestockStatus = 'PENDING' | 'APPROVED' | 'DELIVERING' | 'DELIVERED' | 'REJECTED';

export type SupplyCategory = 'FEED' | 'MEDICINE' | 'CARE' | 'EQUIPMENT';

export interface StockItemRow {
  id: string;
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  supplyId: string;
  supplyCode: string;
  supplyName: string;
  category: SupplyCategory;
  unit: string;
  quantity: number;
  minThreshold: number;
  status: StockHealthStatus;
  lastInventoryDate: string | null;
  lastAdjustedBy: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  notes: string | null;
}

export interface StockListResponse {
  items: StockItemRow[];
  total: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface QueryInventoryParams {
  zoneId?: string;
  category?: SupplyCategory;
  search?: string;
  lowStockOnly?: boolean;
}

export interface AdjustStockPayload {
  zoneId: string;
  supplyId: string;
  actualQuantity: number;
  reason: string;
  minThreshold?: number;
}

export interface RestockRequestItem {
  id: string;
  requestNumber: string;
  zoneId: string;
  zone: {
    id: string;
    code: string;
    name: string;
  };
  supplyId: string;
  supply: {
    id: string;
    code: string;
    name: string;
    category: SupplyCategory;
    unit: string;
  };
  requestedQuantity: number;
  approvedQuantity: number | null;
  status: RestockStatus;
  urgencyReason: string;
  rejectionReason: string | null;
  deliveryNotes: string | null;
  requestedById: string;
  requestedBy: {
    id: string;
    fullName: string;
    role: string;
  };
  reviewedById: string | null;
  reviewedBy?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  deliveredById: string | null;
  deliveredBy?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  deliveredAt: string | null;
}

export interface QueryRestockRequestsParams {
  status?: RestockStatus;
  zoneId?: string;
  supplyId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RestockRequestsListResponse {
  items: RestockRequestItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateRestockRequestPayload {
  zoneId: string;
  supplyId: string;
  requestedQuantity: number;
  urgencyReason: string;
}

export interface ReviewRestockRequestPayload {
  action: 'APPROVE' | 'REJECT';
  approvedQuantity?: number;
  rejectionReason?: string;
}

export interface DeliverRestockRequestPayload {
  receivedQuantity?: number;
  deliveryNotes?: string;
}
