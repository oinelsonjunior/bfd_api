import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PagamentoService, ProcessarPagamentoDto } from './pagamento.service';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '../common/guards/jwt-auth.guard';

@Controller('pagamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagamentoController {
  constructor(private pagamentoService: PagamentoService) {}

  @Post()
  @Roles('cliente')
  processar(@CurrentUser() user, @Body() dto: ProcessarPagamentoDto) {
    return this.pagamentoService.processar(user.id, dto);
  }

  @Post('pix')
  @Roles('cliente')
  gerarPix(@CurrentUser() user, @Body('servicoId') servicoId: string) {
    return this.pagamentoService.gerarPix(user.id, servicoId);
  }

  @Get('cartoes')
  @Roles('cliente')
  listarCartoes(@CurrentUser() user) {
    return this.pagamentoService.listarCartoes(user.id);
  }

  @Get()
  historico(@CurrentUser() user) {
    return this.pagamentoService.historico(user.id);
  }
}
