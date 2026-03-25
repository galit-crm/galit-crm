import * as XLSX from 'xlsx';

export type SheetRow = Record<string, unknown>;

function normalizeHeader(h: string): string {
  return String(h ?? '')
    .replace(/\u200f|\u200e/g, '')
    .trim();
}

/** First non-empty sheet → array of objects keyed by header row. */
export function parseXlsxBuffer(buf: Buffer): { headers: string[]; rows: SheetRow[] } {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const name = wb.SheetNames[0];
  if (!name) return { headers: [], rows: [] };
  const sheet = wb.Sheets[name];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  }) as unknown[][];
  if (!matrix.length) return { headers: [], rows: [] };

  const headerRow = (matrix[0] || []).map((c) => normalizeHeader(String(c ?? '')));
  const headers = headerRow.filter((h) => h.length > 0);
  const rows: SheetRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const o: SheetRow = {};
    let any = false;
    headerRow.forEach((h, i) => {
      if (!h) return;
      const v = line[i];
      if (v !== null && v !== undefined && String(v).trim() !== '') any = true;
      o[h] = v;
    });
    if (any) rows.push(o);
  }

  return { headers, rows };
}

/** Simple CSV: first line headers, comma-separated; supports quoted fields. */
export function parseCsvText(text: string): { headers: string[]; rows: SheetRow[] } {
  const lines = splitCsvLines(text);
  if (!lines.length) return { headers: [], rows: [] };
  const headerCells = parseCsvLine(lines[0]);
  const headers = headerCells.map(normalizeHeader).filter(Boolean);
  const rows: SheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const o: SheetRow = {};
    let any = false;
    headers.forEach((h, idx) => {
      const v = cells[idx] ?? '';
      if (String(v).trim() !== '') any = true;
      o[h] = v;
    });
    if (any) rows.push(o);
  }
  return { headers, rows };
}

function splitCsvLines(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      cur += ch;
      continue;
    }
    if (!inQuote && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (cur.trim()) out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && ch === ',') {
      cells.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}
