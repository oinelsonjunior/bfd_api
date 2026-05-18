import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ServicoModule } from './servicos/servico.module';
import { ChatModule } from './chat/chat.module';
import { PagamentoModule } from './pagamentos/pagamento.module';
import { EnderecoModule } from './enderecos/endereco.module';
import { User } from './users/user.entity';
import { Servico } from './servicos/servico.entity';
import { Mensagem } from './chat/mensagem.entity';
import { Pagamento } from './pagamentos/pagamento.entity';
import { Endereco } from './enderecos/endereco.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [User, Servico, Mensagem, Pagamento, Endereco],
        synchronize: true,
        ssl: { rejectUnauthorized: false },
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ServicoModule,
    ChatModule,
    PagamentoModule,
    EnderecoModule,
  ],
})
export class AppModule {}
