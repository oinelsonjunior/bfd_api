import {
  Injectable, ConflictException, UnauthorizedException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, senha: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email, ativo: true } });
    if (!user) return null;
    const valid = await bcrypt.compare(senha, user.senha);
    return valid ? user : null;
  }

  async login(user: User) {
    return this.gerarTokens(user);
  }

  async register(dto: RegisterDto) {
    const existe = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existe) throw new ConflictException('E-mail já cadastrado');

    const hash = await bcrypt.hash(dto.senha, 12);
    const user = this.userRepo.create({ ...dto, senha: hash });
    await this.userRepo.save(user);
    return this.gerarTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      return this.gerarTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return; // Silencioso por segurança
    // TODO: integrar com serviço de e-mail (Nodemailer, SendGrid, etc.)
    // Gerar token temporário e enviar e-mail com link de reset
    console.log(`[Auth] Reset de senha solicitado para: ${email}`);
  }

  private async gerarTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
    });

    const { senha, ...userSemSenha } = user;
    return { accessToken, refreshToken, user: userSemSenha };
  }
}
