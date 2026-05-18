import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
type UserRole = 'cliente' | 'diarista';

// Guard JWT padrão
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// Guard por Role
export const ROLES_KEY = 'roles';
import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Acesso negado para este perfil');
    }
    return true;
  }
}

// Decorator para pegar o usuário atual
import { createParamDecorator } from '@nestjs/common';
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);
