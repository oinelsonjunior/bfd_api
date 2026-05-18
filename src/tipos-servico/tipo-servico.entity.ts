
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tipos_servico')
export class TipoServico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  codigo: string; // ex: 'limpeza_basica'

  @Column()
  nome: string; // ex: 'Limpeza Básica'

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  precoBase: number; // preço por hora

  @Column({ type: 'int', default: 2 })
  horasMinimas: number;

  @Column({ type: 'int', default: 12 })
  horasMaximas: number;

  @Column({ default: true })
  ativo: boolean;

  @Column({ nullable: true })
  icone: string; // nome do ícone Ionic

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
