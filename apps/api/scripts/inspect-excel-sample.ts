/**
 * Quick peek at first N rows of an xlsx (avoids loading huge sheets fully).
 * Usage: npx tsx scripts/inspect-excel-sample.ts <path.xlsx> [maxRows=100]
 */
import * as XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const p = resolve(process.argv[2] || '');
const maxRows = Math.max(2, parseInt(process.argv[3] || '100', 10) || 100);
if (!p || !existsSync(p)) {
  console.error('Usage: tsx scripts/inspect-excel-sample.ts <file.xlsx> [maxRows]');
  process.exit(1);
}

const wb = XLSX.read(readFileSync(p), { type: 'buffer', sheetRows: maxRows });
console.log('SheetNames:', wb.SheetNames.join(' | '));
for (const sn of wb.SheetNames) {
  const sh = wb.Sheets[sn];
  const ref = sh['!ref'] || 'A1';
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sh, {
    defval: null,
    raw: false,
  });
  const hdr = rows[0] ? Object.keys(rows[0]) : [];
  console.log('\n---', sn, '---');
  console.log('!ref (may be truncated by sheetRows):', ref);
  console.log('Rows loaded (capped):', rows.length);
  console.log('Header count:', hdr.length);
  console.log('Headers:', hdr.join(' | '));
  if (rows[0]) console.log('First data row sample (first 15 keys):');
  const k = hdr.slice(0, 15);
  const o = rows[0] as Record<string, unknown>;
  for (const key of k) console.log(' ', key, '=', o[key]);
}
