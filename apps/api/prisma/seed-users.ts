import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  UserStatus,
  ProjectStatus,
  LeadStage,
  LeadStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = [
    {
      email: 'admin@galit.local',
      name: 'Admin',
      role: UserRole.ADMIN,
    },
    {
      email: 'billing@galit.local',
      name: 'Billing',
      role: UserRole.BILLING,
    },
    {
      email: 'technician@galit.local',
      name: 'Technician',
      role: UserRole.TECHNICIAN,
    },
    {
      email: 'sales@galit.local',
      name: 'Sales',
      role: UserRole.SALES,
    },
    {
      email: 'manager@galit.local',
      name: 'Manager',
      role: UserRole.MANAGER,
    },
    {
      email: 'expert@galit.local',
      name: 'Expert',
      role: UserRole.EXPERT,
    },
  ] as const;

  const passwordPlain = '1234';
  const hashedPassword = await bcrypt.hash(passwordPlain, 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: hashedPassword,
        role: user.role,
        status: UserStatus.ACTIVE,
      },
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        status: UserStatus.ACTIVE,
      },
    });
  }

  const tech = await prisma.user.findFirst({ where: { role: UserRole.TECHNICIAN } });
  const projects = [
    { id: 'P-3001', name: 'בדיקת קרינה - אתר עזריאלי', client: 'אפקון', status: ProjectStatus.SCHEDULED, progress: 72, city: 'תל אביב', dueDate: new Date('2026-03-17'), siteVisitDate: new Date('2026-03-17'), siteVisitTime: '09:00', assignedTechnicianId: tech?.id ?? null },
    { id: 'P-3002', name: 'בדיקת אקוסטיקה - מגדל חיפה', client: 'שיכון ובינוי', status: ProjectStatus.ON_THE_WAY, progress: 35, city: 'חיפה', dueDate: new Date('2026-03-22'), siteVisitDate: new Date('2026-03-22'), siteVisitTime: '10:30', assignedTechnicianId: tech?.id ?? null },
    { id: 'P-3003', name: 'בדיקת ראדון - בית פרטי', client: 'שרה לוי', status: ProjectStatus.SCHEDULED, progress: 10, city: 'רעננה', dueDate: new Date('2026-03-28'), siteVisitDate: new Date('2026-03-28'), siteVisitTime: '14:00', assignedTechnicianId: null },
  ];
  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: { name: p.name, client: p.client, status: p.status, progress: p.progress, city: p.city, dueDate: p.dueDate, siteVisitDate: p.siteVisitDate, siteVisitTime: p.siteVisitTime, assignedTechnicianId: p.assignedTechnicianId },
      create: p,
    });
  }

  const salesUsers = await prisma.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.EXPERT] } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  const assigneeIds = salesUsers.map((u) => u.id);
  const pickAssignee = (idx: number) => (assigneeIds.length ? assigneeIds[idx % assigneeIds.length] : null);

  const customersDemo = [
    { name: 'יואב כהן', type: 'PRIVATE', contactName: 'יואב כהן', phone: '052-7312048', email: 'yoav.cohen.home@gmail.com', city: 'רעננה', services: ['קרינה', 'ראדון'], notes: 'בדיקת קרינה לפני רכישת בית פרטי בשכונה ותיקה.' },
    { name: 'ענבל לוי', type: 'PRIVATE', contactName: 'ענבל לוי', phone: '054-9021143', email: 'inbal.levi1987@gmail.com', city: 'גבעתיים', services: ['אקוסטיקה / רעש'], notes: 'בדיקת רעש למערכת מיזוג בדירה חדשה.' },
    { name: 'קבוצת שקד הנדסה בע"מ', type: 'COMPANY', contactName: 'רועי שרון', phone: '050-6674421', email: 'roi.sharon@shaked-eng.co.il', city: 'פתח תקווה', services: ['אקוסטיקה / רעש', 'דוח אקוסטי'], notes: 'הכנת דוח אקוסטי להיתר בנייה בפרויקט מגורים.' },
    { name: 'אורן בנייה ויזמות', type: 'COMPANY', contactName: 'מורן אורן', phone: '052-4819027', email: 'moran@orenyazamut.co.il', city: 'אשדוד', services: ['אסבסט', 'דיגום סביבתי'], notes: 'סקר אסבסט לפני פירוק גג במבנה מסחרי.' },
    { name: 'איילת גת אדריכלות', type: 'COMPANY', contactName: 'איילת גת', phone: '053-3301188', email: 'ayelet@agat-arch.co.il', city: 'תל אביב', services: ['אקוסטיקה / רעש', 'איכות אוויר'], notes: 'ליווי אקוסטי ואיכות אוויר לתכנון משרדים.' },
    { name: 'בית ספר אורנים', type: 'PUBLIC', contactName: 'דנה מלמד', phone: '052-6047730', email: 'dana.melamed@oranim-school.org.il', city: 'כפר סבא', services: ['בדיקות סביבתיות', 'איכות אוויר'], notes: 'בדיקות סביבתיות תקופתיות במבני חינוך.' },
    { name: 'עיריית נס ציונה', type: 'PUBLIC', contactName: 'אילן פרץ', phone: '050-2290114', email: 'ilan.peretz@nsz.muni.il', city: 'נס ציונה', services: ['דיגום סביבתי', 'אקוסטיקה / רעש'], notes: 'בדיקות רעש סביב מוקדי תנועה ותלונות תושבים.' },
    { name: 'מרכז רפואי גליל ים', type: 'PUBLIC', contactName: 'סיון כץ', phone: '052-1884039', email: 'sivan.katz@galilyam-med.org.il', city: 'הרצליה', services: ['מיגון קרינה', 'קרינה'], notes: 'מדידות קרינה ומיגון בחדרי ציוד רפואי.' },
    { name: 'אלמוג ניהול נכסים', type: 'COMPANY', contactName: 'טל אלמוג', phone: '054-5112293', email: 'tal@almog-management.co.il', city: 'חולון', services: ['ראדון', 'איכות אוויר'], notes: 'בדיקות ראדון ואיכות אוויר בבנייני מגורים.' },
    { name: 'מפעלי רם פלסט בע"מ', type: 'COMPANY', contactName: 'ירון בראון', phone: '050-9031126', email: 'yaron@ramplast.co.il', city: 'קריית גת', services: ['איכות אוויר', 'דיגום סביבתי'], notes: 'ניטור איכות אוויר תעסוקתי בקווי ייצור.' },
    { name: 'אוסם הנדסה תשתיות', type: 'COMPANY', contactName: 'ניר שפירא', phone: '052-7118934', email: 'nir.shapira@osem-infra.co.il', city: 'נתניה', services: ['קרינה', 'מיגון קרינה'], notes: 'מיפוי קרינה בסמוך לחדר שנאים ותכנון מיגון.' },
    { name: 'לירון כהן', type: 'PRIVATE', contactName: 'לירון כהן', phone: '054-3702119', email: 'liron.kohen.home@gmail.com', city: 'מודיעין', services: ['ראדון', 'קרינה'], notes: 'בדיקת ראדון לפני אכלוס בית קרקע.' },
    { name: 'שמשון פרויקטים בע"מ', type: 'COMPANY', contactName: 'עדי שמש', phone: '053-7819052', email: 'adi@shimshon-projects.co.il', city: 'באר שבע', services: ['אסבסט', 'איכות אוויר'], notes: 'ליווי סביבתי לפרויקט תמ"א בשכונה ותיקה.' },
    { name: 'תיכון גולדה', type: 'PUBLIC', contactName: 'מיכל רוט', phone: '050-4441932', email: 'michal.rot@golda-high.edu.il', city: 'ירושלים', services: ['אקוסטיקה / רעש', 'בדיקות סביבתיות'], notes: 'בדיקות רעש בכיתות ומדידת הדהוד.' },
    { name: 'אלון מערכות מיזוג', type: 'COMPANY', contactName: 'ארז אלון', phone: '052-9183401', email: 'erez@alon-hvac.co.il', city: 'רמת גן', services: ['אקוסטיקה / רעש'], notes: 'בדיקות רעש למערכות מיזוג בפרויקט משרדים.' },
    { name: 'בית אבן יזמות', type: 'COMPANY', contactName: 'נועה דקל', phone: '054-1297740', email: 'noa@beit-even.co.il', city: 'חדרה', services: ['דוח אקוסטי', 'דיגום סביבתי'], notes: 'דרישות סביבתיות להיתר בנייה במגרש מורכב.' },
    { name: 'אחוזת כרמל ניהול', type: 'COMPANY', contactName: 'גיא בן עטר', phone: '052-6003417', email: 'guy@carmel-estate.co.il', city: 'חיפה', services: ['איכות אוויר', 'עובש'], notes: 'דיגום עובש ואיכות אוויר בבניין מגורים.' },
    { name: 'מועצה מקומית קדימה', type: 'PUBLIC', contactName: 'קרן ברק', phone: '050-6710825', email: 'keren.barak@kadima.muni.il', city: 'קדימה', services: ['דיגום סביבתי', 'אסבסט'], notes: 'בדיקות אסבסט במבני ציבור ישנים.' },
    { name: 'אופק יזמות ובנייה', type: 'COMPANY', contactName: 'חן רז', phone: '053-2299804', email: 'chen@ofek-build.co.il', city: 'אשקלון', services: ['קרינה', 'מיגון קרינה'], notes: 'בדיקת קרינה סמוך לקו מתח בפרויקט מגורים.' },
    { name: 'מכללת עתיד השרון', type: 'PUBLIC', contactName: 'נעמה צור', phone: '052-4993331', email: 'naama.tzur@atid-college.ac.il', city: 'הוד השרון', services: ['איכות אוויר', 'בדיקות סביבתיות'], notes: 'בדיקות איכות אוויר במעבדות לימוד.' },
    { name: 'דניאל פרטי', type: 'PRIVATE', contactName: 'דניאל בר', phone: '054-8081175', email: 'daniel.bar.home@gmail.com', city: 'ראשון לציון', services: ['אסבסט', 'קרינה'], notes: 'סקר אסבסט וקרינה לפני שיפוץ בית פרטי.' },
    { name: 'רימון אדריכלים', type: 'COMPANY', contactName: 'שקד רימון', phone: '050-3007148', email: 'shaked@rimon-arch.co.il', city: 'נהריה', services: ['דוח אקוסטי', 'ראדון'], notes: 'דרישות אקוסטיות וראדון לבית ספר חדש.' },
    { name: 'טכנו-מד תעשיות', type: 'COMPANY', contactName: 'אבי בן שושן', phone: '052-9152086', email: 'avi@technomed.co.il', city: 'יבנה', services: ['קרינה', 'איכות אוויר'], notes: 'בדיקות קרינה סביב ציוד תעשייתי ופליטות.' },
    { name: 'הדר ניהול פרויקטים', type: 'COMPANY', contactName: 'רוני הדר', phone: '053-1742281', email: 'roni@hadar-pm.co.il', city: 'תל אביב', services: ['ליווי סביבתי', 'דיגום סביבתי'], notes: 'ליווי סביבתי מלא לפרויקט בנייה רב-שנתי.' },
    { name: 'יפעת גלילי', type: 'PRIVATE', contactName: 'יפעת גלילי', phone: '052-4117609', email: 'yifat.galili@gmail.com', city: 'פרדס חנה', services: ['ראדון', 'איכות אוויר'], notes: 'בדיקות ראדון ועובש לפני מעבר לבית.' },
  ] as const;

  let createdCustomers = 0;
  for (const c of customersDemo) {
    const exists = await prisma.customer.findFirst({
      where: {
        OR: [{ email: c.email }, { phone: c.phone }, { name: c.name }],
      },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.customer.create({
      data: {
        name: c.name,
        type: c.type,
        contactName: c.contactName,
        phone: c.phone,
        email: c.email,
        city: c.city,
        status: 'ACTIVE',
        services: [...c.services],
        notes: c.notes,
      },
    });
    createdCustomers += 1;
  }

  const leadsDemo = [
    { firstName: 'תומר', lastName: 'מזרחי', fullName: 'תומר מזרחי', phone: '052-7001181', email: 'tomer.mizrahi@gmail.com', company: 'לקוח פרטי', source: 'אתר', city: 'רחובות', site: 'רחובות, שכונת המדע', service: 'קרינה', serviceType: 'בדיקת קרינה לפני קניית בית', stage: LeadStage.NEW, leadStatus: LeadStatus.NEW, notes: 'רוצה בדיקה מלאה לפני חתימה על חוזה.' },
    { firstName: 'ליאת', lastName: 'שמש', fullName: 'ליאת שמש', phone: '054-2203914', email: 'liat.shemesh@gmail.com', company: 'פרטי', source: 'פייסבוק', city: 'רמת השרון', site: 'רחוב הבנים 12', service: 'ראדון', serviceType: 'בדיקת ראדון בבית פרטי', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.CONTACTED, notes: 'חשש מערכי ראדון במרתף.' },
    { firstName: 'עומר', lastName: 'פרנק', fullName: 'עומר פרנק', phone: '050-6221417', email: 'omer@frank-build.co.il', company: 'פרנק בנייה', source: 'קבלן', city: 'נתיבות', site: 'אתר בנייה שכונת נווה', service: 'אסבסט', serviceType: 'סקר אסבסט לפני פירוק גג', stage: LeadStage.QUOTE_SENT, leadStatus: LeadStatus.QUOTE_SENT, notes: 'מבקש הצעת מחיר דחופה לשבוע הקרוב.' },
    { firstName: 'שירי', lastName: 'עמית', fullName: 'שירי עמית', phone: '052-3098842', email: 'shiri.amit@amityazamut.co.il', company: 'עמית יזמות', source: 'גוגל', city: 'חולון', site: 'פרויקט מגורים חדש', service: 'אקוסטיקה / רעש', serviceType: 'דוח אקוסטי להיתר בנייה', stage: LeadStage.NEGOTIATION, leadStatus: LeadStatus.NEGOTIATION, notes: 'צריכה עמידה מלאה בדרישות ועדה.' },
    { firstName: 'אביב', lastName: 'גרין', fullName: 'אביב גרין', phone: '053-7719280', email: 'aviv.green@greenoffices.co.il', company: 'גרין אופיס', source: 'וואטסאפ', city: 'תל אביב', site: 'מגדל משרדים', service: 'איכות אוויר', serviceType: 'בדיקות איכות אוויר במשרד', stage: LeadStage.NEW, leadStatus: LeadStatus.NEW, notes: 'יש תלונות עובדים על ריחות ועייפות.' },
    { firstName: 'מיכל', lastName: 'אביטל', fullName: 'מיכל אביטל', phone: '054-1189030', email: 'michal.avital@gmail.com', company: 'לקוחה פרטית', source: 'המלצה', city: 'מודיעין', site: 'בית פרטי', service: 'דיגום סביבתי', serviceType: 'דיגום עובש בדירה', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.FU_1, notes: 'מבקשת דיגום ותיעוד עבור ביטוח.' },
    { firstName: 'אילן', lastName: 'דיין', fullName: 'אילן דיין', phone: '050-2016775', email: 'ilan.dayan@urban-noise.co.il', company: 'אורבן נויז', source: 'גוגל', city: 'בת ים', site: 'בניין מגורים', service: 'אקוסטיקה / רעש', serviceType: 'בדיקות רעש למערכת מיזוג', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.FU_2, notes: 'רעש רק בשעות ערב, נדרש תיאום מדידה.' },
    { firstName: 'דניאלה', lastName: 'שור', fullName: 'דניאלה שור', phone: '052-9911134', email: 'daniela.shor@municipal.org.il', company: 'עיריית הוד השרון', source: 'עירייה', city: 'הוד השרון', site: 'בית ספר עירוני א', service: 'בדיקות למוסדות', serviceType: 'בדיקות סביבתיות לבית ספר', stage: LeadStage.NEW, leadStatus: LeadStatus.NEW, notes: 'נדרש דוח מסודר לרשות המקומית.' },
    { firstName: 'קובי', lastName: 'זיו', fullName: 'קובי זיו', phone: '053-2884201', email: 'kobi@ziv-electro.co.il', company: 'זיו אלקטרו', source: 'קבלן', city: 'ראש העין', site: 'חדר חשמל מרכזי', service: 'מיגון קרינה', serviceType: 'מיגון קרינה לחדר חשמל', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.CONTACTED, notes: 'מבקש פתרון מיגון לפני אכלוס.' },
    { firstName: 'שרון', lastName: 'ממן', fullName: 'שרון ממן', phone: '050-8114722', email: 'sharon.maman@gmail.com', company: 'פרטי', source: 'אתר', city: 'קריית אונו', site: 'רחוב קדומים 7', service: 'קרינה', serviceType: 'בדיקות קרינה סמוך לקו מתח', stage: LeadStage.NEW, leadStatus: LeadStatus.NEW, notes: 'דאגה בעקבות מדידות פרטיות מהאינטרנט.' },
    { firstName: 'יוסי', lastName: 'הראל', fullName: 'יוסי הראל', phone: '054-7712019', email: 'yossi.harel@harel-construction.co.il', company: 'הראל בנייה', source: 'קבלן', city: 'אשקלון', site: 'פרויקט מגדלי חוף', service: 'ליווי סביבתי', serviceType: 'ליווי סביבתי לפרויקט בנייה', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.QUOTE_SENT, notes: 'רוצה מעטפת מלאה לאורך הפרויקט.' },
    { firstName: 'הילה', lastName: 'סלע', fullName: 'הילה סלע', phone: '052-1493007', email: 'hila.sela@schoolnet.edu.il', company: 'קריית חינוך סלע', source: 'המלצה', city: 'רמלה', site: 'מבנה חטיבה', service: 'אקוסטיקה / רעש', serviceType: 'בדיקות רעש לכיתות לימוד', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.FU_1, notes: 'נדרש דוח לפני פתיחת שנת הלימודים.' },
    { firstName: 'נעם', lastName: 'קליין', fullName: 'נעם קליין', phone: '053-4776102', email: 'noam.klein@arcdesign.co.il', company: 'ARC Design', source: 'גוגל', city: 'חיפה', site: 'פרויקט מגורים יוקרתי', service: 'אקוסטיקה / רעש', serviceType: 'דוח אקוסטי להיתר', stage: LeadStage.QUOTE_SENT, leadStatus: LeadStatus.QUOTE_SENT, notes: 'הצעה נשלחה, ממתינים לאישור.' },
    { firstName: 'ענת', lastName: 'ברק', fullName: 'ענת ברק', phone: '052-6175510', email: 'anat.barak@gmail.com', company: 'פרטי', source: 'פייסבוק', city: 'אבן יהודה', site: 'בית קרקע', service: 'ראדון', serviceType: 'בדיקת ראדון לאחר שיפוץ', stage: LeadStage.NEW, leadStatus: LeadStatus.NEW, notes: 'שואלת גם על איכות אוויר בחדרי ילדים.' },
    { firstName: 'רון', lastName: 'יעקובי', fullName: 'רון יעקובי', phone: '054-8440923', email: 'ron@yaakovifactory.co.il', company: 'יעקובי תעשיות', source: 'וואטסאפ', city: 'עפולה', site: 'מפעל אזור תעשייה', service: 'איכות אוויר', serviceType: 'ניטור איכות אוויר במפעל', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.CONTACTED, notes: 'נדרש דו"ח עבור ממונה בטיחות.' },
    { firstName: 'שקד', lastName: 'לב', fullName: 'שקד לב', phone: '050-5667298', email: 'shaked.lev@publicworks.gov.il', company: 'אגף מבני ציבור', source: 'עירייה', city: 'באר יעקב', site: 'מבנה ציבור ותיק', service: 'אסבסט', serviceType: 'בדיקות אסבסט במבנה ציבור', stage: LeadStage.NEW, leadStatus: LeadStatus.NEW, notes: 'יש צורך בסקר לפני עבודות פירוק.' },
    { firstName: 'אתי', lastName: 'גרוס', fullName: 'אתי גרוס', phone: '052-9430081', email: 'eti.gross@gmail.com', company: 'פרטי', source: 'גוגל', city: 'זכרון יעקב', site: 'דירה חדשה', service: 'אקוסטיקה / רעש', serviceType: 'בדיקת רעש בדירה חדשה', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.FU_2, notes: 'רעש מתשתית משותפת.' },
    { firstName: 'ברק', lastName: 'לוין', fullName: 'ברק לוין', phone: '053-9017455', email: 'barak.levin@levin-dev.co.il', company: 'לוין יזמות', source: 'המלצה', city: 'נתניה', site: 'מגרש בנייה', service: 'קרינה', serviceType: 'בדיקות קרינה לפני תחילת פרויקט', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.CONTACTED, notes: 'מבקש מדידה גם לחדר טרנספורמציה.' },
    { firstName: 'סיגל', lastName: 'צור', fullName: 'סיגל צור', phone: '054-3711252', email: 'sigal.tzur@care-office.co.il', company: 'Care Office', source: 'גוגל', city: 'ירושלים', site: 'משרדים', service: 'איכות אוויר', serviceType: 'בדיקות איכות אוויר במשרד', stage: LeadStage.NEW, leadStatus: LeadStatus.NEW, notes: 'תלונות חוזרות על כאבי ראש בקרב עובדים.' },
    { firstName: 'איתן', lastName: 'מור', fullName: 'איתן מור', phone: '050-7740128', email: 'eitan.mor@buildline.co.il', company: 'Buildline', source: 'קבלן', city: 'לוד', site: 'אתר מגורים', service: 'ליווי סביבתי', serviceType: 'ליווי סביבתי לפרויקט בנייה', stage: LeadStage.QUOTE_SENT, leadStatus: LeadStatus.QUOTE_SENT, notes: 'מעוניין ב-SLA ודוחות חודשיים.' },
    { firstName: 'רחל', lastName: 'שדה', fullName: 'רחל שדה', phone: '052-3381109', email: 'rachel.sadeh@gmail.com', company: 'פרטי', source: 'אתר', city: 'כפר יונה', site: 'בית משפחה', service: 'דיגום סביבתי', serviceType: 'דיגום עובש ותעלות מיזוג', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.FU_1, notes: 'מבקשת גם המלצות לטיפול לאחר הדיגום.' },
    { firstName: 'אלון', lastName: 'ברנע', fullName: 'אלון ברנע', phone: '053-2248801', email: 'alon@barnea-eng.co.il', company: 'ברנע הנדסה', source: 'המלצה', city: 'בני ברק', site: 'חדר שנאים בבניין משרדים', service: 'מיגון קרינה', serviceType: 'מיגון חדר שנאים', stage: LeadStage.NEGOTIATION, leadStatus: LeadStatus.NEGOTIATION, notes: 'דורש מפרט מיגון מפורט לאישור מזמין.' },
    { firstName: 'מאיה', lastName: 'דרור', fullName: 'מאיה דרור', phone: '054-9093317', email: 'maya.dror@kibbutz-center.org.il', company: 'מרכז קהילתי', source: 'וואטסאפ', city: 'עמק חפר', site: 'אולם רב תכליתי', service: 'אקוסטיקה / רעש', serviceType: 'בדיקות רעש לאולם פעילות', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.CONTACTED, notes: 'צריך פתרונות מהירים לפני אירוע פתיחה.' },
    { firstName: 'חן', lastName: 'מגל', fullName: 'חן מגל', phone: '050-6407724', email: 'chen.magal@urban-renew.co.il', company: 'Urban Renew', source: 'קבלן', city: 'פתח תקווה', site: 'מתחם פינוי בינוי', service: 'אסבסט', serviceType: 'סקר אסבסט לפרויקט התחדשות', stage: LeadStage.NEW, leadStatus: LeadStatus.NEW, notes: 'בדגש על מחסנים ותשתיות ישנות.' },
    { firstName: 'תמר', lastName: 'סיון', fullName: 'תמר סיון', phone: '052-8701194', email: 'tamar.sivan@gmail.com', company: 'פרטי', source: 'פייסבוק', city: 'הרצליה', site: 'בית צמוד קרקע', service: 'קרינה', serviceType: 'בדיקת קרינה מקיפה לבית פרטי', stage: LeadStage.CONTACTED, leadStatus: LeadStatus.CONTACTED, notes: 'מתעניינת גם בבדיקת ראדון בהמשך.' },
  ] as const;

  const now = Date.now();
  let createdLeads = 0;
  for (let i = 0; i < leadsDemo.length; i += 1) {
    const l = leadsDemo[i];
    const exists = await prisma.lead.findFirst({
      where: {
        OR: [{ email: l.email }, { phone: l.phone }, { fullName: l.fullName }],
      },
      select: { id: true },
    });
    if (exists) continue;

    const createdAt = new Date(now - (i + 1) * 86400000);
    const followUp1 = new Date(createdAt.getTime() + 2 * 86400000);
    const followUp2 = new Date(createdAt.getTime() + 5 * 86400000);
    const nextFollow = new Date(createdAt.getTime() + 7 * 86400000);

    await prisma.lead.create({
      data: {
        firstName: l.firstName,
        lastName: l.lastName,
        fullName: l.fullName,
        phone: l.phone,
        email: l.email,
        company: l.company,
        source: l.source,
        service: l.service,
        serviceType: l.serviceType,
        city: l.city,
        site: l.site,
        notes: l.notes,
        status: l.leadStatus,
        stage: l.stage,
        leadStatus: l.leadStatus,
        followUp1Date: followUp1,
        followUp2Date: followUp2,
        nextFollowUpDate: nextFollow,
        assignedUserId: pickAssignee(i) ?? undefined,
        createdAt,
      },
    });
    createdLeads += 1;
  }

  const allCustomers = await prisma.customer.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: 'asc' },
  });
  const allLeads = await prisma.lead.findMany({
    select: { id: true, fullName: true, email: true },
    orderBy: { createdAt: 'asc' },
  });
  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  const customerIdByName = new Map(allCustomers.map((c) => [c.name, c.id]));
  const leadIdByFullName = new Map(allLeads.map((l) => [l.fullName || '', l.id]));
  const projectIdByName = new Map(allProjects.map((p) => [p.name, p.id]));

  const techUsers = await prisma.user.findMany({
    where: { role: UserRole.TECHNICIAN },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  const managerUser = await prisma.user.findFirst({
    where: { role: UserRole.MANAGER },
    select: { id: true },
  });

  const techIds = techUsers.map((u) => u.id);
  const pickTech = (idx: number) => (techIds.length ? techIds[idx % techIds.length] : null);

  const projectsDemo = [
    {
      id: 'P-3101',
      name: 'בדיקות אקוסטיות לבניין מגורים חדש',
      client: 'קבוצת שקד הנדסה בע"מ',
      customerName: 'קבוצת שקד הנדסה בע"מ',
      status: ProjectStatus.SCHEDULED,
      progress: 18,
      city: 'פתח תקווה',
      address: 'רחוב המכבים 21',
      service: 'אקוסטיקה / רעש',
      serviceCategory: 'אקוסטיקה',
      serviceSubType: 'דוח אקוסטי להיתר',
      urgency: 'HIGH',
      notes: 'מדידות רעש והדהוד לפני ביקורת הוועדה המקומית.',
    },
    {
      id: 'P-3102',
      name: 'מיגון קרינה לחדר שנאים',
      client: 'אוסם הנדסה תשתיות',
      customerName: 'אוסם הנדסה תשתיות',
      status: ProjectStatus.ON_THE_WAY,
      progress: 35,
      city: 'נתניה',
      address: 'אזה"ת פולג',
      service: 'מיגון קרינה',
      serviceCategory: 'קרינה',
      serviceSubType: 'מיגון חדר חשמל',
      urgency: 'URGENT',
      notes: 'תכנון שילוט ומיגון קירות לפני אכלוס קומת משרדים.',
    },
    {
      id: 'P-3103',
      name: 'בדיקות קרינה לפני רכישת בית',
      client: 'יואב כהן',
      customerName: 'יואב כהן',
      status: ProjectStatus.NEW,
      progress: 5,
      city: 'רעננה',
      address: 'רחוב האילן 9',
      service: 'קרינה',
      serviceCategory: 'קרינה',
      serviceSubType: 'בית פרטי',
      urgency: 'MEDIUM',
      notes: 'בדיקה מלאה כולל חדר ממ"ד וחדר חשמל שכונתי סמוך.',
    },
    {
      id: 'P-3104',
      name: 'סקר אסבסט לפני פירוק גג',
      client: 'אורן בנייה ויזמות',
      customerName: 'אורן בנייה ויזמות',
      status: ProjectStatus.WAITING_DATA,
      progress: 46,
      city: 'אשדוד',
      address: 'רחוב העבודה 14',
      service: 'אסבסט',
      serviceCategory: 'חומרים מסוכנים',
      serviceSubType: 'סקר מקדים',
      urgency: 'HIGH',
      notes: 'ממתינים למסמכי ניהול אתר וחתימת קבלן משנה לפינוי.',
    },
    {
      id: 'P-3105',
      name: 'בדיקת איכות אוויר במשרדי הייטק',
      client: 'גרין אופיס',
      customerName: 'גרין אופיס',
      status: ProjectStatus.REPORT_WRITING,
      progress: 70,
      city: 'תל אביב',
      address: 'מגדל הארבעה',
      service: 'איכות אוויר',
      serviceCategory: 'אוויר',
      serviceSubType: 'בדיקות במשרד',
      urgency: 'MEDIUM',
      notes: 'נמדדו תנודות CO2 בשעות עומס, דוח בהכנה.',
    },
    {
      id: 'P-3106',
      name: 'פרויקט ראדון לבית פרטי',
      client: 'לירון כהן',
      customerName: 'לירון כהן',
      status: ProjectStatus.SCHEDULED,
      progress: 25,
      city: 'מודיעין',
      address: 'רחוב נחל עיון 3',
      service: 'ראדון',
      serviceCategory: 'גזי קרקע',
      serviceSubType: 'מדידה ארוכת טווח',
      urgency: 'MEDIUM',
      notes: 'נדרש תיאום התקנה ואיסוף גלאים לשבועיים.',
    },
    {
      id: 'P-3107',
      name: 'בדיקות רעש למערכות מיזוג בבניין משרדים',
      client: 'אלון מערכות מיזוג',
      customerName: 'אלון מערכות מיזוג',
      status: ProjectStatus.WAITING_APPROVAL,
      progress: 30,
      city: 'רמת גן',
      address: 'דרך אבא הלל 18',
      service: 'אקוסטיקה / רעש',
      serviceCategory: 'אקוסטיקה',
      serviceSubType: 'רעש מערכות',
      urgency: 'HIGH',
      notes: 'ממתינים לאישור הצעת המשך למדידות לילה.',
    },
    {
      id: 'P-3108',
      name: 'ליווי סביבתי לפרויקט התחדשות עירונית',
      client: 'הדר ניהול פרויקטים',
      customerName: 'הדר ניהול פרויקטים',
      status: ProjectStatus.SENT_TO_CLIENT,
      progress: 82,
      city: 'תל אביב',
      address: 'שכונת יד אליהו',
      service: 'ליווי סביבתי',
      serviceCategory: 'סביבתי',
      serviceSubType: 'ליווי פרויקט',
      urgency: 'URGENT',
      notes: 'נשלח עדכון חודשי הכולל רעש, אבק ומעקב תלונות דיירים.',
    },
  ] as const;

  let createdProjects = 0;
  for (let i = 0; i < projectsDemo.length; i += 1) {
    const p = projectsDemo[i];
    const customerId = customerIdByName.get(p.customerName) ?? null;
    const assignedTechnicianId = pickTech(i);
    const assignedReportWriterId = managerUser?.id ?? pickAssignee(i) ?? null;
    const baseDate = new Date(now + (i + 2) * 86400000);

    const data = {
      id: p.id,
      name: p.name,
      client: p.client,
      status: p.status,
      progress: p.progress,
      dueDate: new Date(baseDate.getTime() + 5 * 86400000),
      siteVisitDate: baseDate,
      siteVisitTime: '09:30',
      city: p.city,
      address: p.address,
      service: p.service,
      serviceCategory: p.serviceCategory,
      serviceSubType: p.serviceSubType,
      urgency: p.urgency,
      notes: p.notes,
      customerId,
      assignedTechnicianId,
      assignedReportWriterId,
    };

    const exists = await prisma.project.findUnique({ where: { id: p.id }, select: { id: true } });
    if (exists) {
      await prisma.project.update({ where: { id: p.id }, data });
    } else {
      await prisma.project.create({ data });
      createdProjects += 1;
    }

    projectIdByName.set(p.name, p.id);
  }

  const quotesDemo = [
    { quoteNumber: 'DEMO-Q-2026-001', service: 'בדיקת קרינה לבית פרטי', description: 'מדידה מלאה לרמות קרינה בבית פרטי כולל סיכום המלצות.', amountBeforeVat: 2450, discountType: 'NONE', discountValue: 0, status: 'SENT', customerName: 'יואב כהן', leadName: 'תומר מזרחי', projectName: 'בדיקות קרינה לפני רכישת בית', notes: 'כולל ביקור אחד ודוח מסכם.' },
    { quoteNumber: 'DEMO-Q-2026-002', service: 'דוח אקוסטי להיתר בנייה', description: 'דוח אקוסטי מלא לוועדה מקומית + חישובי רעש.', amountBeforeVat: 5200, discountType: 'PERCENT', discountValue: 5, status: 'DRAFT', customerName: 'קבוצת שקד הנדסה בע"מ', leadName: 'שירי עמית', projectName: 'בדיקות אקוסטיות לבניין מגורים חדש', notes: 'הצעת שלב א לתכנון ראשוני.' },
    { quoteNumber: 'DEMO-Q-2026-003', service: 'בדיקת רעש בדירה חדשה', description: 'מדידת רעש רקע ותשתיות בדירה חדשה.', amountBeforeVat: 1850, discountType: 'NONE', discountValue: 0, status: 'APPROVED', customerName: 'ענבל לוי', leadName: 'אתי גרוס', projectName: 'בדיקות רעש למערכות מיזוג בבניין משרדים', notes: 'בוצע תיאום לביקור ערב.' },
    { quoteNumber: 'DEMO-Q-2026-004', service: 'מיגון חדר חשמל', description: 'תכנון מיגון קרינה לחדר חשמל וחדר שנאים.', amountBeforeVat: 11800, discountType: 'CURRENCY', discountValue: 800, status: 'SENT', customerName: 'אוסם הנדסה תשתיות', leadName: 'אלון ברנע', projectName: 'מיגון קרינה לחדר שנאים', notes: 'המחיר כולל בדיקת אימות לאחר התקנה.' },
    { quoteNumber: 'DEMO-Q-2026-005', service: 'בדיקת ראדון', description: 'התקנת גלאים, איסוף, ופענוח תוצאות.', amountBeforeVat: 2300, discountType: 'NONE', discountValue: 0, status: 'SENT', customerName: 'לירון כהן', leadName: 'ענת ברק', projectName: 'פרויקט ראדון לבית פרטי', notes: 'משך בדיקה משוער 14 ימים.' },
    { quoteNumber: 'DEMO-Q-2026-006', service: 'סקר אסבסט', description: 'סקר אסבסט מקדים + המלצות לפינוי בטוח.', amountBeforeVat: 4700, discountType: 'NONE', discountValue: 0, status: 'DRAFT', customerName: 'אורן בנייה ויזמות', leadName: 'עומר פרנק', projectName: 'סקר אסבסט לפני פירוק גג', notes: 'לא כולל עבודות פינוי בפועל.' },
    { quoteNumber: 'DEMO-Q-2026-007', service: 'בדיקות איכות אוויר במשרד', description: 'דיגום איכות אוויר, CO2, VOC וטמפ/לחות.', amountBeforeVat: 3900, discountType: 'PERCENT', discountValue: 7, status: 'APPROVED', customerName: 'גרין אופיס', leadName: 'סיגל צור', projectName: 'בדיקת איכות אוויר במשרדי הייטק', notes: 'כולל שני ימי דיגום.' },
    { quoteNumber: 'DEMO-Q-2026-008', service: 'דיגום סביבתי למוסד חינוכי', description: 'תוכנית דיגום סביבה למבני חינוך.', amountBeforeVat: 6400, discountType: 'NONE', discountValue: 0, status: 'SENT', customerName: 'בית ספר אורנים', leadName: 'דניאלה שור', projectName: null, notes: 'מותאם לדרישות רשות מקומית.' },
    { quoteNumber: 'DEMO-Q-2026-009', service: 'ליווי סביבתי לפרויקט מגורים', description: 'ליווי סביבתי חודשי לפרויקט בנייה פעיל.', amountBeforeVat: 12600, discountType: 'CURRENCY', discountValue: 600, status: 'SENT', customerName: 'הדר ניהול פרויקטים', leadName: 'איתן מור', projectName: 'ליווי סביבתי לפרויקט התחדשות עירונית', notes: 'כולל דוחות תקופתיים ופגישות תיאום.' },
    { quoteNumber: 'DEMO-Q-2026-010', service: 'בדיקות סביבתיות למפעל', description: 'בדיקות רעש ואיכות אוויר במפעל תעשייתי.', amountBeforeVat: 9800, discountType: 'NONE', discountValue: 0, status: 'REJECTED', customerName: 'טכנו-מד תעשיות', leadName: 'רון יעקובי', projectName: null, notes: 'הלקוח ביקש לדחות לרבעון הבא.' },
  ] as const;

  let createdQuotes = 0;
  for (let i = 0; i < quotesDemo.length; i += 1) {
    const q = quotesDemo[i];
    const customerId = customerIdByName.get(q.customerName);
    if (!customerId) continue;
    const leadId = leadIdByFullName.get(q.leadName) ?? null;
    const projectId = q.projectName ? (projectIdByName.get(q.projectName) ?? null) : null;

    const vatPercent = 17;
    const amountBeforeVat = q.amountBeforeVat;
    const discountValue = q.discountValue;
    const subtotal =
      q.discountType === 'PERCENT'
        ? amountBeforeVat * (1 - discountValue / 100)
        : q.discountType === 'CURRENCY'
          ? Math.max(0, amountBeforeVat - discountValue)
          : amountBeforeVat;
    const totalAmount = Number((subtotal * (1 + vatPercent / 100)).toFixed(2));

    const exists = await prisma.quote.findFirst({
      where: { quoteNumber: q.quoteNumber },
      select: { id: true },
    });
    if (exists) continue;

    const createdAt = new Date(now - (i + 2) * 86400000);
    await prisma.quote.create({
      data: {
        quoteNumber: q.quoteNumber,
        service: q.service,
        description: q.description,
        amount: totalAmount,
        status: q.status as any,
        validTo: new Date(now + 21 * 86400000),
        customerId,
        leadId,
        projectId,
        validityDate: new Date(now + 21 * 86400000),
        amountBeforeVat,
        vatPercent,
        discountType: q.discountType as any,
        discountValue,
        totalAmount,
        paymentTerms: 'שוטף + 30',
        notes: q.notes,
        createdAt,
      },
    });
    createdQuotes += 1;
  }

  const tasksDemo = [
    { title: 'חזרה ללקוח על הצעת מחיר - קרינה בית פרטי', description: 'לעדכן את הלקוח בפרטי ההצעה ולוודא קבלת מסמכים.', status: 'OPEN', priority: 'HIGH', type: 'QUOTE_PREPARATION', dueInDays: 1, customerName: 'יואב כהן', leadName: 'תומר מזרחי', projectName: 'בדיקות קרינה לפני רכישת בית' },
    { title: 'תיאום בדיקת קרינה בשטח - מודיעין', description: 'לתאם חלון הגעה לטכנאי ולהעביר רשימת הכנות ללקוח.', status: 'IN_PROGRESS', priority: 'MEDIUM', type: 'COORDINATION', dueInDays: 2, customerName: 'לירון כהן', leadName: 'ענת ברק', projectName: 'פרויקט ראדון לבית פרטי' },
    { title: 'שליחת דוח ללקוח - איכות אוויר משרדים', description: 'שליחת קובץ PDF ופתיחת משימת follow-up לאישור קבלה.', status: 'OPEN', priority: 'MEDIUM', type: 'REPORT_WRITING', dueInDays: 1, customerName: 'גרין אופיס', leadName: 'סיגל צור', projectName: 'בדיקת איכות אוויר במשרדי הייטק' },
    { title: 'תיאום דיגום אסבסט לפני פירוק גג', description: 'לתאם כניסה לאתר ולעדכן נהלי בטיחות מול מנהל עבודה.', status: 'OPEN', priority: 'URGENT', type: 'FIELD_WORK', dueInDays: 3, customerName: 'אורן בנייה ויזמות', leadName: 'עומר פרנק', projectName: 'סקר אסבסט לפני פירוק גג' },
    { title: 'מעקב אחרי תשלום - הצעה DEMO-Q-2026-007', description: 'לוודא הפקת הזמנה ולתזכר את הנה"ח של הלקוח.', status: 'OPEN', priority: 'HIGH', type: 'GENERAL', dueInDays: 4, customerName: 'גרין אופיס', leadName: 'אביב גרין', projectName: 'בדיקת איכות אוויר במשרדי הייטק' },
    { title: 'בדיקת סטטוס מול עירייה - דוח אקוסטי', description: 'בדיקת סטטוס תיק ורשימת השלמות נדרשות מול הוועדה.', status: 'IN_PROGRESS', priority: 'HIGH', type: 'COORDINATION', dueInDays: 2, customerName: 'קבוצת שקד הנדסה בע"מ', leadName: 'שירי עמית', projectName: 'בדיקות אקוסטיות לבניין מגורים חדש' },
    { title: 'תיאום הגעה לאתר - מיגון חדר שנאים', description: 'אישור זמינות טכנאי וכניסה מול קב"ט האתר.', status: 'OPEN', priority: 'URGENT', type: 'FIELD_WORK', dueInDays: 1, customerName: 'אוסם הנדסה תשתיות', leadName: 'אלון ברנע', projectName: 'מיגון קרינה לחדר שנאים' },
    { title: 'שיחת המשך עם קבלן - פרויקט התחדשות', description: 'בדיקת צרכים לעדכון הצעת ליווי סביבתי חודשית.', status: 'OPEN', priority: 'MEDIUM', type: 'SALES_FOLLOWUP', dueInDays: 5, customerName: 'הדר ניהול פרויקטים', leadName: 'איתן מור', projectName: 'ליווי סביבתי לפרויקט התחדשות עירונית' },
    { title: 'הכנת מסמכים להצעת מחיר - דיגום מוסד חינוכי', description: 'איסוף מסמכי רקע והכנת נספח מתודולוגיה.', status: 'OPEN', priority: 'MEDIUM', type: 'QUOTE_PREPARATION', dueInDays: 2, customerName: 'בית ספר אורנים', leadName: 'דניאלה שור', projectName: null },
    { title: 'בדיקת תוצאות מעבדה - אסבסט', description: 'לעבור על התוצאות, לסמן חריגים ולהכין תקציר ללקוח.', status: 'IN_PROGRESS', priority: 'HIGH', type: 'REVIEW', dueInDays: 2, customerName: 'אורן בנייה ויזמות', leadName: 'שקד לב', projectName: 'סקר אסבסט לפני פירוק גג' },
    { title: 'תיאום איסוף גלאי ראדון', description: 'לתאם איסוף גלאים לאחר פרק הדיגום.', status: 'OPEN', priority: 'MEDIUM', type: 'COLLECTION', dueInDays: 6, customerName: 'לירון כהן', leadName: 'ענת ברק', projectName: 'פרויקט ראדון לבית פרטי' },
    { title: 'פתיחת פרויקט לאחר אישור לקוח', description: 'פתיחת פרויקט במערכת והקצאת טכנאי ודד-ליין.', status: 'DONE', priority: 'HIGH', type: 'GENERAL', dueInDays: -1, customerName: 'ענבל לוי', leadName: 'אתי גרוס', projectName: 'בדיקות רעש למערכות מיזוג בבניין משרדים' },
    { title: 'בדיקת חוזה שירות מול מחלקת רכש', description: 'לוודא התאמה לתנאי תשלום ונספחי בטיחות.', status: 'OPEN', priority: 'LOW', type: 'GENERAL', dueInDays: 7, customerName: 'טכנו-מד תעשיות', leadName: 'רון יעקובי', projectName: null },
    { title: 'עדכון לקוח על התקדמות דוח אקוסטי', description: 'שיחת עדכון ומתן צפי למסירה.', status: 'IN_PROGRESS', priority: 'MEDIUM', type: 'SALES_FOLLOWUP', dueInDays: 3, customerName: 'קבוצת שקד הנדסה בע"מ', leadName: 'נעם קליין', projectName: 'בדיקות אקוסטיות לבניין מגורים חדש' },
    { title: 'בדיקת מסמכים לפני כניסה לשטח - מוסד ציבורי', description: 'בדיקת ביטוחים ואישורי בטיחות לפני בדיקות סביבתיות.', status: 'OPEN', priority: 'HIGH', type: 'COORDINATION', dueInDays: 4, customerName: 'עיריית נס ציונה', leadName: 'דניאלה שור', projectName: null },
  ] as const;

  let createdTasks = 0;
  for (let i = 0; i < tasksDemo.length; i += 1) {
    const t = tasksDemo[i];
    const ownerId = pickAssignee(i);
    if (!ownerId) continue;
    const customerId = customerIdByName.get(t.customerName) ?? null;
    const leadId = leadIdByFullName.get(t.leadName) ?? null;
    const projectId = t.projectName ? (projectIdByName.get(t.projectName) ?? null) : null;

    const exists = await prisma.task.findFirst({
      where: { title: t.title },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status as any,
        priority: t.priority as any,
        type: t.type as any,
        dueDate: new Date(now + t.dueInDays * 86400000),
        ownerId,
        customerId,
        leadId,
        projectId,
      },
    });
    createdTasks += 1;
  }

  console.log(
    `Seed completed successfully (customers created: ${createdCustomers}, leads created: ${createdLeads}, projects created: ${createdProjects}, quotes created: ${createdQuotes}, tasks created: ${createdTasks})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });