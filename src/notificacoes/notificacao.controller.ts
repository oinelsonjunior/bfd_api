import {
  Controller, Post, Delete, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { NotificacaoService } from './notificacao.service';
import { JwtAuthGuard, CurrentUser } from '../common/guards/jwt-auth.guard';
import { IsString, IsIn } from 'class-validator';

class SalvarTokenDto {
  @IsString() token: string;
  @IsIn(['ios', 'android', 'web']) plataforma: 'ios' | 'android' | 'web';
}

class RemoverTokenDto {
  @IsString() token: string;
}

@Controller('notificacoes')
@UseGuards(JwtAuthGuard)
export class NotificacaoController {
  constructor(private notificacaoService: NotificacaoService) {}

  // Chamado pelo PushService do app logo após o login
  @Post('push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async salvarToken(
    @CurrentUser() user: { id: string },
    @Body() dto: SalvarTokenDto,
  ): Promise<void> {
    await this.notificacaoService.salvarToken(user.id, dto.token, dto.plataforma);
  }

  // Chamado pelo PushService do app no logout
  @Delete('push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removerToken(
    @CurrentUser() user: { id: string },
    @Body() dto: RemoverTokenDto,
  ): Promise<void> {
    await this.notificacaoService.removerToken(user.id, dto.token);
  }
}
