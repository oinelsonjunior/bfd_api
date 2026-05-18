import {
  Controller, Get, Post, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Endereco } from './endereco.entity';
import { JwtAuthGuard, CurrentUser } from '../common/guards/jwt-auth.guard';

export class CriarEnderecoDto {
  @IsString() apelido: string;
  @IsString() cep: string;
  @IsString() logradouro: string;
  @IsString() numero: string;
  @IsOptional() @IsString() complemento?: string;
  @IsString() bairro: string;
  @IsString() cidade: string;
  @IsString() estado: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

@Controller('enderecos')
@UseGuards(JwtAuthGuard)
export class EnderecoController {
  constructor(
    @InjectRepository(Endereco) private enderecoRepo: Repository<Endereco>,
  ) {}

  @Get()
  listar(@CurrentUser() user: any) {
    return this.enderecoRepo.find({ where: { userId: user.id } });
  }

  @Post()
  criar(@CurrentUser() user: any, @Body() dto: CriarEnderecoDto) {
    const endereco = this.enderecoRepo.create({ ...dto, userId: user.id });
    return this.enderecoRepo.save(endereco);
  }

  @Delete(':id')
  async remover(@Param('id') id: string, @CurrentUser() user: any) {
    await this.enderecoRepo.delete({ id, userId: user.id });
    return { success: true };
  }
}
