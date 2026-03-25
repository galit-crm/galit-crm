import { createHash } from 'crypto';

export function normStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.replace(/\u200f|\u200e/g, '').trim();
  if (v instanceof Date) return v.toISOString();
  return String(v).replace(/\u200f|\u200e/g, '').trim();
}

export function digitsPhone(v: unknown): string {
  return normStr(v).replace(/\D/g, '');
}

export function normEmail(v: unknown): string {
  return normStr(v).toLowerCase();
}

export function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function toBool(v: unknown): boolean {
  const s = normStr(v).toUpperCase();
  if (!s) return false;
  if (['1', 'Y', 'YES', 'TRUE', 'T'].includes(s)) return true;
  if (['0', 'N', 'NO', 'FALSE', 'F'].includes(s)) return false;
  return Boolean(v);
}

export function parseDateFlexible(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  const s = normStr(v);
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const d2 = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d2.getTime())) return d2;
  }
  return null;
}

export function stableHash(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

export function rowKeyUpper(row: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const nk = k.replace(/[\[\]]/g, '').trim().toUpperCase();
    o[nk] = v;
  }
  return o;
}

export function pickField(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = row[k.toUpperCase()];
    if (v !== undefined && v !== null && normStr(v) !== '') return v;
  }
  return undefined;
}
