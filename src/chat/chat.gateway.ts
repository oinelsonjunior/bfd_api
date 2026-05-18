import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Mensagem } from './mensagem.entity';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    @InjectRepository(Mensagem) private mensagemRepo: Repository<Mensagem>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      this.connectedUsers.set(client.id, payload.sub);
      console.log(`[Chat] Usuário ${payload.sub} conectado`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('entrar-sala')
  handleEntrarSala(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { servicoId: string },
  ) {
    client.join(`servico-${data.servicoId}`);
  }

  @SubscribeMessage('enviar-mensagem')
  async handleMensagem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { servicoId: string; conteudo: string },
  ) {
    const remetenteId = this.connectedUsers.get(client.id);
    if (!remetenteId) return;

    const mensagem = await this.mensagemRepo.save(
      this.mensagemRepo.create({
        servicoId: data.servicoId,
        remetenteId,
        conteudo: data.conteudo,
        tipo: 'texto',
      }),
    );

    // Recarregar com relações
    const mensagemCompleta = await this.mensagemRepo.findOne({
      where: { id: mensagem.id },
      relations: ['remetente'],
    });

    // Emitir para todos na sala (incluindo o remetente)
    this.server
      .to(`servico-${data.servicoId}`)
      .emit('nova-mensagem', mensagemCompleta);
  }
}
