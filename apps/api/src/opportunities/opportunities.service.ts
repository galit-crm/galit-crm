import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (!['ADMIN', 'MANAGER', 'SALES', 'EXPERT'].includes(role)) throw new ForbiddenException();
    return this.prisma.opportunity.findMany({
      include: {
        customer: { select: { id: true, name: true } },
        lead: { select: { id: true, fullName: true, phone: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findOne(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (!['ADMIN', 'MANAGER', 'SALES', 'EXPERT'].includes(role)) throw new ForbiddenException();
    return this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        lead: { select: { id: true, fullName: true, phone: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        quotes: { orderBy: [{ createdAt: 'desc' }] },
      },
    });
  }

  create(data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (!['ADMIN', 'MANAGER', 'SALES', 'EXPERT'].includes(role)) throw new ForbiddenException();
    return this.prisma.opportunity.create({ data });
  }

  update(id: string, data: any, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (!['ADMIN', 'MANAGER', 'SALES', 'EXPERT'].includes(role)) throw new ForbiddenException();
    return this.prisma.opportunity.update({ where: { id }, data });
  }

  remove(id: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (!['ADMIN', 'MANAGER', 'SALES', 'EXPERT'].includes(role)) throw new ForbiddenException();
    return this.prisma.opportunity.delete({ where: { id } });
  }
}

