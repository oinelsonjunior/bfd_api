import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Servico } from '../servicos/servico.entity';
import { Pagamento } from '../pagamentos/pagamento.entity';

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

  async dashboard() {
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

    return { totalClientes, totalDiaristas, diaristasNaoAprovadas, totalServicos, servicosConcluidos, receitaTotal };
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

  async enviarPushGeral(titulo: string, mensagem: string, role: string) {
    return this.notificacaoService.enviarParaRole(
      role as any,
      titulo,
      mensagem,
      { tipo: 'admin_push' },
    );
  }
}
