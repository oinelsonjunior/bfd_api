import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicoController } from './servico.controller';
import { ServicoService } from './servico.service';
import { Servico } from './servico.entity';
import { User } from '../users/user.entity';
import { Endereco } from '../enderecos/endereco.entity';
import { NotificacaoModule } from '../notificacoes/notificacao.module';

@Module({
  imports: [TypeOrmModule.forFeature([Servico, User, Endereco]), NotificacaoModule],
  controllers: [ServicoController],
  providers: [ServicoService],
  exports: [ServicoService],
})
export class ServicoModule {}