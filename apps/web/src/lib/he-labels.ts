export type HeTranslateMap = Record<string, string>;

// Central dictionary for translating UI-visible English tokens to Hebrew.
// Note: this file is only for display/UX (no backend enums or API contracts).
export const HE_LABELS: HeTranslateMap = {
  // Roles
  ADMIN: 'מנהל מערכת',
  MANAGER: 'מנהל',
  SALES: 'מכירות',
  TECHNICIAN: 'טכנאי',
  EXPERT: 'מומחה',
  BILLING: 'גבייה',

  // Common employee statuses
  ACTIVE: 'פעיל',
  INACTIVE: 'לא פעיל',

  // Lead statuses / pipeline stages (commonly rendered as raw enum strings in selects/badges)
  NEW: 'חדש',
  CONTACTED: 'נוצר קשר',
  FU_1: 'פולואפ 1',
  FU_2: 'פולואפ 2',
  QUOTE_SENT: 'הצעה נשלחה',
  NEGOTIATION: 'משא ומתן',
  WON: 'זכה',
  LOST: 'אבוד',
  NOT_RELEVANT: 'לא רלוונטי',

  // Quote statuses
  DRAFT: 'טיוטה',
  SENT: 'נשלחה',
  APPROVED: 'אושרה',
  REJECTED: 'נדחתה',
  EXPIRED: 'פג תוקף',
  SIGNED: 'נחתמה',

  // Task statuses / types
  OPEN: 'פתוח',
  IN_PROGRESS: 'בתהליך',
  DONE: 'בוצע',
  CANCELLED: 'בוטל',

  SALES_FOLLOWUP: 'מעקב מכירות',
  QUOTE_PREPARATION: 'הכנת הצעת מחיר',
  COORDINATION: 'תיאום',
  FIELD_WORK: 'עבודת שטח',
  REPORT_WRITING: 'כתיבת דוח',
  REVIEW: 'בקרה',
  COLLECTION: 'איסוף',
  GENERAL: 'כללי',

  // Generic "waiting/data" status used across project + report
  WAITING_DATA: 'ממתין לנתונים',

  // Project / work order statuses
  WAITING_QUOTE: 'מחכה להצעת מחיר',
  WAITING_APPROVAL: 'מחכה לאישור',
  SCHEDULED: 'מתוזמן',
  ON_THE_WAY: 'בדרך',
  FIELD_WORK_DONE: 'עבודת שטח בוצעה',
  SENT_TO_CLIENT: 'נשלח ללקוח',
  CLOSED: 'סגור',
  POSTPONED: 'נדחה',

  // Report statuses
  IN_WRITING: 'בכתיבה',
  IN_REVIEW: 'בבקרה',

  // Departments / generic labels (only best-effort; many departments already Hebrew in UI)
  // Keep these as display-only.
  Department: 'מחלקה',

  // Common actions / UI labels
  Create: 'יצירה',
  Edit: 'עריכה',
  Delete: 'מחיקה',
  Save: 'שמור',
  Cancel: 'ביטול',
  Search: 'חיפוש',
  Filter: 'סינון',
  Status: 'סטטוס',
  Role: 'תפקיד',
  Employee: 'עובד',
  Lead: 'ליד',
  Customer: 'לקוח',
  Task: 'משימה',
  Quote: 'הצעת מחיר',
  Report: 'דוח',

  // Common states/messages
  'No data': 'אין נתונים',
  Loading: 'טוען...',
  Required: 'שדות חובה',
  Invalid: 'לא תקין',
  Success: 'הצלחה',
  Error: 'שגיאה',

  // Dashboard/chart specific english strings that appear in headers/tooltips
  Pipeline: 'צינור',
  'Pipeline Value': 'ערך צינור',
  'Conversion Rate': 'שיעור המרה',
  'Quote Sent': 'הצעה נשלחה',
  Won: 'זכה',
  Lost: 'אבוד',
  Best: 'טוב ביותר',
  Realistic: 'ריאלי',
  Worst: 'גרוע ביותר',
  'Leads → Quote Sent → Won': 'לידים → הצעה נשלחה → זכיות',
  // Full chart title (best-effort exact match)
  'Conversion Rate (Leads → Quote Sent → Won)': 'שיעור המרה (לידים → הצעות נשלחו → זכיות)',

  // Special UI (radon pool)
  'Pool (ראדון)': 'מאגר (ראדון)',
  'Pool / null': 'מאגר / ללא שיוך',
  Pool: 'מאגר',
  RD: 'ראדון',

  // Placeholders and form token placeholders that are UI-visible in this app
  firstName: 'שם פרטי',
  lastName: 'שם משפחה',
  email: 'אימייל',
  phone: 'טלפון',
  fu1Date: 'תאריך פולואפ 1',
  fu2Date: 'תאריך פולואפ 2',
  utm_source: 'מקור UTM',
  utm_medium: 'אמצעי UTM',
  utm_campaign: 'קמפיין UTM',
  utm_content: 'תוכן UTM',
  utm_term: 'מונח UTM',
  type: 'סוג',
  projectId: 'מזהה פרויקט',
  opportunityId: 'מזהה הזדמנות',
  'YYYY-MM-DD': 'שנה-חודש-יום',

  // Best-effort UI error phrases that may bubble up from thrown Error messages
  'API load failed': 'טעינת נתונים נכשלה',
  'Stage update failed': 'עדכון שלב נכשל',
  'API create failed': 'יצירה נכשלה',
  'API update failed': 'עדכון נכשלה',
  'API delete failed': 'מחיקה נכשלה',
  'Customer create failed': 'יצירת לקוח נכשלה',
  'Customer delete failed': 'מחיקת לקוח נכשלה',
  'User create failed': 'יצירת עובד נכשלה',
  'Projects load failed': 'טעינת פרויקטים נכשלה',
  'Tasks load failed': 'טעינת משימות נכשלה',
  'Users load failed': 'טעינת משתמשים נכשלה',
  'Customers load failed': 'טעינת לקוחות נכשלה',
  'Quotes load failed': 'טעינת הצעות מחיר נכשלה',
  'Opportunities load failed': 'טעינת הזדמנויות נכשלה',
  'Dashboard load failed': 'טעינת דשבורד נכשלה',
  'Customer full load failed': 'טעינת פרטי לקוח נכשלה',
};

export function translateUiLabel(value: string): string {
  if (!value) return value;
  // If exact match exists, return it; otherwise, keep value.
  return HE_LABELS[value] ?? value;
}

/**
 * Replace English tokens inside a string (substring replacement).
 * We do it this way because some messages appear as: "חסר ... (firstName)".
 */
export function translateUiString(value: string): string {
  if (!value) return value;
  let out = value;

  // Longest keys first to reduce partial collisions.
  const keys = Object.keys(HE_LABELS).slice().sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (out.includes(k)) out = out.split(k).join(HE_LABELS[k]);
  }
  return out;
}

