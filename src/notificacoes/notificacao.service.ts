import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PushToken, Plataforma } from './push-token.entity';
import { User } from '../users/user.entity';
import * as admin from 'firebase-admin';

export interface EnviarPushDto {
  userId: string;
  titulo: string;
  corpo: string;
  dados?: Record<string, string>;
}

@Injectable()
export class NotificacaoService implements OnModuleInit {
  private readonly logger = new Logger(NotificacaoService.name);
  private firebaseOk = false;

  constructor(
    @InjectRepository(PushToken) private pushTokenRepo: Repository<PushToken>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    // Evita inicializar duas vezes em watch mode
    if (admin.apps.length > 0) {
      this.firebaseOk = true;
      return;
    }

    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT não configurado — push desativado.');
      return;
    }

    try {
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.firebaseOk = true;
      this.logger.log('Firebase Admin inicializado.');
    } catch (err) {
      this.logger.error('Erro ao inicializar Firebase Admin:', err);
    }
  }

  // ── Salvar / atualizar token de um usuário ─────────────────────────────────
  async salvarToken(userId: string, token: string, plataforma: Plataforma): Promise<void> {
    // Upsert: um usuário pode ter apenas um token por plataforma
    const existente = await this.pushTokenRepo.findOne({
      where: { userId, plataforma },
    });

    if (existente) {
      existente.token = token;
      await this.pushTokenRepo.save(existente);
    } else {
      await this.pushTokenRepo.save(
        this.pushTokenRepo.create({ userId, token, plataforma }),
      );
    }
  }

  // ── Remover token (logout) ─────────────────────────────────────────────────
  async removerToken(userId: string, token: string): Promise<void> {
    await this.pushTokenRepo.delete({ userId, token });
  }

  // ── Enviar push para um usuário específico ────────────────────────────────
  async enviarParaUsuario(dto: EnviarPushDto): Promise<void> {
    if (!this.firebaseOk) return;

    const tokens = await this.pushTokenRepo.find({ where: { userId: dto.userId } });
    if (!tokens.length) return;

    await Promise.allSettled(
      tokens.map(({ token }) => this.enviarMensagem(token, dto.titulo, dto.corpo, dto.dados)),
    );
  }

  // ── Enviar push para todos os usuários de um role ─────────────────────────
  async enviarParaRole(
    role: 'cliente' | 'diarista',
    titulo: string,
    corpo: string,
    dados?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseOk) return;

    const usuarios = await this.userRepo.find({ where: { role, ativo: true } });
    const userIds = usuarios.map(u => u.id);
    if (!userIds.length) return;

    const tokens = await this.pushTokenRepo
      .createQueryBuilder('pt')
      .where('pt.userId IN (:...userIds)', { userIds })
      .getMany();

    await Promise.allSettled(
      tokens.map(({ token }) => this.enviarMensagem(token, titulo, corpo, dados)),
    );
  }

  // ── Núcleo: envia uma mensagem FCM e trata token inválido ─────────────────
  private async enviarMensagem(
    token: string,
    titulo: string,
    corpo: string,
    dados?: Record<string, string>,
  ): Promise<void> {
    try {
      await admin.messaging().send({
        token,
        notification: { title: titulo, body: corpo },
        data: dados ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    } catch (err: any) {
      // Token expirado ou inválido — remove do banco
      const tokenInvalido =
        err?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
        err?.errorInfo?.code === 'messaging/invalid-registration-token';

      if (tokenInvalido) {
        await this.pushTokenRepo.delete({ token });
        this.logger.warn(`Token inválido removido: ${token.slice(0, 20)}...`);
      } else {
        this.logger.error(`Erro ao enviar push para ${token.slice(0, 20)}...:`, err?.errorInfo?.code);
      }
    }
  }
}
