import {
  Injectable, ConflictException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { RegisterDto } from './auth.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
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

    // Enviar e-mail de boas-vindas (não bloqueia o cadastro)
    if (dto.role === 'cliente') {
      this.emailService.enviarBoasVindas(dto.email, dto.nome).catch(err =>
        console.error('[Email] Erro ao enviar boas-vindas:', err)
      );
    }

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
    if (!user) return;

    // Gerar token simples (em produção usar crypto + salvar no banco)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    this.emailService.enviarRecuperacaoSenha(email, token).catch(err =>
      console.error('[Email] Erro ao enviar recuperação:', err)
    );
  }

  async resetPassword(token: string, novaSenha: string): Promise<void> {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [userId, timestamp] = decoded.split(':');
      const agora = Date.now();
      const expiracao = 60 * 60 * 1000; // 1 hora

      if (agora - parseInt(timestamp) > expiracao) {
        throw new UnauthorizedException('Token expirado');
      }

      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new UnauthorizedException('Token inválido');

      user.senha = await bcrypt.hash(novaSenha, 12);
      await this.userRepo.save(user);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
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
