// ── Service ───────────────────────────────────────────────────────────────
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoServico } from './tipo-servico.entity';

export class CreateTipoServicoDto {
  codigo: string;
  nome: string;
  descricao?: string;
  precoBase: number;
  horasMinimas?: number;
  horasMaximas?: number;
  icone?: string;
}

export class UpdateTipoServicoDto {
  nome?: string;
  descricao?: string;
  precoBase?: number;
  horasMinimas?: number;
  horasMaximas?: number;
  ativo?: boolean;
  icone?: string;
}

@Injectable()
export class TipoServicoService {
  constructor(
    @InjectRepository(TipoServico) private repo: Repository<TipoServico>,
  ) {}

  listar(): Promise<TipoServico[]> {
    return this.repo.find({ where: { ativo: true }, order: { nome: 'ASC' } });
  }

  listarTodos(): Promise<TipoServico[]> {
    return this.repo.find({ order: { nome: 'ASC' } });
  }

  async buscarPorId(id: string): Promise<TipoServico> {
    const tipo = await this.repo.findOne({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de serviço não encontrado');
    return tipo;
  }

  async buscarPorCodigo(codigo: string): Promise<TipoServico> {
    const tipo = await this.repo.findOne({ where: { codigo } });
    if (!tipo) throw new NotFoundException(`Tipo "${codigo}" não encontrado`);
    return tipo;
  }

  criar(dto: CreateTipoServicoDto): Promise<TipoServico> {
    const tipo = this.repo.create(dto);
    return this.repo.save(tipo);
  }

  async atualizar(id: string, dto: UpdateTipoServicoDto): Promise<TipoServico> {
    const tipo = await this.buscarPorId(id);
    Object.assign(tipo, dto);
    return this.repo.save(tipo);
  }

  async remover(id: string): Promise<void> {
    await this.buscarPorId(id);
    await this.repo.delete(id);
  }

  // Seed dos tipos padrão
  async seed(): Promise<void> {
    const count = await this.repo.count();
    if (count > 0) return;

    const tipos = [
      { codigo: 'limpeza_basica', nome: 'Limpeza Básica', descricao: 'Limpeza geral da casa', precoBase: 45, horasMinimas: 2, horasMaximas: 6, icone: 'home' },
      { codigo: 'limpeza_completa', nome: 'Limpeza Completa', descricao: 'Limpeza profunda de todos os cômodos', precoBase: 55, horasMinimas: 4, horasMaximas: 12, icone: 'sparkles' },
      { codigo: 'limpeza_pos_obra', nome: 'Limpeza Pós-Obra', descricao: 'Limpeza especializada após reformas', precoBase: 70, horasMinimas: 6, horasMaximas: 12, icone: 'construct' },
      { codigo: 'passar_roupa', nome: 'Passar Roupa', descricao: 'Serviço de passar roupas', precoBase: 35, horasMinimas: 2, horasMaximas: 8, icone: 'shirt' },
      { codigo: 'organizar', nome: 'Organização', descricao: 'Organização de ambientes e armários', precoBase: 50, horasMinimas: 2, horasMaximas: 8, icone: 'filing' },
    ];

    await this.repo.save(this.repo.create(tipos));
    console.log('[Seed] Tipos de serviço criados!');
  }
}
