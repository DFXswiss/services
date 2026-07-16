// Frontend mirror of the api Scorechain screening DTO
// (api: GET support/:id/scorechain → ScorechainScreeningDto[], sorted created DESC).
// Date fields arrive as ISO strings over the wire. Enum values mirror the wire strings 1:1; unknown/new
// wire values must never crash the UI — fields whose set may still grow are typed as `string` so the raw
// value can always be displayed. Types-only by convention (all src/dto/*.ts are pure interfaces/enums);
// the pure helpers/predicate live in src/util/scorechain.util.ts.

export enum ScorechainObjectType {
  ADDRESS = 'ADDRESS',
  TRANSACTION = 'TRANSACTION',
  WALLET = 'WALLET',
}

export enum ScorechainAnalysisType {
  ASSIGNED = 'ASSIGNED',
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  FULL = 'FULL',
}

export enum ScorechainContext {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  MANUAL = 'Manual',
}

export enum ScorechainTriggerType {
  AUTOMATIC = 'Automatic',
  MANUAL = 'Manual',
}

// Risk bands PLUS the three provider sentinels. Sentinels are NOT a risk verdict (coverage/support/lookup
// state) and must render as a neutral informational state, never a risk color.
export enum ScorechainSeverity {
  // Risk bands: UPPER_SNAKE, value === key (matches the api ScorechainSeverity enum byte-for-byte).
  CRITICAL_RISK = 'CRITICAL_RISK',
  HIGH_RISK = 'HIGH_RISK',
  MEDIUM_RISK = 'MEDIUM_RISK',
  LOW_RISK = 'LOW_RISK',
  NO_RISK = 'NO_RISK',
  // Sentinels (PascalCase): provider coverage/support/lookup state, NOT a risk verdict → render neutral.
  NOT_SUPPORTED = 'NotSupported',
  NO_COVERAGE = 'NoCoverage',
  NOT_FOUND = 'NotFound',
}

// --- riskIndicatorData nested shape --- //

export interface ScorechainRiskDetail {
  name?: string;
  type?: string;
  countries?: string[];
  percentage?: number;
  amountUsd?: number;
  score?: number;
  severity?: string;
}

export interface ScorechainRiskResult {
  score?: number;
  severity?: string;
  details?: ScorechainRiskDetail[];
}

export interface ScorechainRiskAnalysis {
  hasResult?: boolean;
  result?: ScorechainRiskResult | null;
}

// One analysis slice per direction; any member may be absent.
export type ScorechainRiskIndicatorData = Partial<
  Record<'assigned' | 'incoming' | 'outgoing' | 'full', ScorechainRiskAnalysis>
>;

export interface ScorechainScreeningDto {
  id: number;
  created: string;
  objectType: ScorechainObjectType;
  objectId: string;
  blockchain: string;
  analysisType: ScorechainAnalysisType;
  context: ScorechainContext;
  triggerType: ScorechainTriggerType;
  // 1-100, LOWER = riskier. Absent when the provider returned no score (see sentinel severities).
  riskScore?: number;
  // Risk band or sentinel; typed as string so an unknown/new provider value never crashes the UI.
  severity?: string;
  signatureValid: boolean;
  isHighRisk: boolean;
  riskIndicatorData?: ScorechainRiskIndicatorData;
  rawResponseData?: Record<string, unknown>;
  relatedBuyCryptoIds?: number[];
  relatedBuyFiatIds?: number[];
}

// A transaction's related order ids, used to build the `?highlight=` deep-link into a screening.
export interface ScorechainRelatedIds {
  buyCryptoId?: number;
  buyFiatId?: number;
}

// A parsed `?highlight=` deep-link target (which related order a screening should be matched against).
export interface ScorechainHighlight {
  kind: 'buyCrypto' | 'buyFiat';
  id: number;
}
