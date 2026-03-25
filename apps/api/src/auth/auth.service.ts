import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim();
    const user = await this.prisma.user.findFirst({
      where: { email, status: UserStatus.ACTIVE },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _passwordOmit, ...safe } = user;
    void _passwordOmit;

    return {
      ...safe,
      token: {
        id: safe.id,
        name: safe.name,
        role: safe.role,
        email: safe.email,
      },
    };
  }
}
