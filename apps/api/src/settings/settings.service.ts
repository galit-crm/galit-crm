import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertManager(user?: { id?: string; role?: string }) {
    const role = (user?.role || '').toUpperCase();
    if (!role) throw new UnauthorizedException('Missing role');
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException();
  }

  async get(key: string, user?: { id?: string; role?: string }) {
    this.assertManager(user);
    return this.prisma.systemSetting.findUnique({ where: { key } });
  }

  async upsert(key: string, value: any, user?: { id?: string; role?: string }) {
    this.assertManager(user);
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

