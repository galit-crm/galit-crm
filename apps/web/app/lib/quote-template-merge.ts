/**
 * מיזוג משתנים דינמיים בתבניות HTML להצעות מחיר.
 * פורמט: {{variableName}}
 */

export type QuoteTemplateLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
};

export type MergeQuoteTemplateInput = {
  customer: {
    name: string;
    contactName?: string | null;
    address?: string | null;
    city?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  serviceName: string;
  quoteNumber: string;
  quoteDate: Date;
  notes: string;
  lineItems: QuoteTemplateLineItem[];
  vatPercent: number;
  discountType: string;
  discountValue: number;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function computeTotalWithVat(input: {
  subtotalBeforeVat: number;
  vatPercent: number;
  discountType: string;
  discountValue: number;
}): number {
  const base = Math.max(0, input.subtotalBeforeVat);
  const vat = base * (input.vatPercent / 100);
  const withVat = base + vat;
  const discType = (input.discountType || 'NONE').toUpperCase();
  const discVal = Number(input.discountValue) || 0;
  let discounted = withVat;
  if (discType === 'CURRENCY') discounted = withVat - discVal;
  if (discType === 'PERCENT') discounted = withVat * (1 - discVal / 100);
  return Math.max(0, Math.round(discounted * 100) / 100);
}

export function buildItemsTableHtml(items: QuoteTemplateLineItem[], formatMoney: (n: number) => string): string {
  if (!items.length) {
    return '<p dir="rtl">—</p>';
  }
  const rows = items
    .map((li) => {
      const line =
        li.lineTotal !== undefined ? li.lineTotal : Math.round(li.quantity * li.unitPrice * 100) / 100;
      return `<tr><td>${escapeHtml(li.name)}</td><td>${li.quantity}</td><td>${formatMoney(li.unitPrice)}</td><td>${formatMoney(line)}</td></tr>`;
    })
    .join('');
  return `<table dir="rtl" class="quote-items-table" border="1" cellpadding="8" style="border-collapse:collapse;width:100%;max-width:720px;"><thead><tr><th>תיאור</th><th>כמות</th><th>מחיר יחידה</th><th>סה״כ שורה</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** בונה מפת ערכים למשתני {{...}} */
export function buildQuoteTemplateContext(
  input: MergeQuoteTemplateInput,
  formatMoney: (n: number) => string,
): Record<string, string> {
  const c = input.customer;
  const lineItems = input.lineItems.map((li) => ({
    ...li,
    lineTotal: li.lineTotal !== undefined ? li.lineTotal : Math.round(li.quantity * li.unitPrice * 100) / 100,
  }));
  const subtotal = Math.round(lineItems.reduce((a, li) => a + (li.lineTotal ?? 0), 0) * 100) / 100;
  const vatAmount = Math.round(subtotal * (input.vatPercent / 100) * 100) / 100;
  const total = computeTotalWithVat({
    subtotalBeforeVat: subtotal,
    vatPercent: input.vatPercent,
    discountType: input.discountType,
    discountValue: input.discountValue,
  });

  return {
    customerName: c?.name ?? '',
    contactName: c?.contactName ?? '',
    customerAddress: c?.address ?? '',
    customerCity: c?.city ?? '',
    customerEmail: c?.email ?? '',
    customerPhone: c?.phone ?? '',
    quoteDate: input.quoteDate.toLocaleDateString('he-IL'),
    quoteNumber: input.quoteNumber || '—',
    serviceName: input.serviceName,
    itemsTable: buildItemsTableHtml(lineItems, formatMoney),
    subtotal: formatMoney(subtotal),
    vat: formatMoney(vatAmount),
    total: formatMoney(total),
    notes: input.notes || '',
    terms: '',
  };
}

/** מחליף {{key}} בטקסט; מפתחות לא קיימים נשארים ריקים */
export function mergeTemplatePlaceholders(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, key: string) => (key in ctx ? ctx[key] : ''));
}

export function mergeQuoteTemplateParts(
  parts: {
    introHtml?: string | null;
    bodyHtml?: string | null;
    closingHtml?: string | null;
    termsHtml?: string | null;
  },
  ctx: Record<string, string>,
): string {
  const chunks = [parts.introHtml, parts.bodyHtml, parts.closingHtml, parts.termsHtml].filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
  const merged = chunks.map((c) => mergeTemplatePlaceholders(c, ctx)).join('\n<hr class="quote-sep" />\n');
  return merged;
}

/** מיזוג מלא: פתיחה, גוף, סיום, ואז תנאים (ממוזגים פעם אחת; {{terms}} בגוף מתמלא מבלוק התנאים) */
export function mergeQuoteTemplateFull(
  tpl: {
    introHtml?: string | null;
    bodyHtml?: string | null;
    closingHtml?: string | null;
    termsHtml?: string | null;
  },
  ctx: Record<string, string>,
): string {
  const termsMerged = mergeTemplatePlaceholders(tpl.termsHtml || '', ctx);
  const ctx2 = { ...ctx, terms: termsMerged };
  const chunks = [
    mergeTemplatePlaceholders(tpl.introHtml || '', ctx2),
    mergeTemplatePlaceholders(tpl.bodyHtml || '', ctx2),
    mergeTemplatePlaceholders(tpl.closingHtml || '', ctx2),
    termsMerged,
  ].filter((x) => x.trim().length > 0);
  return chunks.join('\n<hr class="quote-sep" />\n');
}

export function mergedHtmlToPlainDescription(html: string): string {
  return stripHtml(html).slice(0, 8000);
}

/** ערכי שירות לתבניות ולהצעות — התאמה מדויקת לשדה serviceType בתבנית */
export const QUOTE_SERVICE_TYPE_OPTIONS = [
  'קרינה',
  'אקוסטיקה / רעש',
  'ראדון',
  'אסבסט',
  'איכות אוויר',
  'מיגון קרינה',
  'דוחות סביבתיים',
  'בדיקות סביבתיות',
] as const;

/** רשימת משתנים לתצוגה בהגדרות */
export const QUOTE_TEMPLATE_VARIABLES_HELP = `
{{customerName}} — שם לקוח
{{contactName}} — איש קשר
{{customerAddress}} — כתובת
{{customerCity}} — עיר
{{customerEmail}} — אימייל
{{customerPhone}} — טלפון
{{quoteDate}} — תאריך הצעה
{{quoteNumber}} — מספר הצעה
{{serviceName}} — שם שירות
{{itemsTable}} — טבלת פריטים (HTML)
{{subtotal}} — סכום לפני מע״מ (מחושב מפריטים)
{{vat}} — סכום מע״מ
{{total}} — סה״כ כולל מע״מ (אחרי הנחה)
{{notes}} — הערות מהטופס
{{terms}} — בלוק תנאים (מתבנית או מהטופס)
`.trim();
