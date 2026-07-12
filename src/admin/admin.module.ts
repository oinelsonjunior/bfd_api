import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/jwt-auth.guard';
import { Module } from '@nestjs/common';
import { NotificacaoModule } from '../notificacoes/notificacao.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Servico } from '../servicos/servico.entity';
import { Pagamento } from '../pagamentos/pagamento.entity';
import { UploadModule } from '../upload/upload.module';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('setup')
  setup(@Body() body: { email: string; senha: string; secret: string }) {
    return this.adminService.criarAdmin(body.email, body.senha, body.secret);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  dashboard() { return this.adminService.dashboard(); }

  @Get('diaristas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  listarDiaristas(@Query('aprovadas') aprovadas?: string) {
    if (aprovadas === 'true') return this.adminService.listarDiaristas(true);
    if (aprovadas === 'false') return this.adminService.listarDiaristas(false);
    return this.adminService.listarDiaristas();
  }

  @Patch('diaristas/:id/aprovar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  aprovar(@Param('id') id: string) { return this.adminService.aprovarDiarista(id); }

  @Patch('diaristas/:id/reprovar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  reprovar(@Param('id') id: string) { return this.adminService.reprovarDiarista(id); }

  @Post('diaristas/:id/foto')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  uploadFoto(@Param('id') id: string, @Body() body: { base64: string }) {
    return this.adminService.uploadFotoDiarista(id, body.base64);
  }

  @Patch('usuarios/:id/bloquear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  bloquear(@Param('id') id: string) { return this.adminService.bloquearUsuario(id); }

  @Patch('usuarios/:id/desbloquear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  desbloquear(@Param('id') id: string) { return this.adminService.desbloquearUsuario(id); }

  @Get('clientes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  listarClientes() { return this.adminService.listarClientes(); }

  @Get('pagamentos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  listarPagamentos() { return this.adminService.pagamentos(); }
  @Post('servicos/:id/cancelar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  cancelarServico(@Param('id') id: string) { return this.adminService.cancelarServico(id); }
  @Post('push')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  enviarPush(@Body() body: { titulo: string; mensagem: string; role: string }) { return this.adminService.enviarPushGeral(body.titulo, body.mensagem, body.role); }
  @Get('servicos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  listarServicos() { return this.adminService.listarServicos(); }
  @Get('clientes/:id/servicos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  servicosCliente(@Param('id') id: string) { return this.adminService.servicosCliente(id); }
  @Get('diaristas/:id/servicos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  servicosDiarista(@Param('id') id: string) { return this.adminService.servicosDiarista(id); }
}

@Module({
  imports: [TypeOrmModule.forFeature([User, Servico, Pagamento]),
    NotificacaoModule, UploadModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
