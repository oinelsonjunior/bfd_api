import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagamento, MetodoPagamento } from './pagamento.entity';
import { Servico } from '../servicos/servico.entity';

export class ProcessarPagamentoDto {
  servicoId: string;
  metodo: MetodoPagamento;
  cartaoId?: string;
  tokenCartao?: string;
}

@Injectable()
export class PagamentoService {
  constructor(
    @InjectRepository(Pagamento) private pagamentoRepo: Repository<Pagamento>,
    @InjectRepository(Servico) private servicoRepo: Repository<Servico>,
  ) {}

  async processar(userId: string, dto: ProcessarPagamentoDto): Promise<Pagamento> {
    const servico = await this.servicoRepo.findOne({ where: { id: dto.servicoId } });
    if (!servico) throw new NotFoundException('Serviço não encontrado');

    const pagamento = this.pagamentoRepo.create({
      servicoId: dto.servicoId,
      userId,
      valor: servico.valorTotal,
      metodo: dto.metodo,
      status: 'aprovado', // TODO: integrar gateway real (Stripe, PagSeguro, Mercado Pago)
    });

    return this.pagamentoRepo.save(pagamento);
  }

  async gerarPix(userId: string, servicoId: string) {
    const servico = await this.servicoRepo.findOne({ where: { id: servicoId } });
    if (!servico) throw new NotFoundException('Serviço não encontrado');

    const expiracao = new Date();
    expiracao.setMinutes(expiracao.getMinutes() + 30);

    const pagamento = await this.pagamentoRepo.save(
      this.pagamentoRepo.create({
        servicoId,
        userId,
        valor: servico.valorTotal,
        metodo: 'pix',
        status: 'pendente',
        // TODO: integrar com PSP para gerar QR Code real
        pixQrCode: 'QR_CODE_PLACEHOLDER',
        pixCopiaCola: `00020126330014BR.GOV.BCB.PIX0111${Date.now()}5204000053039865802BR5925BEM FEITO DIARISTAS6009SAO PAULO62070503***6304`,
        pixExpiracao: expiracao,
      }),
    );

    return {
      qrCode: pagamento.pixQrCode,
      copiaCola: pagamento.pixCopiaCola,
      expiracao: pagamento.pixExpiracao,
    };
  }

  async listarCartoes(userId: string) {
    // TODO: integrar com gateway para listar cartões salvos do cliente
    return [];
  }

  async historico(userId: string): Promise<Pagamento[]> {
    return this.pagamentoRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
