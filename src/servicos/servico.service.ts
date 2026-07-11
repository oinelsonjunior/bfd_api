import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servico, StatusServico, TipoServico } from './servico.entity';
import { User } from '../users/user.entity';
import { Endereco } from '../enderecos/endereco.entity';
import { NotificacaoService } from '../notificacoes/notificacao.service';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CriarServicoDto {
  @IsString() tipo: string;
  @IsOptional() @IsString() descricao?: string;
  @IsString() enderecoId: string;
  @IsString() dataAgendada: any;
  @IsNumber() horasEstimadas: number;
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
    private notificacaoService: NotificacaoService,
  ) {}

  async criar(clienteId: string, dto: CriarServicoDto): Promise<Servico> {
    const endereco = await this.enderecoRepo.findOne({
      where: { id: dto.enderecoId, userId: clienteId },
    });
    if (!endereco) throw new NotFoundException('Endereço não encontrado');

    const valorHora = 45;
    const valorTotal = valorHora * dto.horasEstimadas;

    const servico = this.servicoRepo.create({
      clienteId,
      tipo: dto.tipo as TipoServico,
      descricao: dto.descricao,
      enderecoId: dto.enderecoId,
      dataAgendada: dto.dataAgendada,
      horasEstimadas: dto.horasEstimadas,
      valorHora,
      valorTotal,
      status: 'aguardando',
    });

    return salvo;
  }

  async disponiveis(diaristaId: string): Promise<Servico[]> {
    const diarista = await this.userRepo.findOne({ where: { id: diaristaId } });
    if (!diarista?.documentoVerificado) {
      throw new ForbiddenException('Sua conta ainda não foi aprovada pelo administrador.');
    }
    return this.servicoRepo.find({
      where: { status: 'aguardando' },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async aceitar(id: string, diaristaId: string): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    if (servico.status !== 'aguardando')
      throw new BadRequestException('Serviço não está disponível para aceitar');

    const diarista = await this.userRepo.findOne({ where: { id: diaristaId } });
    if (diarista?.valorHora) {
      servico.valorHora = Number(diarista.valorHora);
      servico.valorTotal = servico.valorHora * servico.horasEstimadas;
    }

    servico.diaristaId = diaristaId;
    servico.status = 'aceito';
    const salvo = await this.servicoRepo.save(servico);

    this.notificacaoService.enviarParaUsuario({
      userId: servico.clienteId,
      titulo: 'Diarista a caminho!',
      corpo: `${diarista?.nome ?? 'Sua diarista'} aceitou o serviço.`,
      dados: { tipo: 'servico_aceito', servicoId: id },
    }).catch(() => {});

    return salvo;
  }

  async aCaminho(id: string, diaristaId: string): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    this.verificarDiarista(servico, diaristaId);
    if (servico.status !== 'aceito')
      throw new BadRequestException('Status inválido para a caminho');
    servico.status = 'a_caminho';
    return this.servicoRepo.save(servico);
  }

  async iniciar(id: string, diaristaId: string): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    this.verificarDiarista(servico, diaristaId);
    if (servico.status !== 'aceito' && servico.status !== 'a_caminho')
      throw new BadRequestException('Status inválido para iniciar');
    servico.status = 'em_andamento';
    const salvo = await this.servicoRepo.save(servico);

    this.notificacaoService.enviarParaUsuario({
      userId: servico.clienteId,
      titulo: 'Serviço iniciado!',
      corpo: 'A diarista chegou e está trabalhando.',
      dados: { tipo: 'servico_iniciado', servicoId: id },
    }).catch(() => {});

    return salvo;
  }

  async concluir(id: string, diaristaId: string): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    this.verificarDiarista(servico, diaristaId);
    if (servico.status !== 'em_andamento')
      throw new BadRequestException('Serviço não está em andamento');
    servico.status = 'concluido';
    await this.userRepo.increment({ id: diaristaId }, 'servicosRealizados', 1);
    const salvo = await this.servicoRepo.save(servico);

    this.notificacaoService.enviarParaUsuario({
      userId: servico.clienteId,
      titulo: 'Serviço concluído!',
      corpo: 'Tudo limpo! Avalie a diarista.',
      dados: { tipo: 'servico_concluido', servicoId: id },
    }).catch(() => {});

    return salvo;
  }

  async cancelar(id: string, userId: string, motivo: string): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    const cancelaveis: StatusServico[] = ['aguardando', 'matching', 'aceito'];
    if (!cancelaveis.includes(servico.status))
      throw new BadRequestException('Serviço não pode ser cancelado neste status');
    servico.status = 'cancelado';
    servico.motivoCancelamento = motivo;
    return this.servicoRepo.save(servico);
  }

  async avaliar(id: string, clienteId: string, dto: AvaliarServicoDto): Promise<Servico> {
    const servico = await this.buscarPorId(id);
    if (servico.clienteId !== clienteId) throw new ForbiddenException();
    if (servico.status !== 'concluido') throw new BadRequestException('Serviço não concluído');
    if (servico.avaliacaoNota) throw new BadRequestException('Serviço já avaliado');
    if (dto.nota < 1 || dto.nota > 5) throw new BadRequestException('Nota deve ser entre 1 e 5');

    servico.avaliacaoNota = dto.nota;
    if (dto.comentario) servico.avaliacaoComentario = dto.comentario;
    const saved = await this.servicoRepo.save(servico);
    if (servico.diaristaId) await this.recalcularMedia(servico.diaristaId);
    return saved;
  }

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
