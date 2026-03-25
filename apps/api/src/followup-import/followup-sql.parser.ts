/**
 * Parser for SQL Server-style INSERT dumps (Followup legacy).
 * Supports: INSERT INTO [TABLE] (cols) VALUES (...), (...);  N'unicode', NULL, CAST(... AS ...).
 * Limitations: INSERT...SELECT is skipped; very exotic expressions may fail (logged as parse warnings).
 */

export type ParsedInsert = {
  table: string;
  columns: string[] | null;
  rows: unknown[][];
};

function normalizeColumnName(raw: string): string {
  return raw.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').trim();
}

/** Split top-level commas; respects (), [], and single-quoted strings (SQL Server '' escape). */
export function splitTopLevelCommas(input: string): string[] {
  const parts: string[] = [];
  let depthParen = 0;
  let depthBracket = 0;
  let cur = '';
  let i = 0;
  let inQuote = false;

  while (i < input.length) {
    const ch = input[i];

    if (inQuote) {
      cur += ch;
      if (ch === "'") {
        if (input[i + 1] === "'") {
          cur += input[i + 1];
          i += 2;
          continue;
        }
        inQuote = false;
      }
      i++;
      continue;
    }

    if (ch === 'N' && input[i + 1] === "'") {
      inQuote = true;
      cur += 'N';
      i++;
      cur += input[i];
      i++;
      continue;
    }

    if (ch === "'") {
      inQuote = true;
      cur += ch;
      i++;
      continue;
    }

    if (ch === '(') depthParen++;
    if (ch === ')') depthParen--;
    if (ch === '[') depthBracket++;
    if (ch === ']') depthBracket--;

    if (ch === ',' && depthParen === 0 && depthBracket === 0) {
      parts.push(cur.trim());
      cur = '';
      i++;
      continue;
    }

    cur += ch;
    i++;
  }

  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function takeBalancedParenTuple(s: string, openParenIndex: number): { inner: string; end: number } | null {
  if (s[openParenIndex] !== '(') return null;
  let depth = 0;
  let i = openParenIndex;
  let inQuote = false;

  while (i < s.length) {
    const ch = s[i];
    if (inQuote) {
      if (ch === "'" && s[i + 1] === "'") {
        i += 2;
        continue;
      }
      if (ch === "'") inQuote = false;
      i++;
      continue;
    }
    if (ch === 'N' && s[i + 1] === "'") {
      inQuote = true;
      i += 2;
      continue;
    }
    if (ch === "'") {
      inQuote = true;
      i++;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') {
      depth--;
      if (depth === 0) {
        const inner = s.slice(openParenIndex + 1, i);
        return { inner, end: i + 1 };
      }
    }
    i++;
  }
  return null;
}

function parseQuotedString(s: string, start: number): { value: string; end: number } | null {
  if (s[start] !== "'") return null;
  let i = start + 1;
  let out = '';
  while (i < s.length) {
    if (s[i] === "'" && s[i + 1] === "'") {
      out += "'";
      i += 2;
      continue;
    }
    if (s[i] === "'") {
      return { value: out, end: i + 1 };
    }
    out += s[i];
    i++;
  }
  return null;
}

export function parseSqlScalar(token: string): unknown {
  let s = token.trim();
  if (!s || s.toUpperCase() === 'NULL') return null;

  const castM = /^CAST\s*\(\s*([\s\S]*?)\s+AS\s+[\w\(\)\s]+\)$/i.exec(s);
  if (castM) {
    return parseSqlScalar(castM[1].trim());
  }

  if (/^N$/i.test(s)) return null;

  if (s[0] === 'N' && s[1] === "'") {
    const pq = parseQuotedString(s, 1);
    if (pq) return pq.value;
  }

  if (s[0] === "'") {
    const pq = parseQuotedString(s, 0);
    if (pq) return pq.value;
  }

  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith('[') && s.endsWith(']'))) {
    return s.slice(1, -1).replace(/''/g, "'");
  }

  const num = Number(s);
  if (!Number.isNaN(num) && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return num;

  return s;
}

function parseValueTupleList(afterValues: string): unknown[][] {
  const list: unknown[][] = [];
  let i = 0;
  const t = afterValues.trim();
  while (i < t.length && /\s/.test(t[i])) i++;

  while (i < t.length && t[i] === '(') {
    const bal = takeBalancedParenTuple(t, i);
    if (!bal) break;
    const cells = splitTopLevelCommas(bal.inner).map(parseSqlScalar);
    list.push(cells);
    i = bal.end;
    while (i < t.length && /[\s,;]/.test(t[i])) i++;
  }
  return list;
}

export function parseInsertStatement(chunk: string): ParsedInsert | null {
  const upper = chunk.toUpperCase();
  const vi = upper.indexOf('VALUES');
  if (vi < 0) return null;

  const before = chunk.slice(0, vi);
  const after = chunk.slice(vi + 'VALUES'.length);

  const tm = /INSERT\s+INTO\s+(?:\[([^\]]+)\]|"([^"]+)"|(\w+))/i.exec(before);
  if (!tm) return null;
  const table = normalizeColumnName((tm[1] || tm[2] || tm[3] || '').trim());
  if (!table) return null;

  let columns: string[] | null = null;
  const openIdx = before.indexOf('(');
  const closeIdx = before.lastIndexOf(')');
  if (openIdx > 0 && closeIdx > openIdx && closeIdx < vi) {
    const inner = before.slice(openIdx + 1, closeIdx);
    columns = splitTopLevelCommas(inner).map((c) => normalizeColumnName(c));
  }

  const rows = parseValueTupleList(after);
  if (!rows.length) return null;

  return { table, columns, rows };
}

export function extractInsertStatements(sql: string): string[] {
  const upper = sql.toUpperCase();
  const out: string[] = [];
  let searchFrom = 0;
  while (true) {
    const idx = upper.indexOf('INSERT INTO', searchFrom);
    if (idx < 0) break;
    const next = upper.indexOf('INSERT INTO', idx + 11);
    const chunk = (next < 0 ? sql.slice(idx) : sql.slice(idx, next)).trim();
    if (chunk) out.push(chunk);
    searchFrom = next < 0 ? sql.length : next;
  }
  return out;
}

export type FollowupSqlBuckets = Record<string, Record<string, unknown>[]>;

const FOLLOWUP_TABLES = new Set([
  'CUSTOMERS',
  'ISH_KESHER',
  'HATSAOTHEADER',
  'ORDERS',
  'HITKASHRUT',
]);

function rowObjects(columns: string[] | null, tuples: unknown[][]): Record<string, unknown>[] {
  if (!columns || !columns.length) return [];
  return tuples.map((vals) => {
    const o: Record<string, unknown> = {};
    columns.forEach((c, i) => {
      o[c] = vals[i];
    });
    return o;
  });
}

export function parseFollowupSqlDump(sql: string): { buckets: FollowupSqlBuckets; warnings: string[] } {
  const buckets: FollowupSqlBuckets = {
    CUSTOMERS: [],
    ISH_KESHER: [],
    HATSAOTHEADER: [],
    ORDERS: [],
    HITKASHRUT: [],
  };
  const warnings: string[] = [];
  const chunks = extractInsertStatements(sql);

  for (const ch of chunks) {
    const upper = ch.toUpperCase();
    if (upper.includes('SELECT') && upper.includes('INSERT')) {
      warnings.push('דילוג על INSERT…SELECT (לא נתמך בגרסה זו)');
      continue;
    }
    const parsed = parseInsertStatement(ch);
    if (!parsed) {
      warnings.push('משפט INSERT לא זוהה במלואו (דילוג)');
      continue;
    }
    const t = parsed.table.replace(/[\[\]"`]/g, '').trim().toUpperCase();
    if (!FOLLOWUP_TABLES.has(t)) continue;

    if (!parsed.columns || !parsed.columns.length) {
      warnings.push(`טבלה ${t}: INSERT ללא רשימת עמודות — דילוג (נדרש מיפוי עמודות)`);
      continue;
    }

    const objs = rowObjects(parsed.columns, parsed.rows);
    buckets[t].push(...objs);
  }

  return { buckets, warnings };
}
