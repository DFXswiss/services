import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { Fragment, useEffect, useState } from 'react';
import { FlowGroup, ReconciliationResult } from 'src/dto/reconciliation.dto';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useReconciliation } from 'src/hooks/reconciliation.hook';

const TX_EXPLORERS: Record<string, string> = {
  Bitcoin: 'https://mempool.space/tx/',
  Ethereum: 'https://etherscan.io/tx/',
  Arbitrum: 'https://arbiscan.io/tx/',
  Optimism: 'https://optimistic.etherscan.io/tx/',
  Polygon: 'https://polygonscan.com/tx/',
  Base: 'https://basescan.org/tx/',
  BinanceSmartChain: 'https://bscscan.com/tx/',
  Monero: 'https://xmrchain.net/tx/',
  Solana: 'https://solscan.io/tx/',
  Tron: 'https://tronscan.org/#/transaction/',
};

function getTxUrl(blockchain: string, reference: string): string | undefined {
  const base = TX_EXPLORERS[blockchain];
  if (!base || !reference || !/^[a-fA-F0-9]{64}$/.test(reference)) return undefined;
  return `${base}${reference}`;
}

function formatAmount(value: number, decimals = 8): string {
  return value.toLocaleString('de-CH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

const BANK_BLOCKCHAINS = new Set(['Yapeal', 'Olkypay', 'MaerkiBaumann', 'Checkout', 'Sumixx', 'Kaleido']);

function getDecimals(blockchain: string): number {
  return BANK_BLOCKCHAINS.has(blockchain) ? 2 : 8;
}

const FLOW_TYPE_LABELS: Record<string, string> = {
  LmDeficit: 'LM Zufluss',
  LmRedundancy: 'LM Abfluss',
  ExchangeWithdrawal: 'Auszahlung',
  CryptoInput: 'Eingang',
  PayoutOrder: 'Auszahlung',
  Deposit: 'Einzahlung',
  Withdrawal: 'Auszahlung',
  TradeBuy: 'Kauf',
  TradeSell: 'Verkauf',
  TradeSellQuoteInflow: 'Verkauf (Quote)',
  TradeBuyQuoteOutflow: 'Kauf (Quote)',
  Fee: 'Gebühren',
  BankCredit: 'Gutschrift',
  BankDebit: 'Belastung',
};

function flowLabel(type: string, counterAccount?: string): string {
  const typeLabel = FLOW_TYPE_LABELS[type] ?? type;
  return counterAccount ? `${counterAccount} (${typeLabel})` : typeLabel;
}

interface FlowEntry {
  key: string;
  label: string;
  counterAssetId?: number;
  count: number;
  amount: number;
  side: 'soll' | 'haben';
  isDiff?: boolean;
  items: FlowGroup['items'];
}

function ReconciliationTable({
  data,
  onAssetChange,
}: {
  data: ReconciliationResult;
  onAssetChange: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState<string>();
  const dec = getDecimals(data.asset.blockchain);
  const unit = data.asset.uniqueName.split('/')[1] ?? '';
  const diff = data.difference;

  // Merge flow groups by counterAccount + side
  const mergeFlows = (groups: FlowGroup[], side: 'soll' | 'haben'): FlowEntry[] => {
    const merged = new Map<string, FlowEntry>();
    for (const g of groups) {
      const ca = g.counterAccount ?? flowLabel(g.type);
      const key = `${side}-${ca}`;
      const existing = merged.get(key);
      if (existing) {
        existing.count += g.count;
        existing.amount += g.totalAmount;
        existing.items = [...existing.items, ...g.items];
      } else {
        merged.set(key, {
          key,
          label: ca,
          counterAssetId: g.counterAssetId,
          count: g.count,
          amount: g.totalAmount,
          side,
          items: [...g.items],
        });
      }
    }
    return [...merged.values()];
  };

  const entries: FlowEntry[] = [...mergeFlows(data.inflows, 'soll'), ...mergeFlows(data.outflows, 'haben')];

  if (Math.abs(diff) > 1e-10) {
    entries.push({
      key: 'diff',
      label: 'Differenz (ungeklärt)',
      count: 0,
      amount: Math.abs(diff),
      side: diff > 0 ? 'soll' : 'haben',
      isDiff: true,
      items: [],
    });
  }

  const totalSoll = data.startBalance + data.totalInflows + Math.max(0, diff);
  const totalCount = entries.filter((e) => !e.isDiff).reduce((s, e) => s + e.count, 0);
  const diffColor = Math.abs(diff) < 0.01 ? '#22c55e' : '#ef4444';

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="text-center text-sm font-semibold p-3 border-b" style={{ backgroundColor: '#f8fafc' }}>
        Konto: {data.asset.uniqueName}
      </div>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: '40%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '25%' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: '2px solid #111827' }}>
            <th className="py-2 pl-4 text-left font-medium">Buchungsart</th>
            <th className="py-2 text-right font-medium">Anz.</th>
            <th className="py-2 pr-4 text-right font-medium" style={{ color: '#166534' }}>
              Soll ({unit})
            </th>
            <th className="py-2 pr-4 text-right font-medium" style={{ color: '#991b1b' }}>
              Haben ({unit})
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Anfangsbestand */}
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td className="py-1.5 pl-4 font-bold">Anfangsbestand</td>
            <td></td>
            <td className="py-1.5 pr-4 text-right font-mono font-bold">{formatAmount(data.startBalance, dec)}</td>
            <td></td>
          </tr>

          {/* Buchungen */}
          {entries.map((e) => (
            <Fragment key={e.key}>
              <tr
                className={e.isDiff ? '' : 'cursor-pointer hover:bg-gray-50'}
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  ...(e.isDiff && { borderTop: '1px dashed #d97706', backgroundColor: '#fffbeb' }),
                }}
                onClick={() => !e.isDiff && setExpanded(expanded === e.key ? undefined : e.key)}
              >
                <td className="py-1.5 pl-4" style={e.isDiff ? { fontStyle: 'italic', color: '#9ca3af' } : undefined}>
                  {!e.isDiff && <span className="mr-1 text-xs">{expanded === e.key ? '▼' : '▶'}</span>}
                  {e.counterAssetId ? (
                    <span
                      className="cursor-pointer hover:underline"
                      style={{ color: '#2563eb' }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onAssetChange(e.counterAssetId!);
                      }}
                    >
                      {e.label}
                    </span>
                  ) : (
                    e.label
                  )}
                </td>
                <td className="py-1.5 text-right" style={e.isDiff ? { color: '#9ca3af' } : undefined}>
                  {e.count > 0 ? e.count : ''}
                </td>
                <td
                  className="py-1.5 pr-4 text-right font-mono"
                  style={e.isDiff ? { fontStyle: 'italic', color: '#9ca3af' } : { color: '#166534' }}
                >
                  {e.side === 'soll' ? formatAmount(e.amount, dec) : ''}
                </td>
                <td
                  className="py-1.5 pr-4 text-right font-mono"
                  style={e.isDiff ? { fontStyle: 'italic', color: '#9ca3af' } : { color: '#991b1b' }}
                >
                  {e.side === 'haben' ? formatAmount(e.amount, dec) : ''}
                </td>
              </tr>
              {expanded === e.key && e.items.length > 0 && (
                <tr>
                  <td colSpan={4} className="p-0">
                    <div className="max-h-64 overflow-y-auto" style={{ backgroundColor: '#f9fafb' }}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 pl-8">ID</th>
                            <th className="text-left p-2">Datum</th>
                            <th className="text-right p-2 pr-4">Betrag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.items.map((item) => {
                            const url = item.reference ? getTxUrl(data.asset.blockchain, item.reference) : undefined;
                            return (
                              <tr key={item.id} className="border-b border-gray-100">
                                <td className="p-2 pl-8 font-mono">{item.id}</td>
                                <td className="p-2">{formatDate(item.date)}</td>
                                <td className="text-right p-2 pr-4 font-mono">
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline"
                                      style={{ color: '#2563eb' }}
                                    >
                                      {formatAmount(item.amount, dec)}
                                    </a>
                                  ) : (
                                    formatAmount(item.amount, dec)
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}

          {/* Endbestand (Saldo) */}
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td className="py-1.5 pl-4 font-bold">Endbestand (Saldo)</td>
            <td></td>
            <td></td>
            <td className="py-1.5 pr-4 text-right font-mono font-bold">{formatAmount(data.endBalance, dec)}</td>
          </tr>

          {/* Summe */}
          <tr style={{ borderTop: '2px solid #111827', borderBottom: '4px double #111827' }}>
            <td className="py-1.5 pl-4 font-bold">Summe</td>
            <td className="py-1.5 text-right font-bold">{totalCount}</td>
            <td className="py-1.5 pr-4 text-right font-mono font-bold" style={{ color: '#166534' }}>
              {formatAmount(totalSoll, dec)}
            </td>
            <td className="py-1.5 pr-4 text-right font-mono font-bold" style={{ color: '#991b1b' }}>
              {formatAmount(totalSoll, dec)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Differenz-Info */}
      <div className="p-3 font-mono text-xs text-center" style={{ backgroundColor: '#f8fafc', color: '#6b7280' }}>
        {formatAmount(data.startBalance, dec)} + {formatAmount(data.totalInflows, dec)} −{' '}
        {formatAmount(data.totalOutflows, dec)} = {formatAmount(data.expectedEndBalance, dec)}
        <span className="mx-2">|</span>
        Ist:{' '}
        <span className="font-bold" style={{ color: '#111827' }}>
          {formatAmount(data.endBalance, dec)}
        </span>
        <span className="mx-2">|</span>
        Diff: <span style={{ color: diffColor, fontWeight: 'bold' }}>{formatAmount(data.difference, dec)}</span>
      </div>
    </div>
  );
}

export default function DashboardFinancialReconciliationScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Reconciliation', noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getReconciliation } = useReconciliation();

  const [assetId, setAssetId] = useState('113');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const [data, setData] = useState<ReconciliationResult>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [history, setHistory] = useState<string[]>([]);

  function runQuery(overrideAssetId?: number, pushHistory = true) {
    const id = overrideAssetId ?? Number(assetId);
    if (!isLoggedIn || !id) return;

    if (overrideAssetId) {
      if (pushHistory) setHistory((h) => [...h, assetId]);
      setAssetId(String(overrideAssetId));
    }
    setIsLoading(true);
    setError(undefined);
    getReconciliation(id, from, to)
      .then(setData)
      .catch((e) => setError(e.message ?? 'Request failed'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (isLoggedIn) runQuery();
  }, [isLoggedIn]);

  const dec = data ? getDecimals(data.asset.blockchain) : 8;

  return (
    <div className="space-y-4 p-4 w-full self-stretch" style={{ color: '#111827' }}>
      {/* Query Form */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>
              Asset ID
            </label>
            <input
              type="number"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="border rounded px-3 py-2 w-24 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => runQuery()}
            disabled={isLoading}
            className="px-4 py-2 rounded text-sm font-medium text-white"
            style={{ backgroundColor: '#2563eb' }}
          >
            {isLoading ? 'Loading...' : 'Run'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>}

      {isLoading && (
        <div className="flex justify-center items-center w-full h-48">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Asset & Period */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <button
                  className="text-sm px-2 py-1 rounded hover:bg-gray-100"
                  style={{ color: '#2563eb' }}
                  onClick={() => {
                    const prev = history[history.length - 1];
                    setHistory((h) => h.slice(0, -1));
                    runQuery(Number(prev), false);
                  }}
                >
                  ← Zurück
                </button>
              )}
              <div className="text-lg font-semibold">{data.asset.uniqueName}</div>
            </div>
            <div className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {data.asset.blockchain} &middot; {data.asset.type} &middot; ID {data.asset.id}
            </div>
            <div className="text-xs mt-2" style={{ color: '#9ca3af' }}>
              Effektiver Zeitraum: {formatDate(data.period.actualFrom)} — {formatDate(data.period.actualTo)}
            </div>
          </div>

          {/* Reconciliation Table */}
          <ReconciliationTable data={data} onAssetChange={(id) => runQuery(id)} />
        </>
      )}
    </div>
  );
}
