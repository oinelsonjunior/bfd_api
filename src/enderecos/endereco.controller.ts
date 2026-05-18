import {
  Controller, Get, Post, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Endereco } from './endereco.entity';
import { JwtAuthGuard, CurrentUser } from '../common/guards/jwt-auth.guard';

class CriarEnderecoDto {
  apelido: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude?: number;
  longitude?: number;
}

@Controller('enderecos')
@UseGuards(JwtAuthGuard)
export class EnderecoController {
  constructor(
    @InjectRepository(Endereco) private enderecoRepo: Repository<Endereco>,
  ) {}

  @Get()
  listar(@CurrentUser() user) {
    return this.enderecoRepo.find({ where: { userId: user.id } });
  }

  @Post()
  criar(@CurrentUser() user, @Body() dto: CriarEnderecoDto) {
    const endereco = this.enderecoRepo.create({ ...dto, userId: user.id });
    return this.enderecoRepo.save(endereco);
  }

  @Delete(':id')
  async remover(@Param('id') id: string, @CurrentUser() user) {
    await this.enderecoRepo.delete({ id, userId: user.id });
    return { success: true };
  }
}
