import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
export type UserRole = 'cliente' | 'diarista' | 'admin';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  nome: string;
  @Column({ unique: true })
  email: string;
  @Column()
  @Exclude()
  senha: string;
  @Column()
  telefone: string;
  @Column({ nullable: true })
  cpf: string;
  @Column({ nullable: true })
  foto: string;
  @Column({ type: 'enum', enum: ['cliente', 'diarista', 'admin'] })
  role: UserRole;
  // ── Campos exclusivos de diarista ─────────────────────────────────────────
  @Column({ nullable: true, type: 'text' })
  descricao: string;
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  avaliacaoMedia: number;
  @Column({ default: 0 })
  totalAvaliacoes: number;
  @Column({ default: 0 })
  servicosRealizados: number;
  @Column({ default: false })
  disponivel: boolean;
  @Column({ default: false })
  documentoVerificado: boolean;
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  valorHora: number;
  @Column({ nullable: true })
  pushToken: string;
  @Column({ default: true })
  ativo: boolean;
  @Column({ nullable: true })
  fotoPerfil: string;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
