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
  garage: Garage;
  seatInsertType: SeatInsertType;
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
    quantity: number;
    minStockLevel: number;
  }>;
  recentWorkOrders: WorkOrder[];
}
