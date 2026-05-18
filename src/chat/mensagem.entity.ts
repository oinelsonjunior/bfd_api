import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Servico } from '../servicos/servico.entity';

@Entity('mensagens')
export class Mensagem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Servico, { onDelete: 'CASCADE' })
  servico: Servico;

  @Column()
  servicoId: string;

  @ManyToOne(() => User, { eager: true })
  remetente: User;

  @Column()
  remetenteId: string;

  @Column({ type: 'text' })
  conteudo: string;

  @Column({ type: 'enum', enum: ['texto', 'imagem'], default: 'texto' })
  tipo: 'texto' | 'imagem';

  @Column({ default: false })
  lida: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
