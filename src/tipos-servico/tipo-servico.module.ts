// ── Controller ────────────────────────────────────────────────────────────
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TipoServicoService, CreateTipoServicoDto, UpdateTipoServicoDto } from './tipo-servico.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/jwt-auth.guard';

// Rota pública — app lista os tipos disponíveis
@Controller('tipos-servico')
export class TipoServicoController {
  constructor(private service: TipoServicoService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get('todos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listarTodos() {
    return this.service.listarTodos();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  criar(@Body() dto: CreateTipoServicoDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  atualizar(@Param('id') id: string, @Body() dto: UpdateTipoServicoDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remover(@Param('id') id: string) {
    return this.service.remover(id);
  }
}

// ── Module ────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoServico } from './tipo-servico.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TipoServico])],
  controllers: [TipoServicoController],
  providers: [TipoServicoService],
  exports: [TipoServicoService],
})
export class TipoServicoModule {}
