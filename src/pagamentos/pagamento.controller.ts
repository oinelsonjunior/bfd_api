import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PagamentoService, ProcessarPagamentoDto, GerarPixDto } from './pagamento.service';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '../common/guards/jwt-auth.guard';

@Controller('pagamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagamentoController {
  constructor(private pagamentoService: PagamentoService) {}

  @Post()
  @Roles('cliente')
  processar(@CurrentUser() user: { id: string }, @Body() dto: ProcessarPagamentoDto) {
    return this.pagamentoService.processar(user.id, dto);
  }

  @Post('pix')
  @Roles('cliente')
  gerarPix(@CurrentUser() user: { id: string }, @Body() dto: GerarPixDto) {
    return this.pagamentoService.gerarPix(user.id, dto);
  }

  @Get()
  historico(@CurrentUser() user: { id: string }) {
    return this.pagamentoService.historico(user.id);
  }

  @Post('webhook')
  async webhook(@Body() data: any) {
    await this.pagamentoService.processarWebhook(data);
    return { received: true };
  }
}
