import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PagamentoController } from './pagamento.controller';
import { PagamentoService } from './pagamento.service';
import { Pagamento } from './pagamento.entity';
import { Servico } from '../servicos/servico.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Pagamento, Servico]),
  ],
  controllers: [PagamentoController],
  providers: [PagamentoService],
})
export class PagamentoModule {}
