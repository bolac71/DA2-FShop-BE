/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/constants/role.enum';
import { ROLES_KEY } from 'src/decorators/roles.decorator';
import type { JwtPayload } from 'src/strategies/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get authenticated user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new HttpException('User not found in request', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Check if user has one of the required roles
    if (!requiredRoles.includes(user.role)) {
      throw new HttpException('You do not have permission to access this resource', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
