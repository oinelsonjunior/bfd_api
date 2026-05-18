import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mensagem } from './mensagem.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    @InjectRepository(Mensagem) private mensagemRepo: Repository<Mensagem>,
  ) {}

  @Get(':servicoId/mensagens')
  async historico(@Param('servicoId') servicoId: string) {
    return this.mensagemRepo.find({
      where: { servicoId },
      order: { createdAt: 'ASC' },
      relations: ['remetente'],
    });
  }

  @Patch(':servicoId/lidas')
  async marcarLidas(@Param('servicoId') servicoId: string) {
    await this.mensagemRepo.update({ servicoId }, { lida: true });
    return { success: true };
  }
}
