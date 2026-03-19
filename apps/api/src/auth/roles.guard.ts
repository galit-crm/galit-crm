import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const headerRole = (request.headers['x-user-role'] ||
      request.headers['x-user-role'.toLowerCase()]) as string | undefined;
    const headerUserId = (request.headers['x-user-id'] ||
      request.headers['x-user-id'.toLowerCase()]) as string | undefined;

    if (!headerRole) {
      throw new UnauthorizedException('Missing x-user-role');
    }

    const role = headerRole.toUpperCase();
    request.user = { id: headerUserId, role };

    // ADMIN always has full access.
    if (role === 'ADMIN') {
      return true;
    }

    return requiredRoles.includes(role);
  }
}

