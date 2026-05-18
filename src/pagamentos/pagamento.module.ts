import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagamentoController } from './pagamento.controller';
import { PagamentoService } from './pagamento.service';
import { Pagamento } from './pagamento.entity';
import { Servico } from '../servicos/servico.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pagamento, Servico])],
  controllers: [PagamentoController],
  providers: [PagamentoService],
})
export class PagamentoModule {}
