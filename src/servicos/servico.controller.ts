import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ServicoService, CriarServicoDto, AvaliarServicoDto } from './servico.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/jwt-auth.guard';

@Controller('servicos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicoController {
  constructor(private servicoService: ServicoService) {}

  // ── Cliente ────────────────────────────────────────────────────────────────
  @Post()
  @Roles('cliente')
  criar(@CurrentUser() user, @Body() dto: CriarServicoDto) {
    return this.servicoService.criar(user.id, dto);
  }

  @Get('historico')
  @Roles('cliente')
  historico(
    @CurrentUser() user,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.servicoService.historicoCliente(user.id, page, limit);
  }

  @Patch(':id/cancelar')
  @Roles('cliente')
  cancelar(@Param('id') id: string, @CurrentUser() user, @Body('motivo') motivo: string) {
    return this.servicoService.cancelar(id, user.id, motivo ?? 'Cancelado pelo cliente');
  }

  @Post(':id/avaliar')
  @Roles('cliente')
  avaliar(@Param('id') id: string, @CurrentUser() user, @Body() dto: AvaliarServicoDto) {
    return this.servicoService.avaliar(id, user.id, dto);
  }

  // ── Diarista ───────────────────────────────────────────────────────────────
  @Get('disponiveis')
  @Roles('diarista')
  disponiveis(@CurrentUser() user) {
    return this.servicoService.disponiveis(user.id);
  }

  @Get('meus')
  @Roles('diarista')
  meus(
    @CurrentUser() user,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.servicoService.meusServicos(user.id, page, limit);
  }

  @Patch(':id/aceitar')
  @Roles('diarista')
  aceitar(@Param('id') id: string, @CurrentUser() user) {
    return this.servicoService.aceitar(id, user.id);
  }

  @Patch(':id/a-caminho')
  @Roles('diarista')
  aCaminho(@Param('id') id: string, @CurrentUser() user) {
    return this.servicoService.aCaminho(id, user.id);
  }

  @Patch(':id/iniciar')
  @Roles('diarista')
  iniciar(@Param('id') id: string, @CurrentUser() user) {
    return this.servicoService.iniciar(id, user.id);
  }

  @Patch(':id/concluir')
  @Roles('diarista')
  concluir(@Param('id') id: string, @CurrentUser() user) {
    return this.servicoService.concluir(id, user.id);
  }

  // ── Compartilhado ──────────────────────────────────────────────────────────
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.servicoService.buscarPorId(id);
  }
}
