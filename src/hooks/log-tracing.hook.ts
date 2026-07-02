import { useMemo } from 'react';
import { useGuardedApi } from './guarded-api.hook';

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

export interface GenericTrace {
  timestamp: string;
  severityLevel: number; // 0 verbose, 1 info, 2 warn, 3 error, 4 critical
  context: string; // extracted from "[Context]" prefix, '' if none
  message: string; // remainder after the prefix
  operationId: string;
}

const CONTEXT_PREFIX_RE = /^\[([^\]]+)\]\s+([\s\S]*)$/;

export function parseGenericTrace(
  timestamp: string,
  severityLevel: number,
  message: string,
  operationId: string,
): GenericTrace {
  const m = message.match(CONTEXT_PREFIX_RE);
  return {
    timestamp,
    severityLevel,
    context: m?.[1] ?? '',
    message: m?.[2] ?? message,
    operationId,
  };
}

export function useLogTracing() {
  const { call } = useGuardedApi();

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

  async function getAllTraces(hours: number): Promise<LogQueryResult> {
    return call<LogQueryResult>({
      url: 'gs/debug/logs',
      method: 'POST',
      data: { template: 'all-traces', hours },
    });
  }

  return useMemo(() => ({ getRealunitTraces, getAllTraces }), [call]);
}
