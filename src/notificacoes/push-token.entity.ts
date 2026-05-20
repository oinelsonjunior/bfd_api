import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn, Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export type Plataforma = 'ios' | 'android' | 'web';

@Entity('push_tokens')
@Index(['userId', 'plataforma'], { unique: true })
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column()
  token: string;

  @Column({ type: 'enum', enum: ['ios', 'android', 'web'] })
  plataforma: Plataforma;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
