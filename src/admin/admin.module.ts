import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/jwt-auth.guard';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';

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

  @Get('clientes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as any)
  listarClientes() { return this.adminService.listarClientes(); }
}

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
