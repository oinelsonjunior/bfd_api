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
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        entities: [User, Servico, Mensagem, Pagamento, Endereco],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
        
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
