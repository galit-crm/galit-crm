import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuoteStatus } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { parseFollowupSqlDump } from './followup-sql.parser';
import { parseCsvText, parseXlsxBuffer } from './followup-sheet.parser';
import {
  buildPreviewSamples,
  ImportEntityKind,
  mapFromSheetRows,
  mapFromSqlBuckets,
  MappedFollowupPayload,
  summarizeCounts,
} from './followup-mapper';
import { digitsPhone, normStr } from './followup-normalize';
import { FOLLOWUP_ATTACHMENTS_IMPORT_PLACEHOLDER } from './followup-attachments.stub';

const BATCH = 35;

function importStorageDir(): string {
  return process.env.IMPORT_STORAGE_DIR || path.join(process.cwd(), 'data', 'imports');
}

function mapQuoteStatus(s: string): QuoteStatus {
  const u = normStr(s).toUpperCase();
  if (!u) return 'DRAFT';
  if (u.includes('SIGN') || u.includes('חתום')) return 'SIGNED';
  if (u.includes('APPROV') || u.includes('אושר')) return 'APPROVED';
  if (u.includes('REJECT') || u.includes('דחה')) return 'REJECTED';
  if (u.includes('SENT') || u.includes('נשלח')) return 'SENT';
  if (u.includes('EXPIR') || u.includes('פג')) return 'EXPIRED';
  return 'DRAFT';
}

@Injectable()
export class FollowupImportService {
  private readonly log = new Logger(FollowupImportService.name);

  constructor(private readonly prisma: PrismaService) {
    void this.ensureDir();
  }

  private async ensureDir() {
    try {
      await fs.mkdir(importStorageDir(), { recursive: true });
    } catch (e) {
      this.log.warn(`import dir: ${String(e)}`);
    }
  }

  async saveUpload(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    userId?: string,
    userRole?: string,
  ) {
    const id = randomUUID();
    const baseDir = importStorageDir();
    const dir = path.join(baseDir, id);
    const safeName = path
      .basename(file.originalname || 'upload')
      .replace(/[^\w.\-()\s\u0590-\u05FF]/g, '_');
    const storedPath = path.join(dir, safeName);

    const ext = path.extname(safeName).toLowerCase();
    let fileType = 'UNKNOWN';
    if (ext === '.sql') fileType = 'SQL';
    else if (ext === '.csv') fileType = 'CSV';
    else if (ext === '.xlsx' || ext === '.xls') fileType = 'XLSX';

    this.log.log(
      `[upload] start file=${safeName} type=${fileType} user=${userId || '-'} role=${userRole || '-'} baseDir=${baseDir}`,
    );

    try {
      await fs.mkdir(baseDir, { recursive: true });
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(storedPath, file.buffer);

      const job = await this.prisma.importJob.create({
        data: {
          id,
          fileName: safeName,
          mimeType: file.mimetype || null,
          fileType,
          storedPath,
          userId: userId || null,
          status: 'UPLOADED',
        },
      });
      this.log.log(`[upload] success jobId=${job.id} storedPath=${storedPath}`);
      return job;
    } catch (e: any) {
      this.log.error('[upload] failed', {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        meta: e?.meta,
        file: {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.buffer?.length ?? 0,
        },
        pathInfo: { baseDir, dir, storedPath },
        user: { id: userId || null, role: userRole || null },
      });

      // Prisma: table/model missing usually means migration wasn't applied.
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2021') {
          throw new BadRequestException(
            'ImportJob table is missing in DB. Run prisma migrations (npx prisma migrate deploy).',
          );
        }
        throw new BadRequestException(`Upload DB error: ${e.code}`);
      }

      throw new InternalServerErrorException(
        `Upload failed: ${e?.message || 'unknown error'}`,
      );
    }
  }

  private async readPayload(job: {
    storedPath: string | null;
    fileType: string;
    fileName: string;
  }, sheetEntity: ImportEntityKind): Promise<{ payload: MappedFollowupPayload; sqlWarnings: string[] }> {
    if (!job.storedPath) throw new BadRequestException('אין קובץ שמור לעבודה');
    const buf = await fs.readFile(job.storedPath);
    const ext = path.extname(job.fileName).toLowerCase();

    if (job.fileType === 'SQL' || ext === '.sql') {
      const text = buf.toString('utf8');
      const { buckets, warnings } = parseFollowupSqlDump(text);
      const payload = mapFromSqlBuckets(buckets);
      return { payload, sqlWarnings: warnings };
    }

    if (job.fileType === 'XLSX' || ext === '.xlsx' || ext === '.xls') {
      const { rows } = parseXlsxBuffer(buf);
      return { payload: mapFromSheetRows(sheetEntity, rows as any), sqlWarnings: [] };
    }

    if (job.fileType === 'CSV' || ext === '.csv') {
      const text = buf.toString('utf8');
      const { rows } = parseCsvText(text);
      return { payload: mapFromSheetRows(sheetEntity, rows as any), sqlWarnings: [] };
    }

    throw new BadRequestException('סוג קובץ לא נתמך (SQL / CSV / XLSX)');
  }

  async buildPreview(jobId: string, sheetEntity: ImportEntityKind = 'auto') {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('import job לא נמצא');

    const { payload, sqlWarnings } = await this.readPayload(job, sheetEntity);
    const samples = buildPreviewSamples(payload);
    const counts = summarizeCounts(payload);
    const warnings = [...sqlWarnings, ...payload.warnings];

    if (FOLLOWUP_ATTACHMENTS_IMPORT_PLACEHOLDER) {
      warnings.push(
        'קבצים מצורפים / OLEOBJECTS: תשתית עתידית בלבד — לא מיובאים בסבב זה',
      );
    }

    const previewJson = {
      counts,
      samples,
      warnings,
      sheetEntity,
      fileType: job.fileType,
      fileName: job.fileName,
    };

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'PREVIEW_READY',
        previewJson: previewJson as any,
        errorMessage: null,
      },
    });

    return previewJson;
  }

  async execute(jobId: string, sheetEntity: ImportEntityKind = 'auto') {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('import job לא נמצא');
    if (!job.storedPath) throw new BadRequestException('אין קובץ');

    await this.prisma.importJobError.deleteMany({ where: { jobId } });

    await this.prisma.importJob.update({
      where: { id: jobId },
        data: { status: 'RUNNING', errorMessage: null, resultJson: null },
    });

    const defaultClass = await this.prisma.customerClassification.findFirst({
      orderBy: { sortOrder: 'asc' },
    });
    if (!defaultClass) {
      await this.failJob(jobId, 'אין סיווג לקוח במערכת — הוסף סיווג בהגדרות');
      throw new BadRequestException('אין סיווג לקוח');
    }

    const qt = await this.prisma.quoteTemplate.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    const defaultService = qt?.serviceType || 'ייבוא Followup';

    let payload: MappedFollowupPayload;
    try {
      const r = await this.readPayload(job, sheetEntity);
      payload = r.payload;
    } catch (e: any) {
      await this.failJob(jobId, e?.message || 'parse נכשל');
      throw e;
    }

    const stats = {
      customersUpserted: 0,
      contactsUpserted: 0,
      quotesUpserted: 0,
      ordersUpserted: 0,
      activitiesUpserted: 0,
      errorsRecorded: 0,
    };

    const legacyCustomerId = new Map<string, string>();
    const contactKeyToId = new Map<string, string>();
    const quoteLegacyToId = new Map<string, string>();

    const recordErr = async (entity: string, message: string, rowData?: unknown) => {
      stats.errorsRecorded++;
      await this.prisma.importJobError.create({
        data: {
          jobId,
          entity,
          message,
          ...(rowData !== undefined ? { rowData: rowData as Prisma.InputJsonValue } : {}),
        },
      });
    };

    try {
      // Prime customer map from DB for partial sheet imports
      const allLegacyCodes = new Set<string>();
      for (const c of payload.customers) allLegacyCodes.add(c.legacyCode);
      for (const x of payload.contacts) allLegacyCodes.add(x.customerLegacy);
      for (const x of payload.quotes) allLegacyCodes.add(x.customerLegacy);
      for (const x of payload.orders) allLegacyCodes.add(x.customerLegacy);
      for (const x of payload.activities) allLegacyCodes.add(x.customerLegacy);

      const existingCustomers = await this.prisma.customer.findMany({
        where: { importLegacyId: { in: [...allLegacyCodes].filter(Boolean) } },
        select: { id: true, importLegacyId: true },
      });
      for (const row of existingCustomers) {
        if (row.importLegacyId) legacyCustomerId.set(row.importLegacyId, row.id);
      }

      // --- Customers ---
      for (let i = 0; i < payload.customers.length; i += BATCH) {
        const slice = payload.customers.slice(i, i + BATCH);
        await this.prisma.$transaction(async (tx) => {
          for (const c of slice) {
            try {
              let typeCode = defaultClass.code;
              if (c.classificationLegacy) {
                const hit = await tx.customerClassification.findUnique({
                  where: { code: c.classificationLegacy },
                });
                if (hit) typeCode = hit.code;
              }

              const orConds: Prisma.CustomerWhereInput[] = [];
              if (digitsPhone(c.phone)) orConds.push({ phone: c.phone });
              if (c.email) orConds.push({ email: c.email });

              let cust =
                (c.legacyCode
                  ? await tx.customer.findFirst({
                      where: { importLegacyId: c.legacyCode },
                    })
                  : null) ||
                (orConds.length
                  ? await tx.customer.findFirst({
                      where: { name: c.name, OR: orConds },
                    })
                  : null);

              const cityVal = c.city || '—';
              const createData: Prisma.CustomerUncheckedCreateInput = {
                importLegacyId: c.legacyCode,
                name: c.name,
                type: typeCode,
                contactName: c.contactName || c.name || '—',
                phone: c.phone || '',
                email: c.email || '',
                city: cityVal,
                address: c.addressLine1 || null,
                notes: c.notes || null,
                internalNotes: c.internalNotes || null,
                phone2: c.phone2 || null,
                phone3: c.phone3 || null,
                fax: c.fax || null,
                website: c.website || null,
                companyRegNumber: c.companyNumber || null,
                ...(c.balance != null ? { balanceLegacy: new Prisma.Decimal(c.balance) } : {}),
                birthdayLegacy: c.birthday || null,
                cityCodeLegacy: c.cityCodeLegacy || null,
                zipLegacy: c.zip || null,
                legacyUpdatedAt: c.legacyUpdatedAt || null,
                status: 'ACTIVE',
                services: [],
              };

              if (cust) {
                await tx.customer.update({
                  where: { id: cust.id },
                  data: {
                    importLegacyId: cust.importLegacyId || c.legacyCode,
                    name: c.name || cust.name,
                    contactName: createData.contactName as string,
                    phone: cust.phone || createData.phone,
                    email: cust.email || createData.email,
                    city: cust.city && cust.city !== '—' ? cust.city : cityVal,
                    address: createData.address ?? cust.address,
                    notes: createData.notes ?? cust.notes,
                    internalNotes: createData.internalNotes ?? cust.internalNotes,
                    phone2: createData.phone2 ?? cust.phone2,
                    phone3: createData.phone3 ?? cust.phone3,
                    fax: createData.fax ?? cust.fax,
                    website: createData.website ?? cust.website,
                    companyRegNumber: createData.companyRegNumber ?? cust.companyRegNumber,
                    balanceLegacy: createData.balanceLegacy ?? cust.balanceLegacy,
                    birthdayLegacy: createData.birthdayLegacy ?? cust.birthdayLegacy,
                    cityCodeLegacy: createData.cityCodeLegacy ?? cust.cityCodeLegacy,
                    zipLegacy: createData.zipLegacy ?? cust.zipLegacy,
                    legacyUpdatedAt: createData.legacyUpdatedAt ?? cust.legacyUpdatedAt,
                  },
                });
                legacyCustomerId.set(c.legacyCode, cust.id);
              } else {
                cust = await tx.customer.create({ data: createData });
                legacyCustomerId.set(c.legacyCode, cust.id);
              }
              stats.customersUpserted++;
            } catch (e: any) {
              await recordErr('customers', e?.message || String(e), c);
            }
          }
        });
      }

      // --- Contacts ---
      for (let i = 0; i < payload.contacts.length; i += BATCH) {
        const slice = payload.contacts.slice(i, i + BATCH);
        await this.prisma.$transaction(async (tx) => {
          for (const ct of slice) {
            try {
              const custId = legacyCustomerId.get(ct.customerLegacy);
              if (!custId) {
                await recordErr(
                  'contacts',
                  `לקוח ישן ${ct.customerLegacy} לא נמצא`,
                  ct,
                );
                continue;
              }
              const importKey = `${ct.customerLegacy}__${ct.contactLegacy}`;
              const existing = await tx.customerContact.findUnique({
                where: {
                  customerId_importLegacyId: { customerId: custId, importLegacyId: importKey },
                },
              });
              const body = {
                fullName: ct.fullName,
                phone: ct.phone || '',
                mobile: ct.mobile || '',
                fax: ct.fax || '',
                email: ct.email || '',
                address: ct.address || '',
                city: ct.city || '',
                zip: ct.zip || '',
                roleTitle: ct.roleTitle || null,
                department: ct.department || null,
                isPrimary: ct.isPrimary,
                isActive: ct.isActive,
                notes: ct.notes || null,
              };
              let row;
              if (existing) {
                row = await tx.customerContact.update({
                  where: { id: existing.id },
                  data: body,
                });
              } else {
                row = await tx.customerContact.create({
                  data: {
                    importLegacyId: importKey,
                    customerId: custId,
                    ...body,
                  },
                });
              }
              contactKeyToId.set(`${ct.customerLegacy}|${ct.contactLegacy}`, row.id);
              stats.contactsUpserted++;
            } catch (e: any) {
              await recordErr('contacts', e?.message || String(e), ct);
            }
          }
        });
      }

      // --- Quotes ---
      const defaultValidTo = new Date(Date.now() + 90 * 86400000);
      for (let i = 0; i < payload.quotes.length; i += BATCH) {
        const slice = payload.quotes.slice(i, i + BATCH);
        await this.prisma.$transaction(async (tx) => {
          for (const q of slice) {
            try {
              const custId = legacyCustomerId.get(q.customerLegacy);
              if (!custId) {
                await recordErr('quotes', `לקוח ישן ${q.customerLegacy} חסר`, q);
                continue;
              }
              let contactId: string | null = null;
              if (q.contactLegacy) {
                contactId =
                  contactKeyToId.get(`${q.customerLegacy}|${q.contactLegacy}`) || null;
              }

              const validTo = q.quoteDate
                ? new Date(q.quoteDate.getTime() + 90 * 86400000)
                : defaultValidTo;
              const amount = q.total || 0;
              const st = mapQuoteStatus(q.statusLegacy);

              const existing = await tx.quote.findFirst({
                where: { importLegacyId: q.legacyCode },
              });

              const base: Prisma.QuoteUncheckedCreateInput = {
                importLegacyId: q.legacyCode,
                quoteNumber: q.quoteNumber || q.legacyCode,
                service: defaultService,
                description: null,
                amount,
                status: st,
                validTo,
                customerId: custId,
                ...(contactId ? { customerContactId: contactId } : {}),
                paymentTerms: q.paymentTerms || null,
                notes: [q.notes, q.internalNotes].filter(Boolean).join('\n') || null,
                validityDate: q.quoteDate || null,
                amountBeforeVat: amount,
                totalAmount: amount,
                reminderNextAt: q.followUpDate || null,
              };

              let saved;
              if (existing) {
                saved = await tx.quote.update({
                  where: { id: existing.id },
                  data: {
                    ...base,
                    customerContactId: contactId || null,
                  },
                });
              } else {
                saved = await tx.quote.create({ data: base });
              }
              quoteLegacyToId.set(q.legacyCode, saved.id);
              stats.quotesUpserted++;
            } catch (e: any) {
              await recordErr('quotes', e?.message || String(e), q);
            }
          }
        });
      }

      // --- Orders ---
      for (let i = 0; i < payload.orders.length; i += BATCH) {
        const slice = payload.orders.slice(i, i + BATCH);
        await this.prisma.$transaction(async (tx) => {
          for (const o of slice) {
            try {
              const custId = legacyCustomerId.get(o.customerLegacy);
              if (!custId) {
                await recordErr('orders', `לקוח ישן ${o.customerLegacy} חסר`, o);
                continue;
              }
              let contactId: string | null = null;
              if (o.contactLegacy) {
                contactId =
                  contactKeyToId.get(`${o.customerLegacy}|${o.contactLegacy}`) || null;
              }
              let quoteId: string | null = null;
              if (o.quoteLegacy) {
                quoteId = quoteLegacyToId.get(o.quoteLegacy) || null;
                if (!quoteId) {
                  const qrow = await tx.quote.findFirst({
                    where: { importLegacyId: o.quoteLegacy },
                  });
                  quoteId = qrow?.id || null;
                }
              }

              const existing = await tx.salesOrder.findFirst({
                where: { importLegacyId: o.legacyCode },
              });
              const body = {
                orderNumber: o.orderNumber || o.legacyCode,
                customerId: custId,
                customerContactId: contactId,
                quoteId,
                status: normStr(o.statusLegacy) || 'IMPORTED',
                orderDate: o.orderDate || null,
                total: o.total || 0,
                notes: o.notes || null,
                internalNotes: o.internalNotes || null,
                deliverySummary: o.deliverySummary || null,
                paymentTerms: o.paymentTerms || null,
              };

              if (existing) {
                await tx.salesOrder.update({ where: { id: existing.id }, data: body });
              } else {
                await tx.salesOrder.create({
                  data: { importLegacyId: o.legacyCode, ...body },
                });
              }
              stats.ordersUpserted++;
            } catch (e: any) {
              await recordErr('orders', e?.message || String(e), o);
            }
          }
        });
      }

      // Link quotes → orders when quote mentions RelatedOrder
      for (const q of payload.quotes) {
        if (!q.relatedOrderLegacy) continue;
        const qid = quoteLegacyToId.get(q.legacyCode);
        if (!qid) continue;
        const ord = await this.prisma.salesOrder.findFirst({
          where: { importLegacyId: q.relatedOrderLegacy },
        });
        if (ord && !ord.quoteId) {
          await this.prisma.salesOrder.update({
            where: { id: ord.id },
            data: { quoteId: qid },
          });
        }
      }

      // --- Activities ---
      for (let i = 0; i < payload.activities.length; i += BATCH) {
        const slice = payload.activities.slice(i, i + BATCH);
        await this.prisma.$transaction(async (tx) => {
          for (const a of slice) {
            try {
              const custId = legacyCustomerId.get(a.customerLegacy);
              if (!custId) {
                await recordErr('activities', `לקוח ישן ${a.customerLegacy} חסר`, a);
                continue;
              }
              let contactId: string | null = null;
              if (a.contactLegacy) {
                contactId =
                  contactKeyToId.get(`${a.customerLegacy}|${a.contactLegacy}`) || null;
              }
              const importKey = a.legacyCode || `GEN_${a.dedupeHash}`;

              const existing = await tx.customerInteraction.findFirst({
                where: { importLegacyId: importKey },
              });

              const body = {
                customerId: custId,
                customerContactId: contactId,
                activityType: a.activityType || null,
                status: a.status || null,
                subject: a.subject || null,
                notes: a.notes || null,
                dueDate: a.dueDate || null,
                completedDate: a.completedDate || null,
                activityDate: a.activityDate || a.completedDate || a.dueDate || new Date(),
                legacyOwnerName: a.legacyOwnerName || null,
                location: a.location || null,
                priority: a.priority || null,
              };

              if (existing) {
                await tx.customerInteraction.update({
                  where: { id: existing.id },
                  data: body,
                });
              } else {
                await tx.customerInteraction.create({
                  data: { importLegacyId: importKey, ...body },
                });
              }
              stats.activitiesUpserted++;
            } catch (e: any) {
              await recordErr('activities', e?.message || String(e), a);
            }
          }
        });
      }

      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          resultJson: stats as any,
        },
      });

      return stats;
    } catch (e: any) {
      await this.failJob(jobId, e?.message || 'ייבוא נכשל');
      throw e;
    }
  }

  private async failJob(jobId: string, msg: string) {
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errorMessage: msg },
    });
  }

  async listJobs(take = 30) {
    return this.prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        fileName: true,
        fileType: true,
        status: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        previewJson: true,
        resultJson: true,
        errorMessage: true,
        _count: { select: { errors: true } },
      },
    });
  }

  async getJob(id: string) {
    const j = await this.prisma.importJob.findUnique({
      where: { id },
      include: { _count: { select: { errors: true } } },
    });
    if (!j) throw new NotFoundException();
    return j;
  }

  async listErrors(jobId: string) {
    return this.prisma.importJobError.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
