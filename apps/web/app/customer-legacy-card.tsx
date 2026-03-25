'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, apiUrl } from './lib/api-base';
import { parseApiErrorResponse } from './lib/api-error';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/** לקוח כפי שמגיע מה־API (שדות נוספים אופציונליים לייבוא) */
export type CustomerCardCustomer = {
  id: string;
  name: string;
  type: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  address?: string | null;
  status: string;
  services: string[];
  notes?: string | null;
  phone2?: string | null;
  phone3?: string | null;
  fax?: string | null;
  website?: string | null;
  companyRegNumber?: string | null;
  internalNotes?: string | null;
  zipLegacy?: string | null;
  cityCodeLegacy?: string | null;
  legacyUpdatedAt?: string | null;
  balanceLegacy?: unknown;
  importLegacyId?: string | null;
  birthdayLegacy?: string | null;
  /** API / Prisma — כרטיס ישן */
  legacyAccountNumber?: string | null;
  legacySubClassificationCode?: string | null;
  salesRepresentative?: string | null;
  functionalLabel?: string | null;
  customerSize?: string | null;
  managementProfile?: string | null;
  countryOrRegion?: string | null;
  mailingInvalidField?: string | null;
  mailingPoBox?: string | null;
  allowMail?: boolean | null;
  allowFax?: boolean | null;
  allowEmail?: boolean | null;
  allowSms?: boolean | null;
  mailingNote?: string | null;
  registrationDate?: string | null;
  lastUpdateDate?: string | null;
  lastUpdatedBy?: string | null;
  priceList?: string | null;
  roundedPricing?: string | null;
  employeeCount?: string | null;
  managementCustomerLabel?: string | null;
  financialNumber1?: string | null;
  financialNumber2?: string | null;
  financialNumber2Large?: string | null;
  financialNumber3?: string | null;
  financeToken?: string | null;
  financeTokenDate?: string | null;
  financeTokenActive?: boolean | null;
  financeUnnamed1?: string | null;
  financeUnnamed2?: string | null;
  financeUnnamed3?: string | null;
  financeUnnamed4?: string | null;
  totalPurchases?: unknown;
  totalSales?: unknown;
  percentageValue?: unknown;
  paymentTerms?: string | null;
  creditDays?: string | null;
  creditEnabled?: boolean | null;
  creditNumber?: string | null;
  creditExpiry?: string | null;
  microwaveModel?: string | null;
  detectorLocation?: string | null;
  companyAmount?: string | null;
  feature7?: string | null;
  detailDate1?: string | null;
  detailDate2?: string | null;
  detailDate3?: string | null;
  detailDate4?: string | null;
  detectorModel?: string | null;
  feature4?: string | null;
  companyWall?: string | null;
  feature8?: string | null;
};

export type CustomerClassificationOption = {
  id: string;
  code: string;
  labelHe: string;
  sortOrder: number;
  isPreset: boolean;
};

type AppUser = {
  id: string;
  role: string;
  name: string;
  email: string;
};

type CustomerFull = {
  leads: unknown[];
  quotes: unknown[];
  tasks: unknown[];
  reports: unknown[];
  contacts?: CustomerLegacyContact[];
  /** מסמכי לקוח — כשיוחזר מ־GET /customers/:id/full */
  documents?: unknown[];
  /** שורות נתונים נוספים (מיגרציה / שדות דינמיים) */
  additionalData?: unknown[];
  /** טבלת נתונים חיצוניים A–J */
  externalData?: unknown[];
  referralSources?: unknown[];
  questionnaires?: unknown[];
  relations?: unknown[];
  additionalDataRows?: unknown[];
  externalDataRows?: unknown[];
};

type CustomerLegacyContact = {
  id: string;
  fullName: string;
  department?: string | null;
  roleTitle?: string | null;
  mobile?: string | null;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
  notes?: string | null;
};

/** טאב נתונים כספיים — תואם מסך ישן; נשמר ב־PATCH יחד עם שאר כרטיס הלקוח */
export type CustomerFinanceTabForm = {
  totalPurchases: string;
  totalSales: string;
  percent: string;
  paymentTerms: string;
  creditDays: string;
  creditOn: boolean;
  creditNumber: string;
  validity: string;
  priceList: string;
  rounded: string;
  employeeCount: string;
  customerInManagement: string;
  number1: string;
  number2Small: string;
  number2Large: string;
  number3: string;
  tokenOn: boolean;
  tokenText: string;
  tokenDate: string;
  unnamedAux1: string;
  unnamedAux2: string;
  unnamedAux3: string;
  unnamedAux4: string;
};

function str(v: unknown): string {
  return v != null ? String(v) : '';
}

function customerEmailLooksValid(email: string): boolean {
  const t = email.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function toIsoDateInputValue(v: unknown): string {
  if (v == null || v === '') return '';
  const d = new Date(typeof v === 'string' ? v : String(v));
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function emptyFinanceTabForm(): CustomerFinanceTabForm {
  return {
    totalPurchases: '',
    totalSales: '',
    percent: '',
    paymentTerms: '',
    creditDays: '',
    creditOn: false,
    creditNumber: '',
    validity: '',
    priceList: '',
    rounded: '',
    employeeCount: '',
    customerInManagement: '',
    number1: '',
    number2Small: '',
    number2Large: '',
    number3: '',
    tokenOn: false,
    tokenText: '',
    tokenDate: '',
    unnamedAux1: '',
    unnamedAux2: '',
    unnamedAux3: '',
    unnamedAux4: '',
  };
}

function buildFinanceFormFromCustomer(c: CustomerCardCustomer): CustomerFinanceTabForm {
  const x = c as Record<string, unknown>;
  const fromDb: CustomerFinanceTabForm = {
    ...emptyFinanceTabForm(),
    totalPurchases: x.totalPurchases != null ? String(x.totalPurchases) : '',
    totalSales: x.totalSales != null ? String(x.totalSales) : '',
    percent: x.percentageValue != null ? String(x.percentageValue) : '',
    paymentTerms: str(x.paymentTerms),
    creditDays: str(x.creditDays),
    creditOn: Boolean(x.creditEnabled),
    creditNumber: str(x.creditNumber),
    validity: str(x.creditExpiry),
    priceList: str(x.priceList),
    rounded: str(x.roundedPricing),
    employeeCount: str(x.employeeCount),
    customerInManagement: str(x.managementCustomerLabel),
    number1: str(x.financialNumber1),
    number2Small: str(x.financialNumber2),
    number2Large: str(x.financialNumber2Large),
    number3: str(x.financialNumber3),
    tokenOn: Boolean(x.financeTokenActive),
    tokenText: str(x.financeToken),
    tokenDate: x.financeTokenDate != null ? toIsoDateInputValue(x.financeTokenDate) : '',
    unnamedAux1: str(x.financeUnnamed1),
    unnamedAux2: str(x.financeUnnamed2),
    unnamedAux3: str(x.financeUnnamed3),
    unnamedAux4: str(x.financeUnnamed4),
  };
  const raw = x.financeTab;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...fromDb, ...(raw as Partial<CustomerFinanceTabForm>) };
  }
  return fromDb;
}

/** טאב מקור הגעה — תאריך ושם מקור; נשמר ב־PUT /customers/:id/referral-sources */
export type CustomerLeadSourceRow = {
  id: string;
  date: string;
  sourceName: string;
};

function newLeadSourceRow(): CustomerLeadSourceRow {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `ls-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: '',
    sourceName: '',
  };
}

/** טוען מ־GET /customers/:id/full (referralSources) או מ־customer.leadSources (גיבוי) */
function buildLeadSourceRowsFromFull(full: CustomerFull | null, c: CustomerCardCustomer): CustomerLeadSourceRow[] {
  const raw =
    (full?.referralSources as unknown[] | undefined) ??
    ((c as Record<string, unknown>).leadSources as unknown[] | undefined);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const o = item as Record<string, unknown>;
      return {
        id: typeof o.id === 'string' ? o.id : `ls-${i}-${c.id}`,
        date: o.date != null ? toIsoDateInputValue(o.date) || String(o.date).slice(0, 10) : '',
        sourceName: o.sourceName != null ? String(o.sourceName) : '',
      };
    })
    .filter((r): r is CustomerLeadSourceRow => r != null);
}

export type CustomerQuestionnaireRow = {
  id: string;
  code: string;
  name: string;
};

function newQuestionnaireRow(): CustomerQuestionnaireRow {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `qn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    code: '',
    name: '',
  };
}

function buildQuestionnaireRowsFromFull(full: CustomerFull | null, c: CustomerCardCustomer): CustomerQuestionnaireRow[] {
  const raw =
    (full?.questionnaires as unknown[] | undefined) ??
    ((c as Record<string, unknown>).questionnaires as unknown[] | undefined);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const o = item as Record<string, unknown>;
      return {
        id: typeof o.id === 'string' ? o.id : `qn-${i}-${c.id}`,
        code: o.questionnaireCode != null ? String(o.questionnaireCode) : '',
        name: o.questionnaireName != null ? String(o.questionnaireName) : '',
      };
    })
    .filter((r): r is CustomerQuestionnaireRow => r != null);
}

/** שדות דיוור שלא ב־PATCH היום; כתובת/עיר/מיקוד נלקחים מ־customerForm (address, city, zipLegacy) */
export type CustomerMailingTabExtras = {
  wrongField: string;
  poBox: string;
  prefMailing: boolean;
  prefFax: boolean;
  prefEmail: boolean;
  prefSms: boolean;
  mailingNote: string;
};

function emptyMailingExtras(): CustomerMailingTabExtras {
  return {
    wrongField: '',
    poBox: '',
    prefMailing: false,
    prefFax: false,
    prefEmail: false,
    prefSms: false,
    mailingNote: '',
  };
}

/** טוען מ־customer.mailingTab או משדות עתידיים על אובייקט הלקוח */
function buildMailingExtrasFromCustomer(c: CustomerCardCustomer): CustomerMailingTabExtras {
  const x = c as Record<string, unknown>;
  const raw = x.mailingTab;
  const base = emptyMailingExtras();
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const m = raw as Record<string, unknown>;
    return {
      wrongField: m.wrongField != null ? String(m.wrongField) : base.wrongField,
      poBox: m.poBox != null ? String(m.poBox) : base.poBox,
      prefMailing: Boolean(m.prefMailing),
      prefFax: Boolean(m.prefFax),
      prefEmail: Boolean(m.prefEmail),
      prefSms: Boolean(m.prefSms),
      mailingNote: m.mailingNote != null ? String(m.mailingNote) : base.mailingNote,
    };
  }
  return {
    ...base,
    wrongField:
      x.mailingInvalidField != null
        ? String(x.mailingInvalidField)
        : x.wrongField != null
          ? String(x.wrongField)
          : '',
    poBox: x.mailingPoBox != null ? String(x.mailingPoBox) : x.poBox != null ? String(x.poBox) : '',
    prefMailing: x.allowMail != null ? Boolean(x.allowMail) : Boolean(x.prefMailing),
    prefFax: x.allowFax != null ? Boolean(x.allowFax) : Boolean(x.prefFax),
    prefEmail: x.allowEmail != null ? Boolean(x.allowEmail) : Boolean(x.prefEmail),
    prefSms: x.allowSms != null ? Boolean(x.allowSms) : Boolean(x.prefSms),
    mailingNote: x.mailingNote != null ? String(x.mailingNote) : '',
  };
}

/** טאב הערות — תאריכים, משתמש אחרון, והערות (notes / internalNotes) דרך PATCH */
export type CustomerNotesTabExtras = {
  registrationDate: string;
  lastUpdateDate: string;
  lastUser: string;
};

function buildNotesTabExtrasFromCustomer(c: CustomerCardCustomer): CustomerNotesTabExtras {
  const x = c as Record<string, unknown>;
  const raw = x.notesTab;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const n = raw as Record<string, unknown>;
    return {
      registrationDate: n.registrationDate != null ? toIsoDateInputValue(n.registrationDate) : '',
      lastUpdateDate: n.lastUpdateDate != null ? toIsoDateInputValue(n.lastUpdateDate) : '',
      lastUser: n.lastUser != null ? String(n.lastUser) : '',
    };
  }
  return {
    registrationDate:
      x.registrationDate != null
        ? toIsoDateInputValue(x.registrationDate)
        : toIsoDateInputValue(x.createdAt),
    lastUpdateDate:
      x.lastUpdateDate != null
        ? toIsoDateInputValue(x.lastUpdateDate)
        : toIsoDateInputValue(c.legacyUpdatedAt ?? x.updatedAt),
    lastUser: x.lastUpdatedBy != null ? String(x.lastUpdatedBy) : x.lastUser != null ? String(x.lastUser) : '',
  };
}

/** טאב קשרים — שם לקוח מקושר וסוג קשר; נשמר ב־PUT /customers/:id/relations */
export type CustomerRelationRow = {
  id: string;
  customerName: string;
  relationType: string;
};

function newRelationRow(): CustomerRelationRow {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `rel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    customerName: '',
    relationType: '',
  };
}

function buildRelationRowsFromFull(full: CustomerFull | null, c: CustomerCardCustomer): CustomerRelationRow[] {
  const raw =
    (full?.relations as unknown[] | undefined) ?? ((c as Record<string, unknown>).relations as unknown[] | undefined);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const o = item as Record<string, unknown>;
      const name =
        o.relatedCustomerName != null
          ? String(o.relatedCustomerName)
          : o.customerName != null
            ? String(o.customerName)
            : '';
      return {
        id: typeof o.id === 'string' ? o.id : `rel-${i}-${c.id}`,
        customerName: name,
        relationType: o.relationType != null ? String(o.relationType) : '',
      };
    })
    .filter((r): r is CustomerRelationRow => r != null);
}

/** טאב מסמכים — עמודות כמסך ישן; מיפוי עתידי ל־Prisma Document */
export type CustomerDocumentTabRow = {
  id: string;
  fileName: string;
  userName: string;
  dateStr: string;
  docType: string;
  description: string;
  /** נתיב/URL לקובץ אחרי חיבור אחסון */
  filePath: string;
};

function newDocumentTabRow(): CustomerDocumentTabRow {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fileName: '',
    userName: '',
    dateStr: '',
    docType: '',
    description: '',
    filePath: '',
  };
}

function mapUnknownToDocumentRow(item: unknown, fallbackId: string): CustomerDocumentTabRow | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const o = item as Record<string, unknown>;
  const ub = o.uploadedBy as Record<string, unknown> | null | undefined;
  const userName =
    ub && typeof ub === 'object' && ub.name != null
      ? String(ub.name)
      : o.userName != null
        ? String(o.userName)
        : '';
  const dateRaw = o.documentDate ?? o.createdAt;
  return {
    id: typeof o.id === 'string' ? o.id : fallbackId,
    fileName: o.name != null ? String(o.name) : o.fileName != null ? String(o.fileName) : '',
    userName,
    dateStr: dateRaw != null ? toIsoDateInputValue(dateRaw) || String(dateRaw).slice(0, 10) : '',
    docType: o.documentType != null ? String(o.documentType) : '',
    description: o.description != null ? String(o.description) : '',
    filePath: o.filePath != null ? String(o.filePath) : '',
  };
}

function buildDocumentRowsFromFull(full: CustomerFull | null): CustomerDocumentTabRow[] {
  const raw = full?.documents;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => mapUnknownToDocumentRow(item, `doc-${i}`))
    .filter((r): r is CustomerDocumentTabRow => r != null);
}

/** טאב נתונים נוספים — עמודות כמסך ישן (שדות גנריים) */
export type CustomerAdditionalDataRow = {
  id: string;
  number: string;
  d: string;
  dateStr: string;
  text2: string;
  text1: string;
};

function newAdditionalDataRow(): CustomerAdditionalDataRow {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `ad-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    number: '',
    d: '',
    dateStr: '',
    text2: '',
    text1: '',
  };
}

function mapUnknownToAdditionalDataRow(item: unknown, fallbackId: string): CustomerAdditionalDataRow | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const o = item as Record<string, unknown>;
  const dateRaw = o.dateValue ?? o.dateStr ?? o.date ?? o.taarich;
  return {
    id: typeof o.id === 'string' ? o.id : fallbackId,
    number:
      o.numberValue != null
        ? String(o.numberValue)
        : o.number != null
          ? String(o.number)
          : o.mispar != null
            ? String(o.mispar)
            : '',
    d:
      o.dValue != null ? String(o.dValue) : o.d != null ? String(o.d) : o.D != null ? String(o.D) : '',
    dateStr: dateRaw != null ? toIsoDateInputValue(dateRaw) || String(dateRaw).slice(0, 10) : '',
    text2: o.text2 != null ? String(o.text2) : o.tekst2 != null ? String(o.tekst2) : '',
    text1: o.text1 != null ? String(o.text1) : o.tekst1 != null ? String(o.tekst1) : '',
  };
}

function buildAdditionalDataRows(c: CustomerCardCustomer, full: CustomerFull | null): CustomerAdditionalDataRow[] {
  const x = c as Record<string, unknown>;
  const raw = full?.additionalDataRows ?? full?.additionalData ?? x.additionalData;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => mapUnknownToAdditionalDataRow(item, `ad-${i}-${c.id}`))
    .filter((r): r is CustomerAdditionalDataRow => r != null);
}

/** טאב פרטים נוספים — שדות מובנים מהמערכת הישנה; תאריך לידה ↔ birthdayLegacy ב־Prisma */
export type CustomerMoreDetailsForm = {
  microgelModel: string;
  detectorLocation: string;
  companyQuantity: string;
  feature7: string;
  date1: string;
  date3: string;
  birthDate: string;
  detectorModel: string;
  feature4: string;
  wallCompany: string;
  feature8: string;
  date2: string;
  date4: string;
};

function emptyMoreDetailsForm(): CustomerMoreDetailsForm {
  return {
    microgelModel: '',
    detectorLocation: '',
    companyQuantity: '',
    feature7: '',
    date1: '',
    date3: '',
    birthDate: '',
    detectorModel: '',
    feature4: '',
    wallCompany: '',
    feature8: '',
    date2: '',
    date4: '',
  };
}

function buildMoreDetailsFromCustomer(c: CustomerCardCustomer): CustomerMoreDetailsForm {
  const x = c as Record<string, unknown>;
  const base = emptyMoreDetailsForm();
  const fromApi: Partial<CustomerMoreDetailsForm> = {
    microgelModel: str(x.microwaveModel ?? x.microgelModel),
    detectorLocation: str(x.detectorLocation),
    companyQuantity: str(x.companyAmount ?? x.companyQuantity),
    feature7: str(x.feature7),
    date1: x.detailDate1 != null ? toIsoDateInputValue(x.detailDate1) : '',
    date3: x.detailDate3 != null ? toIsoDateInputValue(x.detailDate3) : '',
    detectorModel: str(x.detectorModel),
    feature4: str(x.feature4),
    wallCompany: str(x.companyWall ?? x.wallCompany),
    feature8: str(x.feature8),
    date2: x.detailDate2 != null ? toIsoDateInputValue(x.detailDate2) : '',
    date4: x.detailDate4 != null ? toIsoDateInputValue(x.detailDate4) : '',
  };
  const raw = x.moreDetailsTab;
  let fromTab: Partial<CustomerMoreDetailsForm> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const m = raw as Record<string, unknown>;
    fromTab = {
      microgelModel: str(m.microgelModel),
      detectorLocation: str(m.detectorLocation),
      companyQuantity: str(m.companyQuantity),
      feature7: str(m.feature7),
      date1: m.date1 != null ? toIsoDateInputValue(m.date1) || str(m.date1).slice(0, 10) : '',
      date3: m.date3 != null ? toIsoDateInputValue(m.date3) || str(m.date3).slice(0, 10) : '',
      birthDate: m.birthDate != null ? toIsoDateInputValue(m.birthDate) || str(m.birthDate).slice(0, 10) : '',
      detectorModel: str(m.detectorModel),
      feature4: str(m.feature4),
      wallCompany: str(m.wallCompany),
      feature8: str(m.feature8),
      date2: m.date2 != null ? toIsoDateInputValue(m.date2) || str(m.date2).slice(0, 10) : '',
      date4: m.date4 != null ? toIsoDateInputValue(m.date4) || str(m.date4).slice(0, 10) : '',
    };
  }
  const merged = { ...base, ...fromApi, ...fromTab };
  const birthDate =
    merged.birthDate && merged.birthDate.length > 0
      ? merged.birthDate
      : toIsoDateInputValue(c.birthdayLegacy ?? x.birthdayLegacy) || '';
  return { ...merged, birthDate };
}

const MORE_DETAILS_RIGHT_FIELDS: Array<{
  key: keyof CustomerMoreDetailsForm;
  label: string;
  kind: 'text' | 'date';
}> = [
  { key: 'microgelModel', label: 'דגם מקרוגל', kind: 'text' },
  { key: 'detectorLocation', label: 'מיקום גלאי', kind: 'text' },
  { key: 'companyQuantity', label: 'כמות חברה', kind: 'text' },
  { key: 'feature7', label: 'מאפיין 7', kind: 'text' },
  { key: 'date1', label: 'תאריך 1', kind: 'date' },
  { key: 'date3', label: 'תאריך 3', kind: 'date' },
  { key: 'birthDate', label: 'תאריך לידה', kind: 'date' },
];

const MORE_DETAILS_LEFT_FIELDS: Array<{
  key: keyof CustomerMoreDetailsForm;
  label: string;
  kind: 'text' | 'date';
}> = [
  { key: 'detectorModel', label: 'דגם גלאי', kind: 'text' },
  { key: 'feature4', label: 'מאפיין 4', kind: 'text' },
  { key: 'wallCompany', label: 'חומה חברה', kind: 'text' },
  { key: 'feature8', label: 'מאפיין 8', kind: 'text' },
  { key: 'date2', label: 'תאריך 2', kind: 'date' },
  { key: 'date4', label: 'תאריך 4', kind: 'date' },
];

export const EXTERNAL_DATA_COLUMN_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
export type ExternalDataColumnKey = (typeof EXTERNAL_DATA_COLUMN_KEYS)[number];

/** שורה בטאב נתונים חיצוניים — עמודות A–J בלבד */
export type CustomerExternalDataRow = { id: string } & Record<ExternalDataColumnKey, string>;

function newExternalDataRow(): CustomerExternalDataRow {
  const id = globalThis.crypto?.randomUUID?.() ?? `ext-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
    F: '',
    G: '',
    H: '',
    I: '',
    J: '',
  };
}

function mapUnknownToExternalRow(item: unknown, fallbackId: string): CustomerExternalDataRow | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const o = item as Record<string, unknown>;
  const row = newExternalDataRow();
  row.id = typeof o.id === 'string' ? o.id : fallbackId;
  const colMap: Record<ExternalDataColumnKey, string> = {
    A: 'colA',
    B: 'colB',
    C: 'colC',
    D: 'colD',
    E: 'colE',
    F: 'colF',
    G: 'colG',
    H: 'colH',
    I: 'colI',
    J: 'colJ',
  };
  for (const k of EXTERNAL_DATA_COLUMN_KEYS) {
    const colKey = colMap[k];
    const v = o[k] ?? o[colKey];
    row[k] = v != null ? String(v) : '';
  }
  return row;
}

function buildExternalDataRows(c: CustomerCardCustomer, full: CustomerFull | null): CustomerExternalDataRow[] {
  const x = c as Record<string, unknown>;
  const raw = full?.externalDataRows ?? full?.externalData ?? x.externalData;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => mapUnknownToExternalRow(item, `ext-${i}-${c.id}`))
    .filter((r): r is CustomerExternalDataRow => r != null);
}

const PRESET_CUSTOMER_TYPE_LABELS: Record<string, string> = {
  COMPANY: 'חברה / קבלן',
  PUBLIC: 'רשות / מוסד',
  PRIVATE: 'לקוח פרטי',
};

function resolveCustomerTypeLabel(type: string, labelMap: Record<string, string>) {
  const t = (type || '').trim();
  return labelMap[t] || PRESET_CUSTOMER_TYPE_LABELS[t] || t || '-';
}

type LowerTabKey =
  | 'contacts'
  | 'finance'
  | 'source'
  | 'questionnaires'
  | 'copy'
  | 'mailing'
  | 'notes'
  | 'relations'
  | 'documents'
  | 'additionalData'
  | 'moreDetails'
  | 'externalData';

const LOWER_TABS: Array<{ key: LowerTabKey; label: string }> = [
  { key: 'contacts', label: 'אנשי קשר' },
  { key: 'finance', label: 'נתונים כספיים' },
  { key: 'source', label: 'מקור הגעה' },
  { key: 'questionnaires', label: 'שאלונים' },
  { key: 'copy', label: 'העתק' },
  { key: 'mailing', label: 'פרטי דיוור' },
  { key: 'notes', label: 'הערות' },
  { key: 'relations', label: 'קשרים' },
  { key: 'documents', label: 'מסמכים' },
  { key: 'additionalData', label: 'נתונים נוספים' },
  { key: 'moreDetails', label: 'פרטים נוספים' },
  { key: 'externalData', label: 'נתונים חיצוניים' },
];

function formatLegacyDate(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('he-IL');
  }
  return String(v);
}

export function CustomerLegacyCard({
  customer,
  full,
  currentUser,
  onCustomerUpdated,
  onFullReload,
  typeLabelMap = PRESET_CUSTOMER_TYPE_LABELS,
  classifications = [],
  primaryColor,
}: {
  customer: CustomerCardCustomer;
  full: CustomerFull | null;
  currentUser: AppUser;
  onCustomerUpdated: (next: CustomerCardCustomer) => void;
  onFullReload: () => Promise<void>;
  typeLabelMap?: Record<string, string>;
  classifications?: CustomerClassificationOption[];
  primaryColor: string;
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [activeLowerTab, setActiveLowerTab] = useState<LowerTabKey>('contacts');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const saveMainInFlightRef = useRef(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactEdit, setContactEdit] = useState<CustomerLegacyContact | null>(null);
  const [contacts, setContacts] = useState<CustomerLegacyContact[]>(Array.isArray(full?.contacts) ? full!.contacts! : []);
  const [legacyMsg, setLegacyMsg] = useState('');

  const buildFormFromCustomer = useCallback((c: CustomerCardCustomer) => {
    const x = c as Record<string, unknown>;
    return {
      type: c.type || '',
      name: c.name || '',
      classificationCode: c.type || '',
      classificationNumber:
        (c.legacySubClassificationCode as string) ||
        (x.subClassification as string) ||
        (x.classificationNumber as string) ||
        '',
      salesRep: (c.salesRepresentative as string) || (x.salesRep as string) || '',
      functional: (c.functionalLabel as string) || (x.functional as string) || '',
      contactName: c.contactName || '',
      accountNumber:
        (c.legacyAccountNumber as string) || (x.hnum as string) || (x.accountNumber as string) || '',
      companyRegNumber: (c.companyRegNumber as string) || (x.companyNumber as string) || '',
      customerSize: (c.customerSize ?? (x.customerSize as string)) || '',
      managementProfile: (c.managementProfile as string) || '',
      phone: c.phone || '',
      phone2: (c.phone2 as string) || '',
      phone3: (c.phone3 as string) || '',
      fax: (c.fax as string) || '',
      address: (c.address as string) || '',
      city: c.city || '',
      email: c.email || '',
      website: (c.website as string) || '',
      zipLegacy: (c.zipLegacy as string) || '',
      cityCodeLegacy: (c.cityCodeLegacy as string) || '',
      countryRegion: (c.countryOrRegion as string) || (x.country as string) || (x.region as string) || '',
      topDate: formatLegacyDate(c.legacyUpdatedAt),
      notes: (c.notes as string) || '',
      internalNotes: (c.internalNotes as string) || '',
    };
  }, []);

  const [customerForm, setCustomerForm] = useState(() => buildFormFromCustomer(customer));

  useEffect(() => {
    setCustomerForm(buildFormFromCustomer(customer));
  }, [customer, buildFormFromCustomer]);

  const [financeForm, setFinanceForm] = useState<CustomerFinanceTabForm>(() => buildFinanceFormFromCustomer(customer));

  useEffect(() => {
    setFinanceForm(buildFinanceFormFromCustomer(customer));
  }, [customer]);

  useEffect(() => {
    setContacts(Array.isArray(full?.contacts) ? full!.contacts! : []);
  }, [full?.contacts, customer.id]);

  const [leadSourceRows, setLeadSourceRows] = useState<CustomerLeadSourceRow[]>(() =>
    buildLeadSourceRowsFromFull(full, customer),
  );

  useEffect(() => {
    setLeadSourceRows(buildLeadSourceRowsFromFull(full, customer));
  }, [full, customer]);

  const [mailingExtras, setMailingExtras] = useState<CustomerMailingTabExtras>(() => buildMailingExtrasFromCustomer(customer));

  useEffect(() => {
    setMailingExtras(buildMailingExtrasFromCustomer(customer));
  }, [customer]);

  const [notesTabExtras, setNotesTabExtras] = useState<CustomerNotesTabExtras>(() => buildNotesTabExtrasFromCustomer(customer));

  useEffect(() => {
    setNotesTabExtras(buildNotesTabExtrasFromCustomer(customer));
  }, [customer]);

  const [relationRows, setRelationRows] = useState<CustomerRelationRow[]>(() =>
    buildRelationRowsFromFull(full, customer),
  );

  useEffect(() => {
    setRelationRows(buildRelationRowsFromFull(full, customer));
  }, [full, customer]);

  const [questionnaireRows, setQuestionnaireRows] = useState<CustomerQuestionnaireRow[]>(() =>
    buildQuestionnaireRowsFromFull(full, customer),
  );

  useEffect(() => {
    setQuestionnaireRows(buildQuestionnaireRowsFromFull(full, customer));
  }, [full, customer]);

  const [documentRows, setDocumentRows] = useState<CustomerDocumentTabRow[]>(() => buildDocumentRowsFromFull(full));
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  useEffect(() => {
    setDocumentRows(buildDocumentRowsFromFull(full));
    setSelectedDocumentId(null);
  }, [full]);

  const [additionalDataRows, setAdditionalDataRows] = useState<CustomerAdditionalDataRow[]>(() =>
    buildAdditionalDataRows(customer, full),
  );

  useEffect(() => {
    setAdditionalDataRows(buildAdditionalDataRows(customer, full));
  }, [customer, full]);

  const [moreDetailsForm, setMoreDetailsForm] = useState<CustomerMoreDetailsForm>(() =>
    buildMoreDetailsFromCustomer(customer),
  );

  useEffect(() => {
    setMoreDetailsForm(buildMoreDetailsFromCustomer(customer));
  }, [customer]);

  const [externalDataRows, setExternalDataRows] = useState<CustomerExternalDataRow[]>(() =>
    buildExternalDataRows(customer, full),
  );

  useEffect(() => {
    setExternalDataRows(buildExternalDataRows(customer, full));
  }, [customer, full]);

  const sortedClassifications = useMemo(
    () => [...classifications].sort((a, b) => a.sortOrder - b.sortOrder || a.labelHe.localeCompare(b.labelHe, 'he')),
    [classifications],
  );

  const sectionShell = 'rounded-lg border-2 border-blue-700/85 bg-white shadow-sm overflow-hidden';
  const sectionHeader = 'border-b-2 border-blue-100 bg-gradient-to-l from-blue-50 to-white px-3 py-2 text-sm font-bold text-blue-950';
  const briefBoxClass = 'rounded border border-slate-200 bg-white p-2';
  const briefBoxConnected = 'rounded border border-blue-200/80 bg-slate-50/80 p-2';
  const labelClass = 'mb-1 text-[11px] font-semibold text-slate-700';
  const inputClass =
    'min-h-[1.85rem] w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-right outline-none ring-blue-200 focus:border-blue-500 focus:ring-1';
  const inputConnected = 'min-h-[1.85rem] w-full rounded border border-blue-200 bg-amber-50/50 px-2 py-1.5 text-sm text-right outline-none focus:border-blue-500 focus:ring-1';
  const viewClass =
    'min-h-[1.85rem] rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-right text-slate-800';

  const isEdit = mode === 'edit';

  const onSaveCustomerMain = async () => {
    if (saveMainInFlightRef.current) return;
    saveMainInFlightRef.current = true;
    setSavingCustomer(true);
    setLegacyMsg('');
    const isoNoon = (d: string) => (d ? `${d}T12:00:00.000Z` : null);
    const looksLikeUuid = (id: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    const typeVal = (customerForm.type || customer.type || '').trim();
    const nameVal = (customerForm.name || customer.name || '').trim();
    const contactNameVal = (customerForm.contactName || customer.contactName || '').trim();
    const phoneVal = (customerForm.phone || '').trim();
    const emailVal = (customerForm.email || '').trim();
    const cityVal = (customerForm.city || '').trim();

    try {
      if (!typeVal) {
        setLegacyMsg('נא לבחור סוג לקוח.');
        return;
      }
      if (!nameVal) {
        setLegacyMsg('שם לקוח הוא שדה חובה.');
        return;
      }
      if (!contactNameVal) {
        setLegacyMsg('שם איש קשר הוא שדה חובה.');
        return;
      }
      if (!phoneVal) {
        setLegacyMsg('טלפון הוא שדה חובה.');
        return;
      }
      if (!emailVal) {
        setLegacyMsg('דוא״ל הוא שדה חובה.');
        return;
      }
      if (!customerEmailLooksValid(emailVal)) {
        setLegacyMsg('כתובת הדוא״ל אינה תקינה.');
        return;
      }
      if (!cityVal) {
        setLegacyMsg('עיר היא שדה חובה.');
        return;
      }

      /** Body keys align with API UpdateCustomerDto + customers.service patch whitelist */
      const body: Record<string, unknown> = {
        type: typeVal,
        name: nameVal,
        contactName: contactNameVal,
        phone: phoneVal,
        phone2: (customerForm.phone2 || '').trim() || null,
        phone3: (customerForm.phone3 || '').trim() || null,
        fax: (customerForm.fax || '').trim() || null,
        address: (customerForm.address || '').trim() || null,
        city: cityVal,
        email: emailVal,
        website: (customerForm.website || '').trim() || null,
        zipLegacy: (customerForm.zipLegacy || '').trim() || null,
        cityCodeLegacy: (customerForm.cityCodeLegacy || '').trim() || null,
        notes: (customerForm.notes || '').trim() || null,
        companyRegNumber: (customerForm.companyRegNumber || '').trim() || null,
        internalNotes: (customerForm.internalNotes || '').trim() || null,
        birthdayLegacy: moreDetailsForm.birthDate ? isoNoon(moreDetailsForm.birthDate) : null,
        legacyAccountNumber: (customerForm.accountNumber || '').trim() || null,
        legacySubClassificationCode: (customerForm.classificationNumber || '').trim() || null,
        salesRepresentative: (customerForm.salesRep || '').trim() || null,
        functionalLabel: (customerForm.functional || '').trim() || null,
        customerSize: (customerForm.customerSize || '').trim() || null,
        managementProfile: (customerForm.managementProfile || '').trim() || null,
        countryOrRegion: (customerForm.countryRegion || '').trim() || null,
        mailingAddress: (customerForm.address || '').trim() || null,
        mailingCity: cityVal,
        mailingZip: (customerForm.zipLegacy || '').trim() || null,
        mailingInvalidField: (mailingExtras.wrongField || '').trim() || null,
        mailingPoBox: (mailingExtras.poBox || '').trim() || null,
        allowMail: mailingExtras.prefMailing,
        allowFax: mailingExtras.prefFax,
        allowEmail: mailingExtras.prefEmail,
        allowSms: mailingExtras.prefSms,
        mailingNote: (mailingExtras.mailingNote || '').trim() || null,
        registrationDate: isoNoon(notesTabExtras.registrationDate),
        lastUpdateDate: isoNoon(notesTabExtras.lastUpdateDate),
        lastUpdatedBy: (notesTabExtras.lastUser || '').trim() || null,
        priceList: (financeForm.priceList || '').trim() || null,
        roundedPricing: (financeForm.rounded || '').trim() || null,
        employeeCount: (financeForm.employeeCount || '').trim() || null,
        managementCustomerLabel: (financeForm.customerInManagement || '').trim() || null,
        financialNumber1: (financeForm.number1 || '').trim() || null,
        financialNumber2: (financeForm.number2Small || '').trim() || null,
        financialNumber2Large: (financeForm.number2Large || '').trim() || null,
        financialNumber3: (financeForm.number3 || '').trim() || null,
        financeToken: (financeForm.tokenText || '').trim() || null,
        financeTokenDate: isoNoon(financeForm.tokenDate),
        financeTokenActive: financeForm.tokenOn,
        financeUnnamed1: (financeForm.unnamedAux1 || '').trim() || null,
        financeUnnamed2: (financeForm.unnamedAux2 || '').trim() || null,
        financeUnnamed3: (financeForm.unnamedAux3 || '').trim() || null,
        financeUnnamed4: (financeForm.unnamedAux4 || '').trim() || null,
        totalPurchases: (financeForm.totalPurchases || '').trim() || null,
        totalSales: (financeForm.totalSales || '').trim() || null,
        percentageValue: (financeForm.percent || '').trim() || null,
        paymentTerms: (financeForm.paymentTerms || '').trim() || null,
        creditDays: (financeForm.creditDays || '').trim() || null,
        creditEnabled: financeForm.creditOn,
        creditNumber: (financeForm.creditNumber || '').trim() || null,
        creditExpiry: (financeForm.validity || '').trim() || null,
        microwaveModel: (moreDetailsForm.microgelModel || '').trim() || null,
        detectorLocation: (moreDetailsForm.detectorLocation || '').trim() || null,
        companyAmount: (moreDetailsForm.companyQuantity || '').trim() || null,
        feature7: (moreDetailsForm.feature7 || '').trim() || null,
        detailDate1: isoNoon(moreDetailsForm.date1),
        detailDate2: isoNoon(moreDetailsForm.date2),
        detailDate3: isoNoon(moreDetailsForm.date3),
        detailDate4: isoNoon(moreDetailsForm.date4),
        detectorModel: (moreDetailsForm.detectorModel || '').trim() || null,
        feature4: (moreDetailsForm.feature4 || '').trim() || null,
        companyWall: (moreDetailsForm.wallCompany || '').trim() || null,
        feature8: (moreDetailsForm.feature8 || '').trim() || null,
      };

      const putTab = async (path: string, payload: unknown, stepLabel: string) => {
        const r = await apiFetch(apiUrl(path), {
          method: 'PUT',
          authUser: currentUser,
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`${stepLabel}: ${await parseApiErrorResponse(r)}`);
      };

      const res = await apiFetch(apiUrl(`/customers/${customer.id}`), {
        method: 'PATCH',
        authUser: currentUser,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await parseApiErrorResponse(res));
      const updated = (await res.json()) as CustomerCardCustomer;
      onCustomerUpdated(updated);

      await putTab(
        `/customers/${customer.id}/referral-sources`,
        {
          items: leadSourceRows.map((r) => ({
            date: r.date ? isoNoon(r.date) : null,
            sourceName: r.sourceName || null,
          })),
        },
        'מקורות הגעה',
      );
      await putTab(
        `/customers/${customer.id}/questionnaires`,
        {
          items: questionnaireRows.map((r) => ({
            questionnaireCode: r.code || null,
            questionnaireName: r.name || null,
          })),
        },
        'שאלונים',
      );
      await putTab(
        `/customers/${customer.id}/relations`,
        {
          items: relationRows.map((r) => ({
            relatedCustomerName: r.customerName || null,
            relationType: r.relationType || null,
          })),
        },
        'קשרים',
      );
      await putTab(
        `/customers/${customer.id}/additional-data-rows`,
        {
          items: additionalDataRows.map((r) => ({
            numberValue: r.number || null,
            dValue: r.d || null,
            dateValue: r.dateStr ? isoNoon(r.dateStr) : null,
            text1: r.text1 || null,
            text2: r.text2 || null,
          })),
        },
        'נתונים נוספים',
      );
      await putTab(
        `/customers/${customer.id}/external-data-rows`,
        {
          items: externalDataRows.map((r) => ({
            colA: r.A || null,
            colB: r.B || null,
            colC: r.C || null,
            colD: r.D || null,
            colE: r.E || null,
            colF: r.F || null,
            colG: r.G || null,
            colH: r.H || null,
            colI: r.I || null,
            colJ: r.J || null,
          })),
        },
        'נתונים חיצוניים',
      );

      for (const row of documentRows) {
        if (!looksLikeUuid(row.id)) continue;
        const patchBody: Record<string, unknown> = {
          description: (row.description || '').trim() || null,
          documentType: row.docType || 'OTHER',
          documentDate: row.dateStr ? isoNoon(row.dateStr) : null,
        };
        const fn = row.fileName?.trim();
        if (fn) patchBody.name = fn;
        const dr = await apiFetch(apiUrl(`/customers/${customer.id}/documents/${row.id}`), {
          method: 'PATCH',
          authUser: currentUser,
          body: JSON.stringify(patchBody),
        });
        if (!dr.ok) throw new Error(`מסמכים: ${await parseApiErrorResponse(dr)}`);
      }

      await onFullReload();
      setLegacyMsg('הלקוח נשמר בהצלחה');
      setMode('view');
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      setLegacyMsg(detail ? `לא ניתן היה לשמור: ${detail}` : 'לא ניתן היה לשמור. נסה שוב.');
    } finally {
      saveMainInFlightRef.current = false;
      setSavingCustomer(false);
    }
  };

  const resetContactEdit = () =>
    setContactEdit({
      id: '',
      fullName: '',
      department: '',
      roleTitle: '',
      mobile: '',
      phone: '',
      fax: '',
      email: '',
      isPrimary: false,
      isActive: true,
      notes: '',
    });

  const onSaveContact = async () => {
    if (!contactEdit) return;
    if (!isEdit) return;
    setContactBusy(true);
    setLegacyMsg('');
    try {
      const isNew = !contactEdit.id;
      const url = isNew
        ? apiUrl(`/customers/${customer.id}/contacts`)
        : apiUrl(`/customers/${customer.id}/contacts/${contactEdit.id}`);
      const method = isNew ? 'POST' : 'PATCH';
      const res = await apiFetch(url, {
        method,
        authUser: currentUser,
        body: JSON.stringify({
          fullName: contactEdit.fullName,
          department: contactEdit.department,
          roleTitle: contactEdit.roleTitle,
          mobile: contactEdit.mobile,
          phone: contactEdit.phone,
          fax: contactEdit.fax,
          email: contactEdit.email,
          isPrimary: Boolean(contactEdit.isPrimary),
          isActive: contactEdit.isActive !== false,
          notes: contactEdit.notes,
        }),
      });
      if (!res.ok) throw new Error(await parseApiErrorResponse(res));
      await onFullReload();
      setContactEdit(null);
      setLegacyMsg('איש קשר נשמר בהצלחה');
    } catch (e) {
      const d = e instanceof Error ? e.message : String(e);
      setLegacyMsg(d ? `שמירת איש קשר נכשלה: ${d}` : 'שמירת איש קשר נכשלה. נסה שוב.');
    } finally {
      setContactBusy(false);
    }
  };

  const onDeleteContact = async (contactId: string) => {
    if (!isEdit) return;
    if (!window.confirm('למחוק איש קשר?')) return;
    setContactBusy(true);
    setLegacyMsg('');
    try {
      const res = await apiFetch(apiUrl(`/customers/${customer.id}/contacts/${contactId}`), {
        method: 'DELETE',
        authUser: currentUser,
      });
      if (!res.ok) throw new Error(await parseApiErrorResponse(res));
      await onFullReload();
      setLegacyMsg('איש קשר נמחק');
    } catch (e) {
      const d = e instanceof Error ? e.message : String(e);
      setLegacyMsg(d ? `מחיקה נכשלה: ${d}` : 'מחיקה נכשלה. נסה שוב.');
    } finally {
      setContactBusy(false);
    }
  };

  const Field = ({
    label,
    children,
    connected,
  }: {
    label: string;
    children: React.ReactNode;
    connected?: boolean;
  }) => (
    <div className={connected ? briefBoxConnected : briefBoxClass}>
      <div className={labelClass}>
        <span className="block">{label}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-4" dir="rtl">
      <div className={cn(sectionShell, 'bg-slate-50/90 p-3')}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-blue-200/80 pb-2">
          <div className="text-sm font-bold text-slate-900">כרטיס לקוח — מבנה מערכת ישנה</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">#{customer.id.slice(0, 8)}</span>
            <div className="flex flex-row-reverse rounded border border-slate-300 bg-white text-xs shadow-sm">
              <button
                type="button"
                className={cn('px-3 py-1.5', mode === 'view' && 'bg-slate-700 text-white')}
                onClick={() => setMode('view')}
              >
                צפייה
              </button>
              <button
                type="button"
                className={cn('px-3 py-1.5', mode === 'edit' && 'bg-slate-700 text-white')}
                onClick={() => setMode('edit')}
              >
                עריכה
              </button>
            </div>
          </div>
        </div>

        {isEdit && (
          <div className="mb-3 rounded border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-blue-950">
            בעריכה: לחיצה על &quot;שמור כרטיס לקוח&quot; מעדכנת את הלקוח ואת כל הטאבים הטבלאיים.
          </div>
        )}

        {/* כללי */}
        <div className={cn(sectionShell, 'mb-3')}>
          <div className={sectionHeader}>כללי</div>
          <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <Field label="סוג לקוח" connected>
              {isEdit ? (
                sortedClassifications.length ? (
                  <select
                    className={inputConnected}
                    value={customerForm.type}
                    onChange={(e) =>
                      setCustomerForm((p) => ({ ...p, type: e.target.value, classificationCode: e.target.value }))
                    }
                  >
                    <option value="">—</option>
                    {sortedClassifications.map((cl) => (
                      <option key={cl.id} value={cl.code}>
                        {cl.labelHe} ({cl.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={inputConnected}
                    value={customerForm.type}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, type: e.target.value }))}
                  />
                )
              ) : (
                <div className={viewClass}>{customerForm.type || '—'}</div>
              )}
            </Field>
            <Field label="שם לקוח" connected>
              {isEdit ? (
                <input
                  className={cn(inputConnected, 'bg-amber-50/80')}
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))}
                />
              ) : (
                <div className={cn(viewClass, 'bg-amber-50/80')}>{customerForm.name || '—'}</div>
              )}
            </Field>
            <Field label="סיווג (תצוגה)">
              <div className={viewClass}>{resolveCustomerTypeLabel(customerForm.classificationCode || customer.type, typeLabelMap)}</div>
            </Field>
            <Field label="מס סיווג (מערכת ישנה)" connected>
              {isEdit ? (
                <input
                  className={inputClass}
                  value={customerForm.classificationNumber}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, classificationNumber: e.target.value }))}
                />
              ) : (
                <div className={viewClass}>{customerForm.classificationNumber || '—'}</div>
              )}
            </Field>
            <Field label="נציג מכירה" connected>
              {isEdit ? (
                <input
                  className={inputClass}
                  value={customerForm.salesRep}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, salesRep: e.target.value }))}
                />
              ) : (
                <div className={viewClass}>{customerForm.salesRep || '—'}</div>
              )}
            </Field>
            <Field label="פונקציונאלי" connected>
              {isEdit ? (
                <input
                  className={inputClass}
                  value={customerForm.functional}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, functional: e.target.value }))}
                />
              ) : (
                <div className={viewClass}>{customerForm.functional || '—'}</div>
              )}
            </Field>
            <Field label='מספר בהנה"ח' connected>
              {isEdit ? (
                <input
                  className={inputClass}
                  value={customerForm.accountNumber}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, accountNumber: e.target.value }))}
                />
              ) : (
                <div className={viewClass}>{customerForm.accountNumber || '—'}</div>
              )}
            </Field>
            <Field label="מספר ח.פ / רישום" connected>
              {isEdit ? (
                <input
                  className={inputConnected}
                  value={customerForm.companyRegNumber}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, companyRegNumber: e.target.value }))}
                />
              ) : (
                <div className={viewClass}>{customerForm.companyRegNumber || '—'}</div>
              )}
            </Field>
            <Field label="גודל לקוח" connected>
              {isEdit ? (
                <input
                  className={inputClass}
                  value={customerForm.customerSize}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, customerSize: e.target.value }))}
                />
              ) : (
                <div className={viewClass}>{customerForm.customerSize || '—'}</div>
              )}
            </Field>
            <Field label="פרופיל ניהול" connected>
              {isEdit ? (
                <input
                  className={inputClass}
                  value={customerForm.managementProfile}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, managementProfile: e.target.value }))}
                />
              ) : (
                <div className={viewClass}>{customerForm.managementProfile || '—'}</div>
              )}
            </Field>
            <Field label="שם איש קשר ראשי" connected>
              {isEdit ? (
                <input
                  className={inputConnected}
                  value={customerForm.contactName}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, contactName: e.target.value }))}
                />
              ) : (
                <div className={viewClass}>{customerForm.contactName || '—'}</div>
              )}
            </Field>
          </div>
        </div>

        {/* טלפונים | תקשורת | כתובת */}
        <div className="grid gap-3 lg:grid-cols-3">
          <div className={sectionShell}>
            <div className={sectionHeader}>טלפונים</div>
            <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2">
              <Field label="טלפון ראשי (סלולארי במערכת ישנה)" connected>
                {isEdit ? (
                  <input
                    className={cn(inputConnected, 'bg-amber-50/70')}
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                ) : (
                  <div className={cn(viewClass, 'bg-amber-50/70')}>{customerForm.phone || '—'}</div>
                )}
              </Field>
              <Field label="טלפון נוסף (בית)" connected>
                {isEdit ? (
                  <input
                    className={inputConnected}
                    value={customerForm.phone2}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, phone2: e.target.value }))}
                  />
                ) : (
                  <div className={viewClass}>{customerForm.phone2 || '—'}</div>
                )}
              </Field>
              <Field label="טלפון נוסף (עבודה)" connected>
                {isEdit ? (
                  <input
                    className={inputConnected}
                    value={customerForm.phone3}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, phone3: e.target.value }))}
                  />
                ) : (
                  <div className={viewClass}>{customerForm.phone3 || '—'}</div>
                )}
              </Field>
              <Field label="פקס" connected>
                {isEdit ? (
                  <input
                    className={inputConnected}
                    value={customerForm.fax}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, fax: e.target.value }))}
                  />
                ) : (
                  <div className={viewClass}>{customerForm.fax || '—'}</div>
                )}
              </Field>
            </div>
          </div>

          <div className={sectionShell}>
            <div className={sectionHeader}>תקשורת</div>
            <div className="grid gap-2 p-2">
              <Field label="תאריך עדכון (ייבוא)">
                <div className={viewClass}>{customerForm.topDate || '—'}</div>
              </Field>
              <Field label="דואר אלקטרוני" connected>
                {isEdit ? (
                  <input
                    className={inputConnected}
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))}
                  />
                ) : (
                  <div className={viewClass}>{customerForm.email || '—'}</div>
                )}
              </Field>
              <Field label="אתר אינטרנט" connected>
                {isEdit ? (
                  <input
                    className={inputConnected}
                    value={customerForm.website}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, website: e.target.value }))}
                  />
                ) : (
                  <div className={viewClass}>{customerForm.website || '—'}</div>
                )}
              </Field>
              <Field label="הערות כלליות" connected>
                {isEdit ? (
                  <textarea
                    className={cn(inputConnected, 'min-h-[3.5rem] resize-y')}
                    value={customerForm.notes}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                ) : (
                  <div className={cn(viewClass, 'min-h-[3.5rem] whitespace-pre-wrap')}>{customerForm.notes || '—'}</div>
                )}
              </Field>
            </div>
          </div>

          <div className={sectionShell}>
            <div className={sectionHeader}>כתובת</div>
            <div className="grid gap-2 p-2">
              <Field label="כתובת" connected>
                {isEdit ? (
                  <textarea
                    className={cn(inputConnected, 'min-h-[4rem] resize-y')}
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))}
                  />
                ) : (
                  <div className={cn(viewClass, 'min-h-[4rem] whitespace-pre-wrap')}>{customerForm.address || '—'}</div>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="עיר" connected>
                  {isEdit ? (
                    <input
                      className={inputConnected}
                      value={customerForm.city}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))}
                    />
                  ) : (
                    <div className={viewClass}>{customerForm.city || '—'}</div>
                  )}
                </Field>
                <Field label="מיקוד (ייבוא)" connected>
                  {isEdit ? (
                    <input
                      className={cn(inputConnected, 'bg-amber-50/50')}
                      value={customerForm.zipLegacy}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, zipLegacy: e.target.value }))}
                    />
                  ) : (
                    <div className={cn(viewClass, 'bg-amber-50/50')}>{customerForm.zipLegacy || '—'}</div>
                  )}
                </Field>
              </div>
              <Field label="קוד עיר (ייבוא)" connected>
                {isEdit ? (
                  <input
                    className={inputConnected}
                    value={customerForm.cityCodeLegacy}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, cityCodeLegacy: e.target.value }))}
                  />
                ) : (
                  <div className={viewClass}>{customerForm.cityCodeLegacy || '—'}</div>
                )}
              </Field>
              <Field label="מדינה / אזור" connected>
                {isEdit ? (
                  <input
                    className={inputClass}
                    value={customerForm.countryRegion}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, countryRegion: e.target.value }))}
                  />
                ) : (
                  <div className={viewClass}>{customerForm.countryRegion || '—'}</div>
                )}
              </Field>
            </div>
          </div>
        </div>

        <div className={cn(sectionShell, 'mt-3')}>
          <div className={sectionHeader}>הערות פנימיות</div>
          <div className="p-2">
            <Field label="הערות פנימיות" connected>
              {isEdit ? (
                <textarea
                  className={cn(inputConnected, 'min-h-[5rem] resize-y')}
                  value={customerForm.internalNotes}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, internalNotes: e.target.value }))}
                />
              ) : (
                <div className={cn(viewClass, 'min-h-[5rem] whitespace-pre-wrap')}>{customerForm.internalNotes || '—'}</div>
              )}
            </Field>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90',
              savingCustomer || !isEdit ? 'cursor-not-allowed opacity-60' : '',
            )}
            style={{ backgroundColor: primaryColor }}
            onClick={() => void onSaveCustomerMain()}
            disabled={savingCustomer || !isEdit}
          >
            שמור כרטיס לקוח
          </button>
          {!isEdit && (
            <span className="text-xs text-slate-500">מצב צפייה — עבור לעריכה כדי לשמור שינויים.</span>
          )}
          {legacyMsg && <div className="rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700">{legacyMsg}</div>}
        </div>
      </div>

      {/* טאבים תחתונים */}
      <div className={cn(sectionShell, 'p-0')}>
        <div className={sectionHeader}>אזור תחתון</div>
        <div className="flex flex-wrap justify-end gap-1 border-b border-slate-200 bg-slate-50/80 px-2 py-2">
          {LOWER_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={cn(
                'rounded border px-2.5 py-1.5 text-xs font-medium transition',
                activeLowerTab === t.key
                  ? 'border-blue-800 bg-blue-800 text-white shadow-sm'
                  : 'border-slate-300 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/80',
              )}
              onClick={() => setActiveLowerTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-2">

        {activeLowerTab === 'contacts' && (
          <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
            <div className="overflow-x-auto rounded border-2 border-slate-200 bg-white">
              <table className="w-full min-w-[52rem] border-collapse text-sm" dir="rtl">
                <thead className="border-b-2 border-blue-100 bg-blue-50/90">
                  <tr className="text-right text-xs font-semibold text-slate-700">
                    <th className="border-b border-slate-200 px-2 py-2.5">שם</th>
                    <th className="border-b border-slate-200 px-2 py-2.5">מחלקה</th>
                    <th className="border-b border-slate-200 px-2 py-2.5">תפקיד</th>
                    <th className="border-b border-slate-200 px-2 py-2.5">סלולארי</th>
                    <th className="border-b border-slate-200 px-2 py-2.5">טלפון</th>
                    <th className="border-b border-slate-200 px-2 py-2.5">פקס</th>
                    <th className="border-b border-slate-200 px-2 py-2.5" dir="ltr">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-6 text-center text-sm text-slate-500">
                        אין אנשי קשר ללקוח זה
                      </td>
                    </tr>
                  ) : (
                    contacts.map((c) => (
                      <tr
                        key={c.id}
                        className={cn(
                          'border-b border-slate-100 text-right hover:bg-slate-50/90',
                          isEdit && 'cursor-pointer',
                        )}
                        onClick={() => isEdit && setContactEdit(c)}
                      >
                        <td className="px-2 py-2">{c.fullName || '—'}</td>
                        <td className="px-2 py-2">{c.department || '—'}</td>
                        <td className="px-2 py-2">{c.roleTitle || '—'}</td>
                        <td className="px-2 py-2">{c.mobile || '—'}</td>
                        <td className="px-2 py-2">{c.phone || '—'}</td>
                        <td className="px-2 py-2">{c.fax || '—'}</td>
                        <td className="px-2 py-2 text-left" dir="ltr">
                          {c.email || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex min-w-[11rem] flex-col gap-2 rounded border border-slate-300 bg-slate-50 p-2">
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-40"
                disabled={!isEdit}
                onClick={resetContactEdit}
              >
                הוספה
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-40"
                disabled={!isEdit || !contactEdit || !contactEdit.id}
                onClick={() => contactEdit && setContactEdit(contactEdit)}
              >
                עריכה
              </button>
              <button
                type="button"
                className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-40"
                disabled={!isEdit || !contactEdit?.id || contactBusy}
                onClick={() => contactEdit?.id && onDeleteContact(contactEdit.id)}
              >
                מחיקה
              </button>
              <button
                type="button"
                className="rounded border border-slate-700 bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-40"
                disabled={!isEdit || !contactEdit || contactBusy}
                onClick={onSaveContact}
              >
                שמור איש קשר
              </button>
            </div>
            {contactEdit && isEdit && (
              <div className="rounded border border-slate-300 bg-white p-2 lg:col-span-2">
                <div className="mb-2 text-xs font-semibold text-slate-700">כרטיס איש קשר</div>
                <div className="grid gap-2 md:grid-cols-4">
                  <input
                    className={inputClass}
                    placeholder="שם"
                    value={contactEdit.fullName || ''}
                    onChange={(e) => setContactEdit((p) => (p ? { ...p, fullName: e.target.value } : p))}
                  />
                  <input
                    className={inputClass}
                    placeholder="מחלקה"
                    value={contactEdit.department || ''}
                    onChange={(e) => setContactEdit((p) => (p ? { ...p, department: e.target.value } : p))}
                  />
                  <input
                    className={inputClass}
                    placeholder="תפקיד"
                    value={contactEdit.roleTitle || ''}
                    onChange={(e) => setContactEdit((p) => (p ? { ...p, roleTitle: e.target.value } : p))}
                  />
                  <input
                    className={inputClass}
                    placeholder="סלולארי"
                    value={contactEdit.mobile || ''}
                    onChange={(e) => setContactEdit((p) => (p ? { ...p, mobile: e.target.value } : p))}
                  />
                  <input
                    className={inputClass}
                    placeholder="טלפון"
                    value={contactEdit.phone || ''}
                    onChange={(e) => setContactEdit((p) => (p ? { ...p, phone: e.target.value } : p))}
                  />
                  <input
                    className={inputClass}
                    placeholder="פקס"
                    value={contactEdit.fax || ''}
                    onChange={(e) => setContactEdit((p) => (p ? { ...p, fax: e.target.value } : p))}
                  />
                  <input
                    className={inputClass}
                    placeholder="Email"
                    value={contactEdit.email || ''}
                    onChange={(e) => setContactEdit((p) => (p ? { ...p, email: e.target.value } : p))}
                  />
                  <input
                    className={inputClass}
                    placeholder="הערות"
                    value={contactEdit.notes || ''}
                    onChange={(e) => setContactEdit((p) => (p ? { ...p, notes: e.target.value } : p))}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeLowerTab === 'finance' && (
          <div className="space-y-2" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white p-3 shadow-sm">
              <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-2 py-2 text-right text-[11px] font-semibold leading-snug text-amber-950">
                שדות נתונים כספיים: אין כרגע מיפוי ל־Prisma על מודל הלקוח (מלבד אפשרות עתידית לטעון אובייקט{' '}
                <span dir="ltr" className="font-mono text-[10px]">
                  financeTab
                </span>
                ). הערכים נשמרים רק במצב מקומי בדפדפן עד שיוגדר API — לא נשלחים ב־PATCH.
              </p>

              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
                {/* עמודה ימנית (כמו במסך הישן): סיכומים ואשראי */}
                <div className="w-full shrink-0 space-y-2 border-b border-slate-200 pb-4 xl:w-[min(100%,20rem)] xl:border-b-0 xl:border-l xl:border-slate-200 xl:pb-0 xl:pl-5">
                  {(
                    [
                      ['סה"כ קניות', 'totalPurchases'],
                      ['סה"כ מכירות', 'totalSales'],
                      ['אחוז', 'percent'],
                      ['תנאי תשלום', 'paymentTerms'],
                      ['ימי אשראי', 'creditDays'],
                    ] as const
                  ).map(([heLabel, key]) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="w-[7.25rem] shrink-0 text-right text-xs font-semibold text-slate-800">{heLabel}</label>
                      <input
                        type="text"
                        className={cn(isEdit ? inputClass : viewClass, 'flex-1')}
                        disabled={!isEdit}
                        value={financeForm[key]}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex w-[7.25rem] shrink-0 items-center justify-end gap-2 text-xs font-semibold text-slate-800">
                      <span>אשראי</span>
                    </label>
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        title="במסך הישן: רדיו — כאן תיבת סימון לאותו מצב פעיל/לא פעיל"
                        className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-500 accent-blue-700"
                        disabled={!isEdit}
                        checked={financeForm.creditOn}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, creditOn: e.target.checked }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-[7.25rem] shrink-0 text-right text-xs font-semibold text-slate-800">מספר אשראי</label>
                    <input
                      type="text"
                      className={cn(isEdit ? inputClass : viewClass, 'flex-1')}
                      disabled={!isEdit}
                      value={financeForm.creditNumber}
                      onChange={(e) => setFinanceForm((p) => ({ ...p, creditNumber: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-[7.25rem] shrink-0 text-right text-xs font-semibold text-slate-800">תוקף</label>
                    <input
                      type="text"
                      className={cn(isEdit ? inputClass : viewClass, 'flex-1')}
                      disabled={!isEdit}
                      value={financeForm.validity}
                      onChange={(e) => setFinanceForm((p) => ({ ...p, validity: e.target.value }))}
                    />
                  </div>
                </div>

                {/* מרכז + שמאל: מחירון… TOKEN + עמודת שדות ללא תווית */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <label className="w-[7.5rem] shrink-0 text-right text-xs font-semibold text-slate-800">מחירון</label>
                      <input
                        type="text"
                        className={cn(isEdit ? inputClass : viewClass, 'flex-1')}
                        disabled={!isEdit}
                        value={financeForm.priceList}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, priceList: e.target.value }))}
                      />
                    </div>
                    <div className="w-full shrink-0 sm:w-[4.85rem]" />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <label className="w-[7.5rem] shrink-0 text-right text-xs font-semibold text-slate-800">מעוגל</label>
                      <input
                        type="text"
                        className={cn(isEdit ? inputClass : viewClass, 'flex-1')}
                        disabled={!isEdit}
                        value={financeForm.rounded}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, rounded: e.target.value }))}
                      />
                    </div>
                    <div className="w-full shrink-0 sm:w-[4.85rem]" />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <label className="w-[7.5rem] shrink-0 text-right text-xs font-semibold text-slate-800">מספר עובדים</label>
                      <select
                        className={cn(isEdit ? inputClass : viewClass, 'flex-1')}
                        disabled={!isEdit}
                        value={financeForm.employeeCount}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, employeeCount: e.target.value }))}
                      >
                        <option value=""> </option>
                      </select>
                    </div>
                    <div className="w-full shrink-0 sm:w-[4.85rem] sm:pt-0">
                      <input
                        type="text"
                        title="שדה ללא תווית (מסך ישן)"
                        className={cn(isEdit ? inputClass : viewClass, 'w-full')}
                        disabled={!isEdit}
                        value={financeForm.unnamedAux1}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, unnamedAux1: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <label className="w-[7.5rem] shrink-0 text-right text-xs font-semibold text-slate-800">לקוח בהנהלה</label>
                      <input
                        type="text"
                        className={cn(isEdit ? inputClass : viewClass, 'flex-1')}
                        disabled={!isEdit}
                        value={financeForm.customerInManagement}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, customerInManagement: e.target.value }))}
                      />
                    </div>
                    <div className="w-full shrink-0 sm:w-[4.85rem]">
                      <input
                        type="text"
                        title="שדה ללא תווית (מסך ישן)"
                        className={cn(isEdit ? inputClass : viewClass, 'w-full')}
                        disabled={!isEdit}
                        value={financeForm.unnamedAux2}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, unnamedAux2: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <label className="w-[7.5rem] shrink-0 text-right text-xs font-semibold text-slate-800">מספר 1</label>
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <button
                          type="button"
                          title="חיפוש (לא מחובר)"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-100 text-sm disabled:opacity-50"
                          disabled={!isEdit}
                          tabIndex={-1}
                        >
                          🔍
                        </button>
                        <input
                          type="text"
                          className={cn(isEdit ? inputClass : viewClass, 'min-w-0 flex-1')}
                          disabled={!isEdit}
                          value={financeForm.number1}
                          onChange={(e) => setFinanceForm((p) => ({ ...p, number1: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="w-full shrink-0 sm:w-[4.85rem]">
                      <input
                        type="text"
                        title="שדה ללא תווית (מסך ישן)"
                        className={cn(isEdit ? inputClass : viewClass, 'w-full')}
                        disabled={!isEdit}
                        value={financeForm.unnamedAux3}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, unnamedAux3: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <label className="w-[7.5rem] shrink-0 text-right text-xs font-semibold text-slate-800 sm:pt-1">מספר 2</label>
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <button
                          type="button"
                          title="חיפוש (לא מחובר)"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-100 text-sm disabled:opacity-50"
                          disabled={!isEdit}
                          tabIndex={-1}
                        >
                          🔍
                        </button>
                        <input
                          type="text"
                          className={cn(isEdit ? inputClass : viewClass, 'w-14 shrink-0 sm:w-16')}
                          disabled={!isEdit}
                          value={financeForm.number2Small}
                          onChange={(e) => setFinanceForm((p) => ({ ...p, number2Small: e.target.value }))}
                        />
                        <input
                          type="text"
                          className={cn(isEdit ? inputClass : viewClass, 'min-w-0 flex-1')}
                          disabled={!isEdit}
                          value={financeForm.number2Large}
                          onChange={(e) => setFinanceForm((p) => ({ ...p, number2Large: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="w-full shrink-0 sm:w-[4.85rem]">
                      <input
                        type="text"
                        title="שדה ללא תווית (מסך ישן)"
                        className={cn(isEdit ? inputClass : viewClass, 'w-full')}
                        disabled={!isEdit}
                        value={financeForm.unnamedAux4}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, unnamedAux4: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <label className="w-[7.5rem] shrink-0 text-right text-xs font-semibold text-slate-800">מספר 3</label>
                      <input
                        type="text"
                        className={cn(isEdit ? inputClass : viewClass, 'flex-1')}
                        disabled={!isEdit}
                        value={financeForm.number3}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, number3: e.target.value }))}
                      />
                    </div>
                    <div className="hidden w-[4.85rem] shrink-0 sm:block" aria-hidden />
                  </div>

                  <div className="border-t border-slate-200 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-[7.5rem] shrink-0 text-right text-xs font-semibold text-slate-800">TOKEN</span>
                      <input
                        type="checkbox"
                        title="במסך הישן: רדיו — כאן תיבת סימון לאותו מצב פעיל/לא פעיל"
                        className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-500 accent-blue-700"
                        disabled={!isEdit}
                        checked={financeForm.tokenOn}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, tokenOn: e.target.checked }))}
                      />
                    </div>
                    <div className="mt-2 flex flex-col gap-2 sm:mr-[7.5rem]">
                      <input
                        type="text"
                        className={cn(isEdit ? inputClass : viewClass, 'w-full max-w-md')}
                        disabled={!isEdit}
                        value={financeForm.tokenText}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, tokenText: e.target.value }))}
                      />
                      <input
                        type="date"
                        className={cn(isEdit ? inputClass : viewClass, 'w-full max-w-[11rem]', 'text-right')}
                        dir="ltr"
                        disabled={!isEdit}
                        value={financeForm.tokenDate}
                        onChange={(e) => setFinanceForm((p) => ({ ...p, tokenDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLowerTab === 'source' && (
          <div className="space-y-2" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white shadow-sm">
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-600 bg-blue-50/90 px-2 py-1.5"
                dir="rtl"
              >
                <button
                  type="button"
                  title="הוספת שורה"
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded border border-green-700 bg-green-600 text-lg font-bold leading-none text-white shadow-sm transition hover:bg-green-700',
                    !isEdit && 'cursor-not-allowed opacity-40',
                  )}
                  disabled={!isEdit}
                  onClick={() => isEdit && setLeadSourceRows((rows) => [...rows, newLeadSourceRow()])}
                >
                  +
                </button>
                <p className="min-w-0 flex-1 text-right text-[11px] font-semibold leading-snug text-slate-700">
                  נטען מ־GET /customers/:id/full (referralSources). נשמר עם &quot;שמור כרטיס לקוח&quot; (PUT
                  /customers/:id/referral-sources).
                </p>
              </div>
              <div className="max-h-[min(22rem,55vh)] overflow-y-auto">
                <table className="w-full min-w-[16rem] border-collapse text-sm" dir="rtl">
                  <thead className="sticky top-0 z-[1] bg-blue-800 text-white">
                    <tr className="text-right text-xs font-semibold">
                      <th className="border-b border-blue-900 px-2 py-2.5 whitespace-nowrap">תאריך</th>
                      <th className="border-b border-blue-900 px-2 py-2.5">שם מקור הגעה</th>
                      {isEdit && (
                        <th className="w-10 border-b border-blue-900 px-1 py-2.5 text-center" aria-label="פעולות" />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {leadSourceRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isEdit ? 3 : 2}
                          className="px-2 py-8 text-center text-sm text-slate-500"
                        >
                          אין רשומות
                        </td>
                      </tr>
                    ) : (
                      leadSourceRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-200 text-right hover:bg-slate-50/80">
                          <td className="w-[7.5rem] min-w-[6.5rem] align-top px-2 py-1.5">
                            {isEdit ? (
                              <input
                                type="text"
                                className={inputClass}
                                value={row.date}
                                placeholder=""
                                onChange={(e) =>
                                  setLeadSourceRows((rows) =>
                                    rows.map((r) => (r.id === row.id ? { ...r, date: e.target.value } : r)),
                                  )
                                }
                              />
                            ) : (
                              <div className={viewClass}>{row.date || '—'}</div>
                            )}
                          </td>
                          <td className="min-w-0 align-top px-2 py-1.5">
                            {isEdit ? (
                              <input
                                type="text"
                                className={inputClass}
                                value={row.sourceName}
                                onChange={(e) =>
                                  setLeadSourceRows((rows) =>
                                    rows.map((r) => (r.id === row.id ? { ...r, sourceName: e.target.value } : r)),
                                  )
                                }
                              />
                            ) : (
                              <div className={viewClass}>{row.sourceName || '—'}</div>
                            )}
                          </td>
                          {isEdit && (
                            <td className="w-10 align-top px-1 py-1.5 text-center">
                              <button
                                type="button"
                                className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                                title="הסר שורה"
                                onClick={() =>
                                  setLeadSourceRows((rows) => rows.filter((r) => r.id !== row.id))
                                }
                              >
                                ×
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeLowerTab === 'questionnaires' && (
          <div className="space-y-2" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white shadow-sm">
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-600 bg-blue-50/90 px-2 py-1.5"
                dir="rtl"
              >
                <button
                  type="button"
                  title="הוספת שורה"
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded border border-green-700 bg-green-600 text-lg font-bold leading-none text-white shadow-sm transition hover:bg-green-700',
                    !isEdit && 'cursor-not-allowed opacity-40',
                  )}
                  disabled={!isEdit}
                  onClick={() => isEdit && setQuestionnaireRows((rows) => [...rows, newQuestionnaireRow()])}
                >
                  +
                </button>
                <p className="min-w-0 flex-1 text-right text-[11px] font-semibold leading-snug text-slate-700">
                  נטען מ־GET /customers/:id/full (questionnaires). נשמר עם &quot;שמור כרטיס לקוח&quot; (PUT
                  /customers/:id/questionnaires).
                </p>
              </div>
              <div className="max-h-[min(22rem,55vh)] overflow-y-auto">
                <table className="w-full min-w-[16rem] border-collapse text-sm" dir="rtl">
                  <thead className="sticky top-0 z-[1] bg-blue-800 text-white">
                    <tr className="text-right text-xs font-semibold">
                      <th className="border-b border-blue-900 px-2 py-2.5 whitespace-nowrap">קוד שאלון</th>
                      <th className="border-b border-blue-900 px-2 py-2.5">שם שאלון</th>
                      {isEdit && (
                        <th className="w-10 border-b border-blue-900 px-1 py-2.5 text-center" aria-label="פעולות" />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {questionnaireRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isEdit ? 3 : 2}
                          className="px-2 py-8 text-center text-sm text-slate-500"
                        >
                          אין רשומות
                        </td>
                      </tr>
                    ) : (
                      questionnaireRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-200 text-right hover:bg-slate-50/80">
                          <td className="min-w-[6rem] align-top px-2 py-1.5">
                            {isEdit ? (
                              <input
                                type="text"
                                className={inputClass}
                                value={row.code}
                                onChange={(e) =>
                                  setQuestionnaireRows((rows) =>
                                    rows.map((r) => (r.id === row.id ? { ...r, code: e.target.value } : r)),
                                  )
                                }
                              />
                            ) : (
                              <div className={viewClass}>{row.code || '—'}</div>
                            )}
                          </td>
                          <td className="min-w-0 align-top px-2 py-1.5">
                            {isEdit ? (
                              <input
                                type="text"
                                className={inputClass}
                                value={row.name}
                                onChange={(e) =>
                                  setQuestionnaireRows((rows) =>
                                    rows.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)),
                                  )
                                }
                              />
                            ) : (
                              <div className={viewClass}>{row.name || '—'}</div>
                            )}
                          </td>
                          {isEdit && (
                            <td className="w-10 align-top px-1 py-1.5 text-center">
                              <button
                                type="button"
                                className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                                title="הסר שורה"
                                onClick={() =>
                                  setQuestionnaireRows((rows) => rows.filter((r) => r.id !== row.id))
                                }
                              >
                                ×
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeLowerTab === 'copy' && (
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            אין פעולות העתקה זמינות במסך זה.
          </div>
        )}

        {activeLowerTab === 'mailing' && (
          <div className="space-y-3" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white p-3 shadow-sm">
              <div className={sectionHeader}>פרטי דיוור</div>

              <p className="mb-3 mt-2 rounded border border-blue-200 bg-blue-50/80 px-2 py-2 text-right text-[11px] text-slate-800">
                הנתונים נשמרים עם &quot;שמור כרטיס לקוח&quot;.
              </p>

              <div className="space-y-3 border-t border-blue-100 pt-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <label className="w-full shrink-0 text-right text-xs font-semibold text-slate-800 sm:w-[9rem]">שדה שגוי</label>
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      type="text"
                      className={cn(isEdit ? inputClass : viewClass, 'w-full')}
                      disabled={!isEdit}
                      value={mailingExtras.wrongField}
                      onChange={(e) => setMailingExtras((p) => ({ ...p, wrongField: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                  <label className="w-full shrink-0 pt-1.5 text-right text-xs font-semibold text-slate-800 sm:w-[9rem]">כתובת</label>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {isEdit ? (
                      <textarea
                        className={cn(inputConnected, 'min-h-[4.5rem] w-full resize-y')}
                        value={customerForm.address}
                        onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))}
                      />
                    ) : (
                      <div className={cn(viewClass, 'min-h-[4.5rem] whitespace-pre-wrap')}>{customerForm.address || '—'}</div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <label className="w-full shrink-0 text-right text-xs font-semibold text-slate-800 sm:w-[9rem]">עיר</label>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {isEdit ? (
                        <input
                          type="text"
                          className={inputConnected}
                          value={customerForm.city}
                          onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))}
                        />
                      ) : (
                        <div className={viewClass}>{customerForm.city || '—'}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <label className="w-full shrink-0 text-right text-xs font-semibold text-slate-800 sm:w-[9rem]">מיקוד</label>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {isEdit ? (
                        <input
                          type="text"
                          className={inputConnected}
                          value={customerForm.zipLegacy}
                          onChange={(e) => setCustomerForm((p) => ({ ...p, zipLegacy: e.target.value }))}
                        />
                      ) : (
                        <div className={viewClass}>{customerForm.zipLegacy || '—'}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <label className="w-full shrink-0 text-right text-xs font-semibold text-slate-800 sm:w-[9rem]">תא דואר</label>
                  <div className="min-w-0 flex-1 space-y-1">
                    {isEdit ? (
                      <input
                        type="text"
                        className={inputClass}
                        value={mailingExtras.poBox}
                        onChange={(e) => setMailingExtras((p) => ({ ...p, poBox: e.target.value }))}
                      />
                    ) : (
                      <div className={viewClass}>{mailingExtras.poBox || '—'}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-blue-100 pt-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {(
                    [
                      ['דיוור', 'prefMailing'],
                      ['פקסים', 'prefFax'],
                      ['דוא"ל', 'prefEmail'],
                      ['SMS', 'prefSms'],
                    ] as const
                  ).map(([label, key]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 text-right text-sm font-medium text-slate-800"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-slate-400 accent-blue-700"
                        disabled={!isEdit}
                        checked={mailingExtras[key]}
                        onChange={(e) => setMailingExtras((p) => ({ ...p, [key]: e.target.checked }))}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-blue-100 pt-4">
                <label className="mb-1 block text-right text-xs font-semibold text-slate-800">
                  הערה / טקסט חופשי
                </label>
                {isEdit ? (
                  <textarea
                    className={cn(inputClass, 'min-h-[6rem] w-full resize-y')}
                    value={mailingExtras.mailingNote}
                    onChange={(e) => setMailingExtras((p) => ({ ...p, mailingNote: e.target.value }))}
                  />
                ) : (
                  <div className={cn(viewClass, 'min-h-[6rem] whitespace-pre-wrap')}>{mailingExtras.mailingNote || '—'}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeLowerTab === 'notes' && (
          <div className="space-y-3" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white p-3 shadow-sm">
              <div className={sectionHeader}>הערות</div>

              <p className="mb-3 mt-2 rounded border border-blue-200 bg-blue-50/80 px-2 py-2 text-right text-[11px] text-slate-800">
                התוכן נשמר עם &quot;שמור כרטיס לקוח&quot;.
              </p>

              <div className="space-y-4 border-t border-blue-100 pt-3">
                <div>
                  <label className="mb-1 block text-right text-xs font-semibold text-slate-800">תאריך רישום</label>
                  {isEdit ? (
                    <input
                      type="date"
                      className={cn(inputClass, 'max-w-[11rem]')}
                      dir="ltr"
                      value={notesTabExtras.registrationDate}
                      onChange={(e) => setNotesTabExtras((p) => ({ ...p, registrationDate: e.target.value }))}
                    />
                  ) : (
                    <div className={cn(viewClass, 'max-w-[11rem]')} dir="ltr">
                      {notesTabExtras.registrationDate || '—'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-right text-xs font-semibold text-slate-800">
                    הערה ראשית / טקסט חופשי גדול
                  </label>
                  {isEdit ? (
                    <textarea
                      className={cn(inputConnected, 'min-h-[8rem] w-full resize-y')}
                      value={customerForm.notes}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                  ) : (
                    <div className={cn(viewClass, 'min-h-[8rem] whitespace-pre-wrap')}>{customerForm.notes || '—'}</div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-right text-xs font-semibold text-slate-800">עדכון אחרון</label>
                  {isEdit ? (
                    <input
                      type="date"
                      className={cn(inputClass, 'max-w-[11rem]')}
                      dir="ltr"
                      value={notesTabExtras.lastUpdateDate}
                      onChange={(e) => setNotesTabExtras((p) => ({ ...p, lastUpdateDate: e.target.value }))}
                    />
                  ) : (
                    <div className={cn(viewClass, 'max-w-[11rem]')} dir="ltr">
                      {notesTabExtras.lastUpdateDate || '—'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-right text-xs font-semibold text-slate-800">
                    הערת עדכון אחרון / טקסט חופשי גדול
                  </label>
                  {isEdit ? (
                    <textarea
                      className={cn(inputConnected, 'min-h-[8rem] w-full resize-y')}
                      value={customerForm.internalNotes}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, internalNotes: e.target.value }))}
                    />
                  ) : (
                    <div className={cn(viewClass, 'min-h-[8rem] whitespace-pre-wrap')}>
                      {customerForm.internalNotes || '—'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-right text-xs font-semibold text-slate-800">משתמש אחרון</label>
                  {isEdit ? (
                    <input
                      type="text"
                      className={inputClass}
                      value={notesTabExtras.lastUser}
                      onChange={(e) => setNotesTabExtras((p) => ({ ...p, lastUser: e.target.value }))}
                    />
                  ) : (
                    <div className={viewClass}>{notesTabExtras.lastUser || '—'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLowerTab === 'relations' && (
          <div className="space-y-2" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white p-2 shadow-sm">
              <p className="mb-2 rounded border border-blue-200 bg-blue-50/80 px-2 py-2 text-right text-[11px] text-slate-800">
                נשמר עם &quot;שמור כרטיס לקוח&quot;. ניתן להזין שם לקוח וסוג קשר ידנית.
              </p>

              <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                <div className="overflow-x-auto rounded border-2 border-slate-200 bg-white">
                  <table className="w-full min-w-[20rem] border-collapse text-sm" dir="rtl">
                    <thead className="border-b-2 border-blue-800 bg-blue-800 text-white">
                      <tr className="text-right text-xs font-semibold">
                        <th className="border-b border-blue-900 px-2 py-2.5">שם לקוח</th>
                        <th className="border-b border-blue-900 px-2 py-2.5">סוג קשר</th>
                        {isEdit && (
                          <th className="w-10 border-b border-blue-900 px-1 py-2.5 text-center" aria-label="הסר שורה" />
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {relationRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isEdit ? 3 : 2}
                            className="px-2 py-8 text-center text-sm text-slate-500"
                          >
                            אין רשומות
                          </td>
                        </tr>
                      ) : (
                        relationRows.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100 text-right hover:bg-slate-50/90">
                            <td className="min-w-[10rem] px-2 py-1.5">
                              {isEdit ? (
                                <input
                                  type="text"
                                  className={inputClass}
                                  value={row.customerName}
                                  onChange={(e) =>
                                    setRelationRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, customerName: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={viewClass}>{row.customerName || '—'}</div>
                              )}
                            </td>
                            <td className="min-w-[8rem] px-2 py-1.5">
                              {isEdit ? (
                                <input
                                  type="text"
                                  className={inputClass}
                                  value={row.relationType}
                                  onChange={(e) =>
                                    setRelationRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, relationType: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={viewClass}>{row.relationType || '—'}</div>
                              )}
                            </td>
                            {isEdit && (
                              <td className="w-10 px-1 py-1.5 text-center align-middle">
                                <button
                                  type="button"
                                  className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                                  title="הסר שורה"
                                  onClick={() => setRelationRows((rows) => rows.filter((r) => r.id !== row.id))}
                                >
                                  ×
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex min-w-[3.25rem] flex-col gap-2 rounded border border-slate-300 bg-slate-50 p-2 lg:min-w-[3.5rem]">
                  <button
                    type="button"
                    title="הוספת שורה"
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center self-center rounded border border-green-700 bg-green-600 text-lg font-bold leading-none text-white shadow-sm transition hover:bg-green-700',
                      !isEdit && 'cursor-not-allowed opacity-40',
                    )}
                    disabled={!isEdit}
                    onClick={() => isEdit && setRelationRows((rows) => [...rows, newRelationRow()])}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLowerTab === 'documents' && (
          <div className="space-y-2" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white p-2 shadow-sm">
              <p className="mb-2 rounded border border-blue-200 bg-blue-50/80 px-2 py-2 text-right text-[11px] text-slate-800">
                מסמכים קיימים (מזהה UUID) מתעדכנים בשמירת הכרטיס. להעלאת קובץ חדש יש להשתמש בזרימת העלאה בשרת.
              </p>

              <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                <div className="overflow-x-auto rounded border-2 border-slate-200 bg-white">
                  <table className="w-full min-w-[48rem] border-collapse text-sm" dir="rtl">
                    <thead className="border-b-2 border-blue-800 bg-blue-800 text-white">
                      <tr className="text-right text-xs font-semibold">
                        <th className="border-b border-blue-900 px-2 py-2.5">שם קובץ</th>
                        <th className="border-b border-blue-900 px-2 py-2.5 whitespace-nowrap">משתמש</th>
                        <th className="border-b border-blue-900 px-2 py-2.5 whitespace-nowrap">תאריך</th>
                        <th className="border-b border-blue-900 px-2 py-2.5">סוג מסמך</th>
                        <th className="min-w-[12rem] border-b border-blue-900 px-2 py-2.5">תיאור המסמך</th>
                        {isEdit && (
                          <th className="w-10 border-b border-blue-900 px-1 py-2.5 text-center" aria-label="הסר" />
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {documentRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isEdit ? 6 : 5}
                            className="px-2 py-8 text-center text-sm text-slate-500"
                          >
                            אין מסמכים
                          </td>
                        </tr>
                      ) : (
                        documentRows.map((row) => (
                          <tr
                            key={row.id}
                            className={cn(
                              'border-b border-slate-100 text-right hover:bg-slate-50/90',
                              isEdit && 'cursor-pointer',
                              selectedDocumentId === row.id && isEdit && 'bg-blue-50/60',
                            )}
                            onClick={() => isEdit && setSelectedDocumentId(row.id)}
                          >
                            <td className="max-w-[14rem] px-2 py-1.5 align-top">
                              <div className="space-y-1">
                                {isEdit ? (
                                  <input
                                    type="text"
                                    className={inputClass}
                                    value={row.fileName}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      setDocumentRows((rows) =>
                                        rows.map((r) => (r.id === row.id ? { ...r, fileName: e.target.value } : r)),
                                      )
                                    }
                                  />
                                ) : (
                                  <div className={viewClass}>{row.fileName || '—'}</div>
                                )}
                                {isEdit && (
                                  <>
                                    <label className="block text-[10px] text-slate-600">
                                      בחירת קובץ מקומית מעדכנת את שם הקובץ לשמירה (מטא־דאטה בלבד).
                                    </label>
                                    <input
                                      type="file"
                                      className="w-full max-w-full text-xs file:mr-2 file:rounded file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1"
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (!f) return;
                                        setDocumentRows((rows) =>
                                          rows.map((r) =>
                                            r.id === row.id ? { ...r, fileName: f.name || r.fileName } : r,
                                          ),
                                        );
                                      }}
                                    />
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="w-[7rem] px-2 py-1.5 align-top">
                              <div className={viewClass}>{row.userName || '—'}</div>
                            </td>
                            <td className="w-[7.5rem] px-2 py-1.5 align-top">
                              {isEdit ? (
                                <input
                                  type="date"
                                  className={cn(inputClass, 'text-right')}
                                  dir="ltr"
                                  value={row.dateStr}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    setDocumentRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, dateStr: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={cn(viewClass, 'whitespace-nowrap')} dir="ltr">
                                  {row.dateStr
                                    ? formatLegacyDate(
                                        row.dateStr.includes('T') ? row.dateStr : `${row.dateStr}T12:00:00`,
                                      )
                                    : '—'}
                                </div>
                              )}
                            </td>
                            <td className="w-[8rem] px-2 py-1.5 align-top">
                              {isEdit ? (
                                <input
                                  type="text"
                                  className={inputClass}
                                  value={row.docType}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    setDocumentRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, docType: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={viewClass}>{row.docType || '—'}</div>
                              )}
                            </td>
                            <td className="min-w-[10rem] px-2 py-1.5 align-top">
                              {isEdit ? (
                                <textarea
                                  className={cn(inputClass, 'min-h-[3.5rem] resize-y')}
                                  value={row.description}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    setDocumentRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, description: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={cn(viewClass, 'min-h-[3rem] whitespace-pre-wrap')}>
                                  {row.description || '—'}
                                </div>
                              )}
                            </td>
                            {isEdit && (
                              <td className="w-10 px-1 py-1.5 text-center align-top">
                                <button
                                  type="button"
                                  className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                                  title="הסר שורה"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDocumentRows((rows) => rows.filter((r) => r.id !== row.id));
                                    setSelectedDocumentId((id) => (id === row.id ? null : id));
                                  }}
                                >
                                  ×
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex min-w-[11rem] flex-col gap-2 rounded border border-slate-300 bg-slate-50 p-2">
                  <button
                    type="button"
                    title="הוספת מסמך"
                    className={cn(
                      'mx-auto flex h-9 w-9 items-center justify-center rounded border border-green-700 bg-green-600 text-lg font-bold leading-none text-white shadow-sm transition hover:bg-green-700',
                      !isEdit && 'cursor-not-allowed opacity-40',
                    )}
                    disabled={!isEdit}
                    onClick={() => {
                      const n = newDocumentTabRow();
                      setDocumentRows((rows) => [...rows, n]);
                      setSelectedDocumentId(n.id);
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-40"
                    disabled={
                      !isEdit ||
                      !selectedDocumentId ||
                      !documentRows.find((r) => r.id === selectedDocumentId)?.filePath
                    }
                    onClick={() => {
                      const row = documentRows.find((r) => r.id === selectedDocumentId);
                      const p = row?.filePath?.trim();
                      if (!p) return;
                      if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/')) {
                        window.open(p, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    פתיחה
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLowerTab === 'additionalData' && (
          <div className="space-y-2" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white p-2 shadow-sm">
              <p className="mb-2 rounded border border-blue-200 bg-blue-50/80 px-2 py-2 text-right text-[11px] font-semibold leading-snug text-slate-800">
                נטען מ־<span dir="ltr" className="font-mono text-[10px]">full.additionalDataRows</span> (או גיבוי
                additionalData). נשמר עם &quot;שמור כרטיס לקוח&quot; (PUT /customers/:id/additional-data-rows).
              </p>

              <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                <div className="overflow-x-auto rounded border-2 border-slate-200 bg-white">
                  <table className="w-full min-w-[40rem] border-collapse text-sm" dir="rtl">
                    <thead className="border-b-2 border-blue-800 bg-blue-800 text-white">
                      <tr className="text-right text-xs font-semibold">
                        <th className="border-b border-blue-900 px-2 py-2.5 whitespace-nowrap">מספר</th>
                        <th className="w-[4rem] border-b border-blue-900 px-2 py-2.5 text-center" dir="ltr">
                          D
                        </th>
                        <th className="border-b border-blue-900 px-2 py-2.5 whitespace-nowrap">תאריך</th>
                        <th className="min-w-[8rem] border-b border-blue-900 px-2 py-2.5">טקסט 2</th>
                        <th className="min-w-[8rem] border-b border-blue-900 px-2 py-2.5">טקסט 1</th>
                        {isEdit && (
                          <th className="w-10 border-b border-blue-900 px-1 py-2.5 text-center" aria-label="הסר" />
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {additionalDataRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isEdit ? 6 : 5}
                            className="px-2 py-8 text-center text-sm text-slate-500"
                          >
                            אין רשומות
                          </td>
                        </tr>
                      ) : (
                        additionalDataRows.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100 text-right hover:bg-slate-50/90">
                            <td className="w-[6rem] px-2 py-1.5 align-top">
                              {isEdit ? (
                                <input
                                  type="text"
                                  className={inputClass}
                                  value={row.number}
                                  onChange={(e) =>
                                    setAdditionalDataRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, number: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={viewClass}>{row.number || '—'}</div>
                              )}
                            </td>
                            <td className="px-2 py-1.5 align-top" dir="ltr">
                              {isEdit ? (
                                <input
                                  type="text"
                                  className={cn(inputClass, 'text-center')}
                                  value={row.d}
                                  onChange={(e) =>
                                    setAdditionalDataRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, d: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={cn(viewClass, 'text-center')}>{row.d || '—'}</div>
                              )}
                            </td>
                            <td className="w-[7.5rem] px-2 py-1.5 align-top">
                              {isEdit ? (
                                <input
                                  type="date"
                                  className={cn(inputClass, 'text-right')}
                                  dir="ltr"
                                  value={row.dateStr}
                                  onChange={(e) =>
                                    setAdditionalDataRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, dateStr: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={cn(viewClass, 'whitespace-nowrap')} dir="ltr">
                                  {row.dateStr
                                    ? formatLegacyDate(
                                        row.dateStr.includes('T') ? row.dateStr : `${row.dateStr}T12:00:00`,
                                      )
                                    : '—'}
                                </div>
                              )}
                            </td>
                            <td className="min-w-[8rem] px-2 py-1.5 align-top">
                              {isEdit ? (
                                <input
                                  type="text"
                                  className={inputClass}
                                  value={row.text2}
                                  onChange={(e) =>
                                    setAdditionalDataRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, text2: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={viewClass}>{row.text2 || '—'}</div>
                              )}
                            </td>
                            <td className="min-w-[8rem] px-2 py-1.5 align-top">
                              {isEdit ? (
                                <input
                                  type="text"
                                  className={inputClass}
                                  value={row.text1}
                                  onChange={(e) =>
                                    setAdditionalDataRows((rows) =>
                                      rows.map((r) => (r.id === row.id ? { ...r, text1: e.target.value } : r)),
                                    )
                                  }
                                />
                              ) : (
                                <div className={viewClass}>{row.text1 || '—'}</div>
                              )}
                            </td>
                            {isEdit && (
                              <td className="w-10 px-1 py-1.5 text-center align-top">
                                <button
                                  type="button"
                                  className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                                  title="הסר שורה"
                                  onClick={() =>
                                    setAdditionalDataRows((rows) => rows.filter((r) => r.id !== row.id))
                                  }
                                >
                                  ×
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex min-w-[3.25rem] flex-col gap-2 rounded border border-slate-300 bg-slate-50 p-2 lg:min-w-[3.5rem]">
                  <button
                    type="button"
                    title="הוספת שורה"
                    className={cn(
                      'mx-auto flex h-9 w-9 items-center justify-center rounded border border-green-700 bg-green-600 text-lg font-bold leading-none text-white shadow-sm transition hover:bg-green-700',
                      !isEdit && 'cursor-not-allowed opacity-40',
                    )}
                    disabled={!isEdit}
                    onClick={() => isEdit && setAdditionalDataRows((rows) => [...rows, newAdditionalDataRow()])}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLowerTab === 'moreDetails' && (
          <div className="space-y-2" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white p-3 shadow-sm">
              <div className={sectionHeader}>פרטים נוספים</div>
              <p className="mb-3 mt-2 rounded border border-blue-200 bg-blue-50/80 px-2 py-2 text-right text-[11px] text-slate-800">
                השדות נשמרים עם כפתור &quot;שמור כרטיס לקוח&quot;.
              </p>

              <div className="grid grid-cols-1 gap-x-10 gap-y-3 lg:grid-cols-2">
                <div className="space-y-3 border-b border-slate-200 pb-4 lg:border-b-0 lg:border-l lg:border-slate-200 lg:pb-0 lg:pl-6">
                  {MORE_DETAILS_RIGHT_FIELDS.map((f) => (
                    <div key={f.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <label className="w-full shrink-0 text-right text-xs font-semibold text-slate-800 sm:w-[8.5rem]">
                        {f.label}
                      </label>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        {isEdit ? (
                            f.kind === 'date' ? (
                            <input
                              type="date"
                              className={cn(inputConnected, 'text-right')}
                              dir="ltr"
                              value={moreDetailsForm[f.key]}
                              onChange={(e) =>
                                setMoreDetailsForm((p) => ({ ...p, [f.key]: e.target.value }))
                              }
                            />
                          ) : (
                            <input
                              type="text"
                              className={inputConnected}
                              value={moreDetailsForm[f.key]}
                              onChange={(e) =>
                                setMoreDetailsForm((p) => ({ ...p, [f.key]: e.target.value }))
                              }
                            />
                          )
                        ) : f.kind === 'date' ? (
                          <div className={cn(viewClass, 'whitespace-nowrap')} dir="ltr">
                            {moreDetailsForm[f.key]
                              ? formatLegacyDate(
                                  moreDetailsForm[f.key].includes('T')
                                    ? moreDetailsForm[f.key]
                                    : `${moreDetailsForm[f.key]}T12:00:00`,
                                )
                              : '—'}
                          </div>
                        ) : (
                          <div className={viewClass}>{moreDetailsForm[f.key] || '—'}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {MORE_DETAILS_LEFT_FIELDS.map((f) => (
                    <div key={f.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <label className="w-full shrink-0 text-right text-xs font-semibold text-slate-800 sm:w-[8.5rem]">
                        {f.label}
                      </label>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        {isEdit ? (
                          f.kind === 'date' ? (
                            <input
                              type="date"
                              className={cn(inputConnected, 'text-right')}
                              dir="ltr"
                              value={moreDetailsForm[f.key]}
                              onChange={(e) =>
                                setMoreDetailsForm((p) => ({ ...p, [f.key]: e.target.value }))
                              }
                            />
                          ) : (
                            <input
                              type="text"
                              className={inputConnected}
                              value={moreDetailsForm[f.key]}
                              onChange={(e) =>
                                setMoreDetailsForm((p) => ({ ...p, [f.key]: e.target.value }))
                              }
                            />
                          )
                        ) : f.kind === 'date' ? (
                          <div className={cn(viewClass, 'whitespace-nowrap')} dir="ltr">
                            {moreDetailsForm[f.key]
                              ? formatLegacyDate(
                                  moreDetailsForm[f.key].includes('T')
                                    ? moreDetailsForm[f.key]
                                    : `${moreDetailsForm[f.key]}T12:00:00`,
                                )
                              : '—'}
                          </div>
                        ) : (
                          <div className={viewClass}>{moreDetailsForm[f.key] || '—'}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLowerTab === 'externalData' && (
          <div className="space-y-2" dir="rtl">
            <div className="rounded-lg border-2 border-blue-700 bg-white p-2 shadow-sm">
              <div className={sectionHeader}>נתונים חיצוניים</div>
              <p className="mb-2 mt-2 rounded border border-blue-200 bg-blue-50/80 px-2 py-2 text-right text-[11px] font-semibold leading-snug text-slate-800">
                נטען מ־<span dir="ltr" className="font-mono text-[10px]">full.externalDataRows</span> (או גיבוי
                externalData). נשמר עם &quot;שמור כרטיס לקוח&quot; (PUT /customers/:id/external-data-rows).
              </p>
              {customer.importLegacyId ? (
                <p className="mb-2 text-right text-[10px] text-slate-600" dir="ltr">
                  importLegacyId: {customer.importLegacyId}
                </p>
              ) : null}

              <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                <div className="w-full min-w-0 overflow-x-auto rounded border-2 border-slate-200 bg-white">
                  <table className="w-full min-w-[56rem] table-fixed border-collapse text-sm" dir="rtl">
                    <thead className="border-b-2 border-blue-800 bg-blue-800 text-white">
                      <tr className="text-xs font-semibold">
                        {EXTERNAL_DATA_COLUMN_KEYS.map((col) => (
                          <th
                            key={col}
                            className="w-[9%] border-b border-blue-900 px-1 py-2 text-center"
                            dir="ltr"
                          >
                            {col}
                          </th>
                        ))}
                        {isEdit && (
                          <th className="w-10 border-b border-blue-900 px-1 py-2 text-center" aria-label="הסר" />
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {externalDataRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isEdit ? 11 : 10}
                            className="px-2 py-8 text-center text-sm text-slate-500"
                          >
                            אין שורות — לחץ + להוספה (מצב עריכה)
                          </td>
                        </tr>
                      ) : (
                        externalDataRows.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                            {EXTERNAL_DATA_COLUMN_KEYS.map((col) => (
                              <td key={col} className="px-1 py-1 align-top">
                                {isEdit ? (
                                  <input
                                    type="text"
                                    className={cn(inputClass, 'w-full min-w-0 px-1.5 py-1 text-xs')}
                                    value={row[col]}
                                    onChange={(e) =>
                                      setExternalDataRows((rows) =>
                                        rows.map((r) =>
                                          r.id === row.id ? { ...r, [col]: e.target.value } : r,
                                        ),
                                      )
                                    }
                                  />
                                ) : (
                                  <div className={cn(viewClass, 'min-h-[1.85rem] truncate px-1.5 py-1 text-xs')}>
                                    {row[col] || ' '}
                                  </div>
                                )}
                              </td>
                            ))}
                            {isEdit && (
                              <td className="w-10 px-1 py-1 text-center align-top">
                                <button
                                  type="button"
                                  className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                                  title="הסר שורה"
                                  onClick={() =>
                                    setExternalDataRows((rows) => rows.filter((r) => r.id !== row.id))
                                  }
                                >
                                  ×
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex min-w-[3.25rem] flex-col gap-2 rounded border border-slate-300 bg-slate-50 p-2 lg:min-w-[3.5rem]">
                  <button
                    type="button"
                    title="הוספת שורה"
                    className={cn(
                      'mx-auto flex h-9 w-9 items-center justify-center rounded border border-green-700 bg-green-600 text-lg font-bold leading-none text-white shadow-sm transition hover:bg-green-700',
                      !isEdit && 'cursor-not-allowed opacity-40',
                    )}
                    disabled={!isEdit}
                    onClick={() => isEdit && setExternalDataRows((rows) => [...rows, newExternalDataRow()])}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
