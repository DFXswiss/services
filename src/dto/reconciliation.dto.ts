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

export interface Position {
  asset: { id: number; uniqueName: string; blockchain: string; type: string };
  category: 'blockchain' | 'exchange' | 'bank';
  startBalance: number;
  endBalance: number;
  totalInflows: number;
  totalOutflows: number;
  expectedEndBalance: number;
  difference: number;
}

export interface ReconciliationOverview {
  period: { from: string; to: string; actualFrom: string; actualTo: string };
  positions: Position[];
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
