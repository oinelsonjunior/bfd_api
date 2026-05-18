import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AdminService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

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

  listarClientes(): Promise<User[]> {
    return this.userRepo.find({ where: { role: 'cliente' }, order: { createdAt: 'DESC' } });
  }

  async dashboard() {
    const [totalClientes, totalDiaristas, diaristasNaoAprovadas] = await Promise.all([
      this.userRepo.count({ where: { role: 'cliente' } }),
      this.userRepo.count({ where: { role: 'diarista', documentoVerificado: true } }),
      this.userRepo.count({ where: { role: 'diarista', documentoVerificado: false } }),
    ]);
    return { totalClientes, totalDiaristas, diaristasNaoAprovadas };
  }

  async criarAdmin(email: string, senha: string, secret: string): Promise<User> {
    if (secret !== process.env.ADMIN_SECRET) throw new ForbiddenException('Secret inválido');
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(senha, 12);
    const admin = this.userRepo.create({ nome: 'Administrador', email, senha: hash, telefone: '00000000000', role: 'admin' as any, ativo: true });
    return this.userRepo.save(admin);
  }
}
