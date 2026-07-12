import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Servico } from '../servicos/servico.entity';
import { Pagamento } from '../pagamentos/pagamento.entity';
import { NotificacaoService } from '../notificacoes/notificacao.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Servico) private servicoRepo: Repository<Servico>,
    @InjectRepository(Pagamento) private pagamentoRepo: Repository<Pagamento>,
    private notificacaoService: NotificacaoService,
    private uploadService: UploadService,
  ) {}

  listarDiaristas(aprovadas?: boolean): Promise<User[]> {
    const where: any = { role: 'diarista' };
    if (aprovadas !== undefined) where.documentoVerificado = aprovadas;
    return this.userRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async aprovarDiarista(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id, role: 'diarista' } });
    if (!user) throw new NotFoundException('Diarista não encontrada');
    user.documentoVerificado = true;
    user.disponivel = true;
    return this.userRepo.save(user);
  }

  async reprovarDiarista(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id, role: 'diarista' } });
    if (!user) throw new NotFoundException('Diarista não encontrada');
    user.documentoVerificado = false;
    user.disponivel = false;
    user.ativo = false;
    return this.userRepo.save(user);
  }

  async bloquearUsuario(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    user.ativo = false;
    return this.userRepo.save(user);
  }

  async desbloquearUsuario(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    user.ativo = true;
    return this.userRepo.save(user);
  }

  listarClientes(): Promise<User[]> {
    return this.userRepo.find({ where: { role: 'cliente' }, order: { createdAt: 'DESC' } });
  }

  listarServicos(): Promise<Servico[]> {
    return this.servicoRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async dashboard(dataInicio?: string, dataFim?: string) {
    const [totalClientes, totalDiaristas, diaristasNaoAprovadas, totalServicos, servicosConcluidos] = await Promise.all([
      this.userRepo.count({ where: { role: 'cliente' } }),
      this.userRepo.count({ where: { role: 'diarista', documentoVerificado: true } }),
      this.userRepo.count({ where: { role: 'diarista', documentoVerificado: false } }),
      this.servicoRepo.count(),
      this.servicoRepo.count({ where: { status: 'concluido' } }),
    ]);

    const receitaResult = await this.servicoRepo
      .createQueryBuilder('s')
      .select('SUM(s.valorTotal)', 'total')
      .where('s.status = :status', { status: 'concluido' })
      .getRawOne();

    const receitaTotal = parseFloat(receitaResult?.total ?? '0');
    const servicosAtivos = await this.servicoRepo.count({ where: [{ status: 'matching' as any }, { status: 'aceito' as any }, { status: 'a_caminho' as any }, { status: 'em_andamento' as any }]});
    const ultimosServicos = await this.servicoRepo.find({ order: { createdAt: 'DESC' }, take: 10, relations: ['cliente'] });
    return { totalClientes, totalDiaristas, diaristasPendentes: diaristasNaoAprovadas, totalServicos, servicosConcluidos, servicosAtivos, receitaTotal, ultimosServicos };
  }

  async uploadFotoDiarista(id: string, base64: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id, role: 'diarista' } });
    if (!user) throw new NotFoundException('Diarista não encontrada');
    const url = await this.uploadService.uploadFoto(base64, 'diaristas');
    user.fotoPerfil = url;
    return this.userRepo.save(user);
  }

  async criarAdmin(email: string, senha: string, secret: string): Promise<User> {
    if (secret !== process.env.ADMIN_SECRET) throw new ForbiddenException('Secret inválido');
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(senha, 12);
    const admin = this.userRepo.create({ nome: 'Administrador', email, senha: hash, telefone: '00000000000', role: 'admin' as any, ativo: true });
    return this.userRepo.save(admin);
  }

  async servicosCliente(clienteId: string) {
    return this.servicoRepo.find({
      where: { clienteId },
      order: { createdAt: 'DESC' },
      relations: ['diarista', 'endereco'],
    });
  }

  async servicosDiarista(diaristaId: string) {
    return this.servicoRepo.find({
      where: { diaristaId },
      order: { createdAt: 'DESC' },
      relations: ['cliente', 'endereco'],
    });
  }

  async pagamentos() {
    return this.pagamentoRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['servico'],
    });
  }

  async cancelarServico(id: string) {
    const servico = await this.servicoRepo.findOne({ where: { id } });
    if (!servico) throw new Error('Serviço não encontrado');
    servico.status = 'cancelado' as any;
    return this.servicoRepo.save(servico);
  }

  async financeiro(dataInicio?: string, dataFim?: string) {
    const servicoWhere: any = { status: 'concluido' as any };
    if (dataInicio) servicoWhere.createdAt = servicoWhere.createdAt ?? {};
    
    const query = this.servicoRepo.createQueryBuilder('s')
      .where('s.status = :status', { status: 'concluido' });
    if (dataInicio) query.andWhere('s.createdAt >= :inicio', { inicio: new Date(dataInicio) });
    if (dataFim) query.andWhere('s.createdAt <= :fim', { fim: new Date(dataFim + 'T23:59:59') });

    const [servicos, totalResult, cancelados] = await Promise.all([
      query.leftJoinAndSelect('s.diarista', 'diarista').getMany(),
      query.clone().select('SUM(s.valorTotal)', 'total').addSelect('COUNT(s.id)', 'count').getRawOne(),
      this.servicoRepo.createQueryBuilder('s')
        .where('s.status = :status', { status: 'cancelado' })
        .getCount(),
    ]);

    const receitaBruta = parseFloat(totalResult?.total ?? '0');
    const totalServicos = parseInt(totalResult?.count ?? '0');
    const comissaoPlataforma = receitaBruta * 0.18;
    const repasseDiaristas = receitaBruta * 0.82;
    const ticketMedio = totalServicos > 0 ? receitaBruta / totalServicos : 0;

    // Agrupamento por diarista
    const porDiarista = servicos.reduce((acc: any, s) => {
      const nome = s.diarista?.nome ?? 'Sem diarista';
      const id = s.diaristaId ?? 'sem-id';
      if (!acc[id]) acc[id] = { nome, totalServicos: 0, receitaGerada: 0, repasse: 0 };
      acc[id].totalServicos++;
      acc[id].receitaGerada += Number(s.valorTotal);
      acc[id].repasse += Number(s.valorTotal) * 0.82;
      return acc;
    }, {});

    // Agrupamento por tipo
    const porTipo = servicos.reduce((acc: any, s) => {
      if (!acc[s.tipo]) acc[s.tipo] = { tipo: s.tipo, totalServicos: 0, receita: 0 };
      acc[s.tipo].totalServicos++;
      acc[s.tipo].receita += Number(s.valorTotal);
      return acc;
    }, {});

    return {
      receitaBruta, comissaoPlataforma, repasseDiaristas,
      totalServicos, ticketMedio, cancelados,
      taxaCancelamento: totalServicos > 0 ? (cancelados / (totalServicos + cancelados) * 100).toFixed(1) : '0',
      porDiarista: Object.values(porDiarista).sort((a: any, b: any) => b.receitaGerada - a.receitaGerada),
      porTipo: Object.values(porTipo).sort((a: any, b: any) => b.receita - a.receita),
    };
  }

  async cancelamentos(dataInicio?: string, dataFim?: string) {
    const query = this.servicoRepo.createQueryBuilder('s')
      .where('s.status = :status', { status: 'cancelado' })
      .leftJoinAndSelect('s.cliente', 'cliente')
      .leftJoinAndSelect('s.diarista', 'diarista')
      .orderBy('s.updatedAt', 'DESC');
    if (dataInicio) query.andWhere('s.updatedAt >= :inicio', { inicio: new Date(dataInicio) });
    if (dataFim) query.andWhere('s.updatedAt <= :fim', { fim: new Date(dataFim + 'T23:59:59') });
    return query.getMany();
  }

  async relatorioServicos() {
    const servicos = await this.servicoRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['cliente', 'diarista', 'endereco'],
    });
    return servicos.map(s => ({
      id: s.id,
      data: s.createdAt,
      tipo: s.tipo,
      status: s.status,
      cliente: s.cliente?.nome ?? '',
      diarista: s.diarista?.nome ?? '',
      endereco: s.endereco ? `${s.endereco.logradouro}, ${s.endereco.numero} - ${s.endereco.cidade}/${s.endereco.estado}` : '',
      valorTotal: s.valorTotal,
      horasEstimadas: s.horasEstimadas,
    }));
  }

  async relatorioPagamentos() {
    const pagamentos = await this.pagamentoRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['servico'],
    });
    return pagamentos.map(p => ({
      id: p.id,
      data: p.createdAt,
      metodo: p.metodo,
      status: p.status,
      valor: p.valor,
      gatewayId: p.gatewayId,
      servicoId: p.servicoId,
    }));
  }

  async avaliacoes() {
    return this.servicoRepo.find({
      where: [{ avaliacaoNota: 1 }, { avaliacaoNota: 2 }, { avaliacaoNota: 3 }, { avaliacaoNota: 4 }, { avaliacaoNota: 5 }],
      order: { updatedAt: 'DESC' },
      relations: ['cliente', 'diarista'],
    });
  }

  async enviarPushGeral(titulo: string, mensagem: string, role: string) {
    return this.notificacaoService.enviarParaRole(
      role as any,
      titulo,
      mensagem,
      { tipo: 'admin_push' },
    );
  }
}
