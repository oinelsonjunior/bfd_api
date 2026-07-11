import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Pagamento, MetodoPagamento } from './pagamento.entity';
import { Servico } from '../servicos/servico.entity';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export class ProcessarPagamentoDto {
  servicoId: string;
  metodo: MetodoPagamento;
  cartaoId?: string;
  token?: string;
  email?: string;
}

export class GerarPixDto {
  servicoId: string;
  email: string;
  cpf: string;
  nomeCompleto: string;
}

@Injectable()
export class PagamentoService {
  private client: MercadoPagoConfig | null = null;
  private paymentClient: Payment | null = null;

  constructor(
    @InjectRepository(Pagamento) private pagamentoRepo: Repository<Pagamento>,
    @InjectRepository(Servico) private servicoRepo: Repository<Servico>,
    private config: ConfigService,
  ) {
    const accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (accessToken && !accessToken.includes('xxxxxxxx')) {
      this.client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
      this.paymentClient = new Payment(this.client);
      console.log('[PagamentoService] Mercado Pago inicializado');
    } else {
      console.warn('[PagamentoService] Mercado Pago NÃO configurado - usando mock');
    }
  }

  async processar(userId: string, dto: ProcessarPagamentoDto): Promise<Pagamento> {
    const servico = await this.servicoRepo.findOne({ where: { id: dto.servicoId } });
    if (!servico) throw new NotFoundException('Serviço não encontrado');

    if (!this.paymentClient) {
      return this.pagamentoRepo.save(this.pagamentoRepo.create({
        servicoId: dto.servicoId, userId, valor: servico.valorTotal,
        metodo: dto.metodo, status: 'aprovado', gatewayId: 'MOCK',
      }));
    }

    try {
      const payment = await this.paymentClient.create({
        body: {
          transaction_amount: Number(servico.valorTotal),
          token: dto.token,
          description: `Serviço de limpeza`,
          installments: 1,
          payment_method_id: 'visa',
          payer: { email: dto.email || 'cliente@bfd.com' },
        }
      });
      return this.pagamentoRepo.save(this.pagamentoRepo.create({
        servicoId: dto.servicoId, userId, valor: servico.valorTotal,
        metodo: dto.metodo, status: this.mapearStatus(payment.status || "pending"),
        gatewayId: String(payment.id),
      }));
    } catch (error: any) {
      throw new BadRequestException('Erro ao processar pagamento: ' + error.message);
    }
  }

  async gerarPix(userId: string, dto: GerarPixDto) {
    const servico = await this.servicoRepo.findOne({ where: { id: dto.servicoId } });
    if (!servico) throw new NotFoundException('Serviço não encontrado');

    if (!this.paymentClient) {
      const expiracao = new Date(Date.now() + 30 * 60 * 1000);
      await this.pagamentoRepo.save(this.pagamentoRepo.create({
        servicoId: dto.servicoId, userId, valor: servico.valorTotal,
        metodo: 'pix', status: 'pendente', gatewayId: 'MOCK',
        pixQrCode: undefined,
        pixCopiaCola: `00020126330014BR.GOV.BCB.PIX0111${Date.now()}5204000053039865802BR5925BEM FEITO DIARISTAS6009SAO PAULO62070503***6304`,
        pixExpiracao: expiracao,
      }));
      return {
        qrCode: null,
        copiaCola: `00020126330014BR.GOV.BCB.PIX0111${Date.now()}5204000053039865802BR5925BEM FEITO DIARISTAS6009SAO PAULO62070503***6304`,
        expiracao,
        valor: servico.valorTotal,
      };
    }

    // PIX via MP sandbox requer conta PJ - usando mock
    if (true) {
      const expiracao = new Date(Date.now() + 30 * 60 * 1000);
      await this.pagamentoRepo.save(this.pagamentoRepo.create({
        servicoId: dto.servicoId, userId, valor: servico!.valorTotal,
        metodo: 'pix', status: 'pendente', gatewayId: 'MOCK',
        pixQrCode: undefined,
        pixCopiaCola: `00020126330014BR.GOV.BCB.PIX0111${Date.now()}5204000053039865802BR5925BEM FEITO DIARISTAS6009SAO PAULO62070503***6304`,
        pixExpiracao: expiracao,
      }));
      return {
        qrCode: null,
        copiaCola: `00020126330014BR.GOV.BCB.PIX0111${Date.now()}5204000053039865802BR5925BEM FEITO DIARISTAS6009SAO PAULO62070503***6304`,
        expiracao,
        valor: servico!.valorTotal,
      };
    }

    try {
      const payment = await this.paymentClient!.create({
        body: {
          transaction_amount: Number(servico!.valorTotal),
          description: `Serviço de limpeza`,
          payment_method_id: 'pix',
          payer: {
            email: 'test_user_4232076421517914479@testuser.com', // TODO: usar dto.email em produção
            first_name: (dto.nomeCompleto || 'Cliente').split(' ')[0],
            last_name: (dto.nomeCompleto || '').split(' ').slice(1).join(' ') || '-',
            identification: { type: 'CPF', number: (dto.cpf || '12345678909').replace(/\D/g, '') },
          },
        }
      });

      const pixData = payment.point_of_interaction?.transaction_data;
      const expiracao = new Date(payment.date_of_expiration || Date.now() + 30 * 60 * 1000);

      await this.pagamentoRepo.save(this.pagamentoRepo.create({
        servicoId: dto.servicoId, userId, valor: servico.valorTotal,
        metodo: 'pix', status: 'pendente', gatewayId: String(payment.id),
        pixQrCode: pixData?.qr_code_base64,
        pixCopiaCola: pixData?.qr_code,
        pixExpiracao: expiracao,
      }));

      return {
        qrCode: pixData?.qr_code_base64,
        copiaCola: pixData?.qr_code,
        expiracao,
        valor: servico.valorTotal,
      };
    } catch (error: any) {
      console.error('[PagamentoService] Erro ao gerar PIX:', error);
      throw new BadRequestException('Erro ao gerar PIX: ' + error.message);
    }
  }

  async processarWebhook(data: any): Promise<void> {
    if (!this.paymentClient) return;
    try {
      if (data.type === 'payment') {
        const payment = await this.paymentClient.get({ id: data.data.id });
        const pagamento = await this.pagamentoRepo.findOne({ where: { gatewayId: String(payment.id) } });
        if (pagamento) {
          pagamento.status = this.mapearStatus(payment.status || "pending");
          await this.pagamentoRepo.save(pagamento);
        }
      }
    } catch (error) {
      console.error('[PagamentoService] Erro no webhook:', error);
    }
  }

  async historico(userId: string): Promise<Pagamento[]> {
    return this.pagamentoRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  private mapearStatus(mpStatus: string): 'pendente' | 'aprovado' | 'recusado' | 'estornado' {
    const map: Record<string, string> = {
      approved: 'aprovado', pending: 'pendente', in_process: 'pendente',
      rejected: 'recusado', cancelled: 'recusado', refunded: 'estornado',
    };
    return (map[mpStatus] || 'pendente') as any;
  }
}
