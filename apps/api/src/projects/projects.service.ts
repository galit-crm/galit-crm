import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();

    const name = (data?.name ?? '').toString().trim();
    const client = (data?.client ?? '').toString().trim();
    if (!name || !client) {
      throw new BadRequestException('שם פרויקט ושדה client (שם לקוח מציג) הם חובה');
    }

    const statusRaw = (data?.status ?? '').toString().toUpperCase();
    const status =
      statusRaw && (Object.values(ProjectStatus) as string[]).includes(statusRaw)
        ? (statusRaw as ProjectStatus)
        : ProjectStatus.NEW;

    return this.prisma.project.create({
      data: {
        importLegacyId: data?.importLegacyId != null ? String(data.importLegacyId).trim() || null : null,
        projectNumber: data?.projectNumber != null ? String(data.projectNumber).trim() || null : null,
        name,
        client,
        customerId: data?.customerId || null,
        service: data?.service ?? null,
        serviceCategory: data?.serviceCategory ?? null,
        serviceSubType: data?.serviceSubType ?? null,
        contactName: data?.contactName ?? null,
        contactPhone: data?.contactPhone ?? null,
        urgency: data?.urgency ?? null,
        city: data?.city ?? null,
        address: data?.address ?? null,
        status,
        notes: data?.notes ?? null,
        dueDate: data?.dueDate ? new Date(data.dueDate) : null,
        siteVisitDate: data?.siteVisitDate ? new Date(data.siteVisitDate) : null,
        siteVisitTime: data?.siteVisitTime ?? null,
        fieldContactName: data?.fieldContactName ?? null,
        fieldContactPhone: data?.fieldContactPhone ?? null,
        requiresReport: data?.requiresReport !== undefined ? Boolean(data.requiresReport) : undefined,
        requiresSampling: data?.requiresSampling !== undefined ? Boolean(data.requiresSampling) : undefined,
        assignedTechnicianId: data?.assignedTechnicianId || null,
        assignedReportWriterId: data?.assignedReportWriterId || null,
      },
      include: {
        assignedTechnician: { select: { id: true, name: true, email: true } },
        assignedReportWriter: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, city: true } },
      },
    });
  }

  async findAll(user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');

    let where: any = undefined;
    if (role === 'TECHNICIAN') {
      if (!user?.id) throw new UnauthorizedException('Missing user id');
      where = { assignedTechnicianId: user.id };
    } else if (role !== 'ADMIN' && role !== 'MANAGER') {
      throw new ForbiddenException();
    }

    return this.prisma.project.findMany({
      where,
      include: {
        assignedTechnician: { select: { id: true, name: true, email: true } },
        assignedReportWriter: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, city: true } },
      },
      orderBy: [{ siteVisitDate: 'asc' }, { siteVisitTime: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role === 'TECHNICIAN' && !user?.id) throw new UnauthorizedException('Missing user id');
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'TECHNICIAN') throw new ForbiddenException();

    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        assignedTechnician: { select: { id: true, name: true, email: true } },
        assignedReportWriter: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, city: true } },
        tasks: { orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }] },
        quotes: { orderBy: [{ createdAt: 'desc' }] },
        reports: { orderBy: [{ createdAt: 'desc' }] },
      },
    });

    if (role === 'TECHNICIAN' && project?.assignedTechnicianId !== user?.id) {
      throw new ForbiddenException();
    }

    return project;
  }

  async update(id: string, data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role === 'TECHNICIAN' && !user?.id) throw new UnauthorizedException('Missing user id');
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'TECHNICIAN') throw new ForbiddenException();

    if (role === 'TECHNICIAN') {
      const existing = await this.prisma.project.findUnique({ where: { id }, select: { assignedTechnicianId: true } });
      if (!existing || existing.assignedTechnicianId !== user?.id) {
        throw new ForbiddenException();
      }
      // Technicians can only update operational scheduling fields for their assigned projects.
      const allowed: any = {};
      if ('siteVisitDate' in (data ?? {})) allowed.siteVisitDate = data.siteVisitDate;
      if ('siteVisitTime' in (data ?? {})) allowed.siteVisitTime = data.siteVisitTime;
      if ('status' in (data ?? {})) allowed.status = data.status;
      data = allowed;
    }

    const {
      projectNumber,
      name,
      customerId,
      service,
      serviceCategory,
      serviceSubType,
      contactName,
      contactPhone,
      urgency,
      address,
      city,
      status,
      assignedTechnicianId,
      assignedReportWriterId,
      siteVisitDate,
      siteVisitTime,
      fieldContactName,
      fieldContactPhone,
      requiresReport,
      requiresSampling,
      dueDate,
      notes,
      ...rest
    } = data ?? {};
    const payload: any = { ...rest };
    if (projectNumber !== undefined) payload.projectNumber = projectNumber ?? null;
    if (name !== undefined) payload.name = name;
    if (customerId !== undefined) payload.customerId = customerId || null;
    if (service !== undefined) payload.service = service ?? null;
    if (serviceCategory !== undefined) payload.serviceCategory = serviceCategory ?? null;
    if (serviceSubType !== undefined) payload.serviceSubType = serviceSubType ?? null;
    if (contactName !== undefined) payload.contactName = contactName ?? null;
    if (contactPhone !== undefined) payload.contactPhone = contactPhone ?? null;
    if (urgency !== undefined) payload.urgency = urgency ?? null;
    if (address !== undefined) payload.address = address ?? null;
    if (city !== undefined) payload.city = city ?? null;
    if (status !== undefined) payload.status = status;
    if (assignedTechnicianId !== undefined) payload.assignedTechnicianId = assignedTechnicianId || null;
    if (assignedReportWriterId !== undefined) payload.assignedReportWriterId = assignedReportWriterId || null;
    if (siteVisitDate !== undefined) payload.siteVisitDate = siteVisitDate ? new Date(siteVisitDate) : null;
    if (siteVisitTime !== undefined) payload.siteVisitTime = siteVisitTime ?? null;
    if (fieldContactName !== undefined) payload.fieldContactName = fieldContactName ?? null;
    if (fieldContactPhone !== undefined) payload.fieldContactPhone = fieldContactPhone ?? null;
    if (requiresReport !== undefined) payload.requiresReport = Boolean(requiresReport);
    if (requiresSampling !== undefined) payload.requiresSampling = Boolean(requiresSampling);
    if (dueDate !== undefined) payload.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) payload.notes = notes ?? null;

    return this.prisma.project.update({
      where: { id },
      data: payload,
      include: {
        assignedTechnician: { select: { id: true, name: true, email: true } },
        assignedReportWriter: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, city: true } },
      },
    });
  }
}
