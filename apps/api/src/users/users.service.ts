import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserRole, UserStatus, WorkMode } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: any) {
    const { password, role, status, phone, department, serviceDepartments, ...rest } = data || {};

    if (!password || !rest?.email || !rest?.name) {
      throw new BadRequestException('שם, אימייל וסיסמה הם שדות חובה.');
    }

    const normalizedRole =
      (role || UserRole.SALES).toString().toUpperCase() as UserRole;
    const normalizedStatus =
      (status || UserStatus.ACTIVE).toString().toUpperCase() as UserStatus;

    const normalizedServiceDepartments: string[] = Array.isArray(serviceDepartments)
      ? serviceDepartments.map((x) => String(x)).filter(Boolean)
      : department
        ? [String(department)]
        : [];

    const payload: Prisma.UserCreateInput = {
      name: rest.name,
      email: rest.email,
      passwordHash: password,
      role: normalizedRole,
      status: normalizedStatus,
      phone: phone ?? null,
      department: department ?? normalizedServiceDepartments[0] ?? null,
      serviceDepartments: normalizedServiceDepartments,
    };

    try {
      // Temporary debug logs for creation flow
      // eslint-disable-next-line no-console
      console.log('UsersService.create received data:', data);
      // eslint-disable-next-line no-console
      console.log('UsersService.create payload for Prisma:', payload);
      return await this.prisma.user.create({ data: payload });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('UsersService.create error:', e);
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        Array.isArray((e.meta as any)?.target) &&
        (e.meta as any).target.includes('email')
      ) {
        throw new BadRequestException('אימייל זה כבר קיים במערכת.');
      }
      throw e;
    }
  }

  update(id: string, data: any) {
    const normalized: any = { ...(data || {}) };
    if ('serviceDepartments' in normalized) {
      normalized.serviceDepartments = Array.isArray(normalized.serviceDepartments)
        ? normalized.serviceDepartments.map((x: any) => String(x)).filter(Boolean)
        : [];
      // keep legacy field in sync for display-only
      if (!('department' in normalized)) normalized.department = normalized.serviceDepartments[0] ?? null;
    }
    return this.prisma.user.update({ where: { id }, data: normalized });
  }

  remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async login(email: string, password: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        passwordHash: password,
        status: UserStatus.ACTIVE,
      },
    });
  }

  async updatePresence(
    id: string,
    data: { isOnline?: boolean; currentWorkMode?: WorkMode | null; currentProjectId?: string | null; lastSeenAt?: Date },
    actor?: { id?: string; role?: string },
  ) {
    const role = (actor?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    const isAdmin = role === 'ADMIN';
    if (!isAdmin && actor?.id !== id) throw new ForbiddenException();

    const payload: any = {};
    if (typeof data.isOnline === 'boolean') payload.isOnline = data.isOnline;
    if ('currentWorkMode' in data) payload.currentWorkMode = data.currentWorkMode ?? null;
    if ('currentProjectId' in data) payload.currentProjectId = data.currentProjectId ?? null;
    payload.lastSeenAt = data.lastSeenAt ?? new Date();

    return this.prisma.user.update({
      where: { id },
      data: payload,
      select: { id: true, isOnline: true, lastSeenAt: true, currentWorkMode: true, currentProjectId: true, role: true, name: true },
    });
  }

  async activeNow(actor?: { id?: string; role?: string }) {
    const role = (actor?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();

    const now = new Date();
    const threshold = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes

    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ isOnline: true }, { lastSeenAt: { gte: threshold } }],
      },
      select: { id: true, name: true, email: true, role: true, isOnline: true, lastSeenAt: true, currentWorkMode: true, currentProjectId: true, currentProject: { select: { id: true, name: true } } },
      orderBy: [{ lastSeenAt: 'desc' }, { name: 'asc' }],
    });

    const techIds = users.filter((u) => u.role === UserRole.TECHNICIAN).map((u) => u.id);
    const techProjects = techIds.length
      ? await this.prisma.project.findMany({
          where: { assignedTechnicianId: { in: techIds }, status: { in: ['SCHEDULED', 'ON_THE_WAY', 'FIELD_WORK_DONE', 'WAITING_DATA'] as any } },
          select: { id: true, name: true, assignedTechnicianId: true },
          orderBy: [{ updatedAt: 'desc' }],
        })
      : [];

    return users.map((u) => ({
      ...u,
      activeNow: true,
      currentProject: u.currentProject ?? (
        u.role === UserRole.TECHNICIAN
          ? (() => {
              const p = techProjects.find((x) => x.assignedTechnicianId === u.id);
              return p ? { id: p.id, name: p.name } : null;
            })()
          : null
      ),
    }));
  }
}

