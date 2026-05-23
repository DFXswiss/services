import { useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';

export interface LogQueryColumn {
  name: string;
  type: string;
}

export interface LogQueryResult {
  columns: LogQueryColumn[];
  rows: unknown[][];
}

export interface ParsedTrace {
  timestamp: string;
  method: string;
  url: string;
  pathPattern: string;
  status: number;
  durationMs: number;
  client: string;
  ip: string;
}

const TRACE_HEADLINE_RE =
  /^\[RealUnitTrace\]\s+([A-Z]+)\s+(\S+)\s+→\s+(\d{3})\s+\((\d+)ms\)\s+client=(\S+?)\s+ip=(\S+)/;

function normalizePath(url: string): string {
  const path = url.split('?')[0];
  return path
    .split('/')
    .map((seg) => {
      if (/^0x[a-f0-9]{40}$/i.test(seg)) return ':address';
      if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(seg)) return ':uuid';
      if (/^\d+$/.test(seg)) return ':id';
      return seg;
    })
    .join('/');
}

export function parseTrace(timestamp: string, message: string): ParsedTrace | null {
  const m = message.match(TRACE_HEADLINE_RE);
  if (!m) return null;
  return {
    timestamp,
    method: m[1],
    url: m[2],
    pathPattern: normalizePath(m[2]),
    status: parseInt(m[3], 10),
    durationMs: parseInt(m[4], 10),
    client: m[5],
    ip: m[6],
  };
}

export function useLogTracing() {
  const { call } = useApi();

  async function getRealunitTraces(hours: number): Promise<LogQueryResult> {
    return call<LogQueryResult>({
      url: 'gs/debug/logs',
      method: 'POST',
      data: {
        template: 'traces-by-message',
        messageFilter: 'RealUnitTrace',
        hours,
      },
    });
  }

  return useMemo(() => ({ getRealunitTraces }), [call]);
}
