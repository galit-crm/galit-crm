import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LabSamplesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    {
      projectId,
      customerId,
      user,
    }: { projectId?: string; customerId?: string; user?: { id?: string; role?: string } } = {},
  ) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    // lab module is operational: allow ADMIN/MANAGER/TECHNICIAN
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'TECHNICIAN') throw new ForbiddenException();

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (customerId) where.customerId = customerId;

    // Technician can only see samples of assigned projects
    if (role === 'TECHNICIAN') {
      if (!user?.id) throw new UnauthorizedException('Missing user id');
      where.project = { assignedTechnicianId: user.id };
    }

    return this.prisma.labSample.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        project: { select: { id: true, name: true, projectNumber: true, assignedTechnicianId: true } },
        customer: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ collectedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findOne(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'TECHNICIAN') throw new ForbiddenException();
    return this.prisma.labSample.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, projectNumber: true, assignedTechnicianId: true } },
        customer: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async create(data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'TECHNICIAN') throw new ForbiddenException();

    const payload: any = { ...(data ?? {}) };
    if (!payload.collectedById) payload.collectedById = user?.id ?? null;

    // Technician can only create samples under assigned projects
    if (role === 'TECHNICIAN') {
      if (!user?.id) throw new UnauthorizedException('Missing user id');
      if (payload.projectId) {
        const proj = await this.prisma.project.findUnique({ where: { id: payload.projectId }, select: { assignedTechnicianId: true } });
        if (proj?.assignedTechnicianId !== user.id) throw new ForbiddenException();
      }
    }

    return this.prisma.labSample.create({
      data: payload,
      include: {
        project: { select: { id: true, name: true, projectNumber: true, assignedTechnicianId: true } },
        customer: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'TECHNICIAN') throw new ForbiddenException();

    if (role === 'TECHNICIAN') {
      if (!user?.id) throw new UnauthorizedException('Missing user id');
      const existing = await this.prisma.labSample.findUnique({ where: { id }, include: { project: { select: { assignedTechnicianId: true } } } });
      if (existing?.project?.assignedTechnicianId !== user.id) throw new ForbiddenException();
    }

    return this.prisma.labSample.update({
      where: { id },
      data: { ...(data ?? {}) },
      include: {
        project: { select: { id: true, name: true, projectNumber: true, assignedTechnicianId: true } },
        customer: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async remove(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
    return this.prisma.labSample.delete({ where: { id } });
  }
}

