import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

// ── JWT Strategy ──────────────────────────────────────────────────────────
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}

// ── Local Strategy (login com email+senha) ────────────────────────────────
@Injectable()
export class LocalAuthStrategy extends PassportStrategy(LocalStrategy, 'local') {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'senha' });
  }

  async validate(email: string, senha: string) {
    const user = await this.authService.validateUser(email, senha);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    return user;
  }
}