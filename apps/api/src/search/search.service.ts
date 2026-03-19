import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (!['ADMIN', 'MANAGER', 'SALES', 'TECHNICIAN', 'EXPERT', 'BILLING'].includes(role)) {
      throw new ForbiddenException();
    }

    const query = (q || '').trim();
    if (query.length < 2) {
      return { customers: [], leads: [], projects: [] };
    }

    const containsInsensitive = (field: string) => ({ [field]: { contains: query, mode: 'insensitive' as const } });
    const contains = (field: string) => ({ [field]: { contains: query } });

    const [customers, leads, projects] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          OR: [
            containsInsensitive('name'),
            containsInsensitive('contactName'),
            contains('phone'),
            containsInsensitive('email'),
          ],
        },
        take: 10,
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.prisma.lead.findMany({
        where: {
          OR: [
            containsInsensitive('fullName'),
            containsInsensitive('firstName'),
            containsInsensitive('lastName'),
            contains('phone'),
            containsInsensitive('email'),
            containsInsensitive('company'),
          ],
        },
        take: 10,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.project.findMany({
        where: {
          OR: [
            containsInsensitive('name'),
            containsInsensitive('contactName'),
            contains('contactPhone'),
            containsInsensitive('address'),
            containsInsensitive('city'),
          ],
        },
        include: {
          customer: { select: { id: true, name: true, city: true, contactName: true, phone: true, email: true } },
        },
        take: 10,
        orderBy: [{ updatedAt: 'desc' }],
      }),
    ]);

    return {
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        contactName: c.contactName,
        phone: c.phone,
        email: c.email,
        city: c.city,
      })),
      leads: leads.map((l) => ({
        id: l.id,
        name: l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim() || l.company || 'ליד',
        contactName: l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim() || null,
        phone: l.phone,
        email: l.email,
        city: l.city,
        company: l.company,
      })),
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        contactName: p.contactName || p.customer?.contactName || null,
        phone: p.contactPhone || p.customer?.phone || null,
        email: p.customer?.email || null,
        city: p.city || p.customer?.city || null,
        customerName: p.customer?.name || null,
      })),
    };
  }
}

