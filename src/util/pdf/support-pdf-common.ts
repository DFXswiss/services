import { jsPDF } from 'jspdf';

export type PdfLang = 'de' | 'en';
export type RGB = [number, number, number];

// DFX palette (mirrors tailwind.config.js — colors validated via unit test).
const DFX = {
  dfxBlue400: '#124370',
  dfxBlue800: '#072440',
  dfxGray300: '#F3F4F7',
  dfxGray500: '#D6DBE2',
  dfxGray600: '#B8C4D8',
  dfxRed100: '#F5516C',
  dfxRed150: '#E73955',
  dfxGreen100: '#27AE60',
  dfxGreen300: '#196F3D',
  dfxYellow500: '#EAB308',
  dfxYellow700: '#A16207',
} as const;

function hexToRgb(hex: string): RGB {
  const s = hex.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export const COLOR = {
  // Status accents
  ok: hexToRgb(DFX.dfxGreen100),
  okDark: hexToRgb(DFX.dfxGreen300),
  warn: hexToRgb(DFX.dfxYellow500),
  warnDark: hexToRgb(DFX.dfxYellow700),
  error: hexToRgb(DFX.dfxRed100),
  errorDark: hexToRgb(DFX.dfxRed150),
  // DFX blue text / hyperlinks
  text: hexToRgb(DFX.dfxBlue800),
  link: hexToRgb(DFX.dfxBlue400),
  // Neutrals for headers, labels, borders
  headerBg: hexToRgb(DFX.dfxGray500),
  labelBg: hexToRgb(DFX.dfxGray300),
  border: hexToRgb(DFX.dfxGray600),
};

export function formatDateTimeUtc(iso?: string): { date: string; time: string } {
  if (!iso) return { date: '-', time: '-' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' };
  const pad = (n: number): string => n.toString().padStart(2, '0');
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  return { date, time };
}

export function dashIfEmpty(v: unknown): string {
  if (v == null || v === '') return '-';
  return String(v);
}

export function formatAmount(value?: number, decimals = 2): string {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toLocaleString('de-CH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function truncateMiddle(str: string, keepStart = 20, keepEnd = 10): string {
  if (!str || str.length <= keepStart + keepEnd + 3) return str;
  return `${str.slice(0, keepStart)}…${str.slice(-keepEnd)}`;
}

export function ageFromBirthday(birthday?: string): string {
  if (!birthday) return '-';
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return '-';
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - b.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return String(age);
}

export function drawFooter(doc: jsPDF, lang: PdfLang): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = pageHeight - 12;

  const dict: Record<PdfLang, { note: string; utc: string; cet: string; cest: string; hint: string }> = {
    de: {
      note: 'Die Koordinierte Weltzeit; entspricht auch GMT',
      utc: 'UTC',
      cet: 'MEZ = UTC +1',
      cest: 'MESZ = UTC +2',
      hint: 'Bitte während der Sommerzeit beachten!',
    },
    en: {
      note: 'Universal Time Coordinated; also known as GMT',
      utc: 'UTC',
      cet: 'CET = UTC +1',
      cest: 'CEST = UTC +2',
      hint: 'Please note during the summer time period!',
    },
  };
  const t = dict[lang];

  doc.setFontSize(8);
  doc.setTextColor(...COLOR.text);
  doc.setDrawColor(...COLOR.border);
  doc.line(10, y - 2, pageWidth - 10, y - 2);
  doc.text(`${t.utc} — ${t.note}`, 10, y + 2);
  doc.text(`${t.cet}   ${t.cest}   ${t.hint}`, 10, y + 6);
}

export function saveWithFilename(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

export function filenameSafe(str: string): string {
  return str.replace(/[^A-Za-z0-9._-]+/g, '_');
}
