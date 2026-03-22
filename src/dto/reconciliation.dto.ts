export interface FlowItem {
  id: number;
  date: string;
  amount: number;
  reference?: string;
}

export interface FlowGroup {
  type: string;
  counterAccount?: string;
  counterAssetId?: number;
  count: number;
  totalAmount: number;
  items: FlowItem[];
}

export interface ReconciliationResult {
  asset: { id: number; uniqueName: string; blockchain: string; type: string };
  period: { from: string; to: string; actualFrom: string; actualTo: string };
  startBalance: number;
  endBalance: number;
  inflows: FlowGroup[];
  outflows: FlowGroup[];
  totalInflows: number;
  totalOutflows: number;
  expectedEndBalance: number;
  difference: number;
}
