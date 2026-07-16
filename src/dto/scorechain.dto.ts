// Frontend mirror of the api Scorechain screening DTO
// (api: GET support/:id/scorechain → ScorechainScreeningDto[], sorted created DESC).
// Date fields arrive as ISO strings over the wire. Enum values mirror the wire strings 1:1; unknown/new
// wire values must never crash the UI — fields whose set may still grow are typed as `string` so the raw
// value can always be displayed. This module intentionally has NO imports so its pure helpers/predicate
// stay trivially unit-testable.

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

// The three sentinel severities that must be rendered neutrally (informational), not as a risk color.
export const SCORECHAIN_SENTINEL_SEVERITIES: ReadonlySet<string> = new Set<string>([
  ScorechainSeverity.NOT_SUPPORTED,
  ScorechainSeverity.NO_COVERAGE,
  ScorechainSeverity.NOT_FOUND,
]);

export function isSentinelSeverity(severity?: string): boolean {
  return severity != null && SCORECHAIN_SENTINEL_SEVERITIES.has(severity);
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

// Internal AML-error token the api writes into a transaction comment (';'-joined list) when a Scorechain
// screening flagged the transaction as high risk. The manual-check UI turns it into a deep-link.
export const SCORECHAIN_HIGH_RISK_TOKEN = 'ScorechainHighRisk';

// True iff the comment carries the ScorechainHighRisk token as one of its ';'-joined members. Membership
// (not substring) so a longer token that merely contains the string is not a false positive.
export function hasScorechainHighRisk(comment?: string): boolean {
  if (!comment) return false;
  return comment
    .split(';')
    .map((token) => token.trim())
    .includes(SCORECHAIN_HIGH_RISK_TOKEN);
}

// --- deep-link (highlight) plumbing shared by the link call-sites and the screen --- //

export interface ScorechainRelatedIds {
  buyCryptoId?: number;
  buyFiatId?: number;
}

// The `?highlight=` query value that deep-links to the screening related to a given transaction.
// buyCrypto takes precedence over buyFiat; returns undefined when the tx has neither id.
export function scorechainHighlightValue(ids: ScorechainRelatedIds): string | undefined {
  if (ids.buyCryptoId != null) return `buyCrypto:${ids.buyCryptoId}`;
  if (ids.buyFiatId != null) return `buyFiat:${ids.buyFiatId}`;
  return undefined;
}

export interface ScorechainHighlight {
  kind: 'buyCrypto' | 'buyFiat';
  id: number;
}

// Parse a `?highlight=` query value back into a typed highlight; undefined for absent/malformed values.
export function parseScorechainHighlight(value: string | null): ScorechainHighlight | undefined {
  if (!value) return undefined;
  const separatorIndex = value.indexOf(':');
  if (separatorIndex < 0) return undefined;
  const kind = value.slice(0, separatorIndex);
  const id = Number(value.slice(separatorIndex + 1));
  if ((kind === 'buyCrypto' || kind === 'buyFiat') && Number.isInteger(id)) return { kind, id };
  return undefined;
}

// Does a screening relate to the highlighted transaction id?
export function screeningMatchesHighlight(screening: ScorechainScreeningDto, highlight: ScorechainHighlight): boolean {
  return highlight.kind === 'buyCrypto'
    ? Boolean(screening.relatedBuyCryptoIds?.includes(highlight.id))
    : Boolean(screening.relatedBuyFiatIds?.includes(highlight.id));
}
