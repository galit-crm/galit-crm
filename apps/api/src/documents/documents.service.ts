import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    {
      projectId,
      customerId,
      reportId,
      user,
    }: { projectId?: string; customerId?: string; reportId?: string; user?: { id?: string; role?: string } } = {},
  ) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (customerId) where.customerId = customerId;
    if (reportId) where.reportId = reportId;

    return this.prisma.document.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        report: { select: { id: true, title: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findOne(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        report: { select: { id: true, title: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  create(data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    const payload: any = { ...(data ?? {}) };
    if (!payload.uploadedById) payload.uploadedById = user?.id ?? null;
    return this.prisma.document.create({
      data: payload,
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        report: { select: { id: true, title: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  update(id: string, data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    return this.prisma.document.update({
      where: { id },
      data: { ...(data ?? {}) },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        report: { select: { id: true, title: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  remove(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    return this.prisma.document.delete({ where: { id } });
  }
}

