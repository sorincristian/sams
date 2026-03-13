export type Role = "ADMIN" | "GARAGE_MANAGER" | "TECHNICIAN";

export interface Garage {
  id: string;
  code: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Bus {
  id: string;
  fleetNumber: string;
  model: string;
  manufacturer: string;
  garageId: string;
  status: string;
  garage?: Garage;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeatInsertType {
  id: string;
  partNumber: string;
  description: string;
  vendor: string;
  minStockLevel: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryRow {
  id: string;
  garageId: string;
  seatInsertTypeId: string;
  quantity: number;
  quantityOnHand: number;
  quantityReserved: number;
  binLocation: string | null;
  garage: Garage;
  seatInsertType: SeatInsertType;
  createdAt?: string;
  updatedAt?: string;
}

export type InventoryTransactionType =
  | "RECEIVE"
  | "ISSUE"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "ADJUST_IN"
  | "ADJUST_OUT"
  | "RETURN"
  | "SCRAP";

export interface InventoryTransaction {
  id: string;
  seatInsertTypeId: string;
  garageId: string;
  quantity: number;
  type: InventoryTransactionType;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  performedByUserId: string;
  garage: Garage;
  seatInsertType: SeatInsertType;
  performedByUser: { id: string; name: string; email: string };
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  status: string;
  priority: string;
  issueDescription: string;
  busId: string;
  garageId: string;
  bus: Bus;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardResponse {
  counts: {
    garages: number;
    buses: number;
    seatInsertTypes: number;
    openWorkOrders: number;
  };
  lowStock: Array<{
    garage: string;
    partNumber: string;
    description: string;
    quantityOnHand: number;
    minStockLevel: number;
  }>;
  recentWorkOrders: WorkOrder[];
}
