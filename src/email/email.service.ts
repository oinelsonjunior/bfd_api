import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend = new Resend(process.env.RESEND_API_KEY);
  private from = 'Bem Feito Diaristas <onboarding@resend.dev>';

  async enviarRecuperacaoSenha(email: string, token: string): Promise<void> {
    const link = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Recuperação de senha — Bem Feito Diaristas',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="text-align:center;margin-bottom:32px">
            <h1 style="color:#FA7D23;font-size:24px;margin:0">Bem Feito Diaristas</h1>
            <p style="color:#888;font-size:13px;margin:4px 0 0">Sua casa limpa, do jeito certo.</p>
          </div>
          <div style="background:#f4f5f8;border-radius:16px;padding:24px">
            <h2 style="color:#282860;font-size:18px;margin:0 0 12px">Recuperar senha</h2>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
              Recebemos uma solicitação para redefinir a senha da sua conta.
              Clique no botão abaixo para criar uma nova senha.
            </p>
            <div style="text-align:center">
              <a href="${link}" style="display:inline-block;background:#FA7D23;color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px">
                REDEFINIR SENHA
              </a>
            </div>
            <p style="color:#aaa;font-size:12px;text-align:center;margin:24px 0 0">
              Este link expira em 1 hora. Se você não solicitou, ignore este e-mail.
            </p>
          </div>
          <p style="color:#ccc;font-size:11px;text-align:center;margin:24px 0 0">
            © 2026 Bem Feito Diaristas. Todos os direitos reservados.
          </p>
        </div>
      `,
    });
  }

  async enviarBoasVindas(email: string, nome: string): Promise<void> {
    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Bem-vindo ao Bem Feito Diaristas! 🎉',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="text-align:center;margin-bottom:32px">
            <h1 style="color:#FA7D23;font-size:24px;margin:0">Bem Feito Diaristas</h1>
            <p style="color:#888;font-size:13px;margin:4px 0 0">Sua casa limpa, do jeito certo.</p>
          </div>
          <div style="background:#f4f5f8;border-radius:16px;padding:24px">
            <h2 style="color:#282860;font-size:18px;margin:0 0 12px">Olá, ${nome}! 👋</h2>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px">
              Seja bem-vindo ao Bem Feito Diaristas! Sua conta foi criada com sucesso.
            </p>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
              Agora você pode solicitar diaristas qualificadas e ter sua casa sempre limpa e organizada.
            </p>
            <div style="text-align:center">
              <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#FA7D23;color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px">
                ACESSAR O APP
              </a>
            </div>
          </div>
          <p style="color:#ccc;font-size:11px;text-align:center;margin:24px 0 0">
            © 2026 Bem Feito Diaristas. Todos os direitos reservados.
          </p>
        </div>
      `,
    });
  }
}
