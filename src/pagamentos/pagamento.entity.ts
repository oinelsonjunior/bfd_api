import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Servico } from '../servicos/servico.entity';

export type MetodoPagamento = 'cartao_credito' | 'cartao_debito' | 'pix';
export type StatusPagamento = 'pendente' | 'aprovado' | 'recusado' | 'estornado';

@Entity('pagamentos')
export class Pagamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Servico, { eager: true })
  servico: Servico;

  @Column()
  servicoId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  valor: number;

  @Column({
    type: 'enum',
    enum: ['cartao_credito', 'cartao_debito', 'pix'],
  })
  metodo: MetodoPagamento;

  @Column({
    type: 'enum',
    enum: ['pendente', 'aprovado', 'recusado', 'estornado'],
    default: 'pendente',
  })
  status: StatusPagamento;

  @Column({ nullable: true })
  gatewayId: string; // ID da transação no gateway de pagamento

  @Column({ nullable: true, type: 'text' })
  pixQrCode: string;

  @Column({ nullable: true, type: 'text' })
  pixCopiaCola: string;

  @Column({ nullable: true, type: 'timestamptz' })
  pixExpiracao: Date;

  @CreateDateColumn()
  createdAt: Date;
}
