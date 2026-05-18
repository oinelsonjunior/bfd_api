import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servico, StatusServico, TipoServico } from './servico.entity';
import { User } from '../users/user.entity';
import { Endereco } from '../enderecos/endereco.entity';

import { IsString, IsDateString, IsNumber, IsOptional } from "class-validator";
export class CriarServicoDto {
  tipo: TipoServico;
  descricao?: string;
  enderecoId: string;
  dataAgendada: Date;
  horasEstimadas: number;
}

export class AvaliarServicoDto {
  nota: number;
  comentario?: string;
}

@Injectable()
export class ServicoService {
  constructor(
    @InjectRepository(Servico) private servicoRepo: Repository<Servico>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Endereco) private enderecoRepo: Repository<Endereco>,
  ) {}

  // ── Cliente: solicitar ────────────────────────────────────────────────────
  async criar(clienteId: string, dto: CriarServicoDto): Promise<Servico> {
    const endereco = await this.enderecoRepo.findOne({
      where: { id: dto.enderecoId, userId: clienteId },
    });
    if (!endereco) throw new NotFoundException('Endereço não encontrado');

    // Valor base: R$ 45/h (ajustar conforme regra de negócio)
    const valorHora = 45;
    const valorTotal = valorHora * dto.horasEstimadas;

    const servico = this.servicoRepo.create({
      clienteId,
      tipo: dto.tipo,
      descricao: dto.descricao,
      enderecoId: dto.enderecoId,
      dataAgendada: dto.dataAgendada,
      horasEstimadas: dto.horasEstimadas,
      valorHora,
      valorTotal,
      status: 'aguardando',
    });

    return this.servicoRepo.save(servico);
  }

  // ── Diarista: listar disponíveis ──────────────────────────────────────────
  async disponiveis(): Promise<Servico[]> {
    return this.servicoRepo.find({
      where: { status: 'aguardando' },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  // ── Diarista: aceitar ─────────────────────────────────────────────────────
  async aceitar(id: string, diaristaId: string): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    if (servico.status !== 'aguardando')
      throw new BadRequestException('Serviço não está disponível para aceitar');

    // Usar valorHora da diarista se disponível
    const diarista = await this.userRepo.findOne({ where: { id: diaristaId } });
    if (diarista?.valorHora) {
      servico.valorHora = Number(diarista.valorHora);
      servico.valorTotal = servico.valorHora * servico.horasEstimadas;
    }

    servico.diaristaId = diaristaId;
    servico.status = 'aceito';
    return this.servicoRepo.save(servico);
  }

  // ── Diarista: iniciar ─────────────────────────────────────────────────────
  async iniciar(id: string, diaristaId: string): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    this.verificarDiarista(servico, diaristaId);
    if (servico.status !== 'aceito' && servico.status !== 'a_caminho')
      throw new BadRequestException('Status inválido para iniciar');
    servico.status = 'em_andamento';
    return this.servicoRepo.save(servico);
  }

  // ── Diarista: concluir ────────────────────────────────────────────────────
  async concluir(id: string, diaristaId: string): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    this.verificarDiarista(servico, diaristaId);
    if (servico.status !== 'em_andamento')
      throw new BadRequestException('Serviço não está em andamento');
    servico.status = 'concluido';

    // Incrementar contador da diarista
    await this.userRepo.increment({ id: diaristaId }, 'servicosRealizados', 1);

    return this.servicoRepo.save(servico);
  }

  // ── Cliente: cancelar ─────────────────────────────────────────────────────
  async cancelar(id: string, userId: string, motivo: string): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    const cancelaveis: StatusServico[] = ['aguardando', 'matching', 'aceito'];
    if (!cancelaveis.includes(servico.status))
      throw new BadRequestException('Serviço não pode ser cancelado neste status');
    servico.status = 'cancelado';
    servico.motivoCancelamento = motivo;
    return this.servicoRepo.save(servico);
  }

  // ── Cliente: avaliar ──────────────────────────────────────────────────────
  async avaliar(id: string, clienteId: string, dto: AvaliarServicoDto): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    if (servico.clienteId !== clienteId) throw new ForbiddenException();
    if (servico.status !== 'concluido') throw new BadRequestException('Serviço não concluído');
    if (servico.avaliacaoNota) throw new BadRequestException('Serviço já avaliado');
    if (dto.nota < 1 || dto.nota > 5) throw new BadRequestException('Nota deve ser entre 1 e 5');

    servico.avaliacaoNota = dto.nota;
    if (dto.comentario) servico.avaliacaoComentario = dto.comentario;
    const saved = await this.servicoRepo.save(servico);

    // Recalcular média da diarista
    if (servico.diaristaId) await this.recalcularMedia(servico.diaristaId);

    return saved;
  }

  // ── Histórico ─────────────────────────────────────────────────────────────
  async historicoCliente(clienteId: string, page: number, limit: number) {
    const [data, total] = await this.servicoRepo.findAndCount({
      where: { clienteId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async meusServicos(diaristaId: string, page: number, limit: number) {
    const [data, total] = await this.servicoRepo.findAndCount({
      where: { diaristaId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async buscarPorId(id: string): Promise<Servico> {
    const servico = await this.servicoRepo.findOne({ where: { id } });
    if (!servico) throw new NotFoundException('Serviço não encontrado');
    return servico;
  }

  private verificarDiarista(servico: Servico, diaristaId: string) {
    if (servico.diaristaId !== diaristaId) throw new ForbiddenException('Acesso negado');
  }

  private async recalcularMedia(diaristaId: string): Promise<void> {
    const result = await this.servicoRepo
      .createQueryBuilder('s')
      .select('AVG(s.avaliacaoNota)', 'media')
      .addSelect('COUNT(*)', 'total')
      .where('s.diaristaId = :diaristaId AND s.avaliacaoNota IS NOT NULL', { diaristaId })
      .getRawOne();

    await this.userRepo.update(diaristaId, {
      avaliacaoMedia: parseFloat(result.media) || 0,
      totalAvaliacoes: parseInt(result.total) || 0,
    });
  }
}
