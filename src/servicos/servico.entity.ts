import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Endereco } from '../enderecos/endereco.entity';

export type TipoServico =
  | 'limpeza_basica'
  | 'limpeza_completa'
  | 'limpeza_pos_obra'
  | 'passar_roupa'
  | 'organizar';

export type StatusServico =
  | 'aguardando'
  | 'matching'
  | 'aceito'
  | 'a_caminho'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado';

@Entity('servicos')
export class Servico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  cliente: User;

  @Column()
  clienteId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  diarista: User;

  @Column({ nullable: true })
  diaristaId: string;

  @Column({
    type: 'enum',
    enum: ['limpeza_basica', 'limpeza_completa', 'limpeza_pos_obra', 'passar_roupa', 'organizar'],
  })
  tipo: TipoServico;

  @Column({ nullable: true, type: 'text' })
  descricao: string;

  @ManyToOne(() => Endereco, { eager: true })
  endereco: Endereco;

  @Column()
  enderecoId: string;

  @Column({ type: 'timestamptz' })
  dataAgendada: Date;

  @Column({ type: 'int' })
  horasEstimadas: number;

  @Column({
    type: 'enum',
    enum: ['aguardando', 'matching', 'aceito', 'a_caminho', 'em_andamento', 'concluido', 'cancelado'],
    default: 'aguardando',
  })
  status: StatusServico;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  valorTotal: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  valorHora: number;

  @Column({ nullable: true })
  motivoCancelamento: string;

  // Avaliação embutida
  @Column({ nullable: true, type: 'int' })
  avaliacaoNota: number;

  @Column({ nullable: true, type: 'text' })
  avaliacaoComentario: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
