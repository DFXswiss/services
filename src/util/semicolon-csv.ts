export function escapeSemicolonCsvCell(value: string): string {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toSemicolonCsv(headers: string[], rows: Array<Array<string | number | undefined | null>>): string {
  const formatCell = (cell: string | number | undefined | null): string => {
    if (cell === undefined || cell === null) return '';
    return escapeSemicolonCsvCell(String(cell));
  };

  const headerLine = headers.map(escapeSemicolonCsvCell).join(';');
  const bodyLines = rows.map((row) => row.map(formatCell).join(';'));
  return [headerLine, ...bodyLines].join('\n');
}

export function downloadCsv(filename: string, csvBody: string): void {
  const blob = new Blob([`\uFEFF${csvBody}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
