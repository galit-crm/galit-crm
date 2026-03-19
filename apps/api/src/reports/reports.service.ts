import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll({ projectId, user }: { projectId?: string; user?: { id?: string; role?: string } } = {}) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    return this.prisma.report.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findOne(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    return this.prisma.report.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
        documents: { orderBy: [{ createdAt: 'desc' }] },
      },
    });
  }

  create(data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    const payload: any = { ...(data ?? {}) };
    if (!payload.createdById) payload.createdById = user?.id;
    return this.prisma.report.create({
      data: payload,
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  update(id: string, data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    const payload: any = { ...(data ?? {}) };
    if (payload.status === 'SENT' && !payload.sentAt) payload.sentAt = new Date();
    return this.prisma.report.update({
      where: { id },
      data: payload,
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  remove(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    return this.prisma.report.delete({ where: { id } });
  }

  async getDashboard(user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const [waitingWriting, inReview, sentThisWeek, samplesCollected, samplesInAnalysis, abnormalResults, projectsWaitingData] =
      await Promise.all([
        this.prisma.report.count({ where: { status: 'IN_WRITING' } }),
        this.prisma.report.count({ where: { status: 'IN_REVIEW' } }),
        this.prisma.report.count({ where: { status: 'SENT', sentAt: { gte: startOfWeek } } }),
        this.prisma.labSample.count({ where: { sampleStatus: 'COLLECTED' } }),
        this.prisma.labSample.count({ where: { sampleStatus: 'IN_ANALYSIS' } }),
        this.prisma.labSample.count({ where: { resultStatus: 'ABNORMAL' } }),
        this.prisma.project.count({ where: { status: 'WAITING_DATA' } }),
      ]);

    return {
      reportsWaitingWriting: waitingWriting,
      reportsInReview: inReview,
      reportsSentThisWeek: sentThisWeek,
      samplesCollected,
      samplesInAnalysis,
      abnormalSampleResults: abnormalResults,
      projectsWaitingForData: projectsWaitingData,
    };
  }
}

