import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  private computeTotalAmount(input: {
    amountBeforeVat?: number | null;
    vatPercent?: number | null;
    discountType?: string | null;
    discountValue?: number | null;
  }) {
    const base = Number(input.amountBeforeVat ?? 0) || 0;
    const vat = Number(input.vatPercent ?? 0) || 0;
    const withVat = base * (1 + vat / 100);
    const discType = (input.discountType || 'NONE').toString().toUpperCase();
    const discVal = Number(input.discountValue ?? 0) || 0;
    let discounted = withVat;
    if (discType === 'CURRENCY') discounted = withVat - discVal;
    if (discType === 'PERCENT') discounted = withVat * (1 - discVal / 100);
    return Math.max(0, Math.round(discounted * 100) / 100);
  }

  async findAll({
    projectId,
    opportunityId,
    customerId,
    leadId,
    user,
  }: {
    projectId?: string;
    opportunityId?: string;
    customerId?: string;
    leadId?: string;
    user?: { id?: string; role?: string };
  } = {}) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'SALES') throw new ForbiddenException();

    // Automation: expire quotes whose validity passed while still SENT
    const now = new Date();
    await this.prisma.quote.updateMany({
      where: {
        status: 'SENT',
        OR: [
          { validityDate: { lt: now } },
          { validTo: { lt: now } },
        ],
      },
      data: { status: 'EXPIRED' },
    });

    return this.prisma.quote.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(opportunityId ? { opportunityId } : {}),
        ...(customerId ? { customerId } : {}),
        ...(leadId ? { leadId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: { customer: true, opportunity: true, project: true },
    });
  }

  findOne(id: string) {
    return this.prisma.quote.findUnique({ where: { id } });
  }

  create(data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'SALES') throw new ForbiddenException();

    const totalAmount = this.computeTotalAmount({
      amountBeforeVat: data?.amountBeforeVat,
      vatPercent: data?.vatPercent,
      discountType: data?.discountType,
      discountValue: data?.discountValue,
    });

    return this.prisma.quote.create({
      data: {
        ...data,
        totalAmount,
      },
    });
  }

  async update(id: string, data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'SALES') throw new ForbiddenException();

    const existing = await this.prisma.quote.findUnique({
      where: { id },
      include: { customer: true, opportunity: true },
    });
    if (!existing) throw new NotFoundException('Quote not found');

    const next: any = { ...data };

    // Always keep totalAmount in sync when financial fields change
    const willRecalc =
      'amountBeforeVat' in (data ?? {}) ||
      'vatPercent' in (data ?? {}) ||
      'discountType' in (data ?? {}) ||
      'discountValue' in (data ?? {});
    if (willRecalc) {
      next.totalAmount = this.computeTotalAmount({
        amountBeforeVat: 'amountBeforeVat' in data ? data.amountBeforeVat : existing.amountBeforeVat,
        vatPercent: 'vatPercent' in data ? data.vatPercent : existing.vatPercent,
        discountType: 'discountType' in data ? data.discountType : existing.discountType,
        discountValue: 'discountValue' in data ? data.discountValue : existing.discountValue,
      });
    }

    // If status transitions to SENT -> start reminder tracking
    if (data?.status === 'SENT' && existing.status !== 'SENT') {
      next.sentAt = new Date();
      next.reminderCount = 0;
      next.reminderNextAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    }

    const isApproving =
      (data?.status === 'APPROVED' && existing.status !== 'APPROVED') ||
      (data?.status === 'SIGNED' && existing.status !== 'SIGNED'); // legacy support

    // If status transitions to APPROVED (or legacy SIGNED) -> create project
    if (isApproving) {
      if (data?.status === 'SIGNED') {
        next.signedAt = new Date();
        next.digitalSignatureStatus = 'SIGNED';
      }

      if (!existing.projectId) {
        const projectName =
          existing.opportunity?.projectOrServiceName ||
          existing.service ||
          `Project from quote ${existing.id}`;

        const createdProject = await this.prisma.project.create({
          data: {
            name: projectName,
            client: existing.customer?.name ?? '',
            customerId: existing.customerId,
            service: existing.service,
            serviceCategory: existing.service,
            status: 'NEW',
            progress: 0,
            assignedTechnicianId: existing.opportunity?.assignedUserId ?? null,
            notes: existing.notes ?? undefined,
          },
        });

        next.projectId = createdProject.id;
      }
    }

    return this.prisma.quote.update({ where: { id }, data: next });
  }

  remove(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'SALES') throw new ForbiddenException();
    return this.prisma.quote.delete({ where: { id } });
  }

  async generatePdf(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const quotesDir = path.join(process.cwd(), 'storage', 'quotes');
    if (!fs.existsSync(quotesDir)) {
      fs.mkdirSync(quotesDir, { recursive: true });
    }

    const fileName = `quote-${quote.id}.pdf`;
    const filePath = path.join(quotesDir, fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .text('גלית - הצעת מחיר', { align: 'right' })
        .moveDown();

      // Quote / customer info
      doc
        .fontSize(12)
        .text(`מספר הצעה: ${quote.quoteNumber ?? quote.id}`, { align: 'right' })
        .text(`לקוח: ${quote.customer?.name ?? ''}`, { align: 'right' })
        .text(`שירות: ${quote.service}`, { align: 'right' })
        .text(`סכום (₪): ${quote.amount.toLocaleString()}`, { align: 'right' })
        .text(`סטטוס: ${quote.status}`, { align: 'right' })
        .text(`בתוקף עד: ${quote.validTo.toISOString().slice(0, 10)}`, { align: 'right' })
        .moveDown();

      if (quote.description) {
        doc
          .fontSize(12)
          .text('תיאור השירות:', { align: 'right' })
          .moveDown(0.5)
          .text(quote.description, { align: 'right' });
      }

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    });

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        pdfPath: `storage/quotes/${fileName}`,
      },
    });

    return updated;
  }
}

