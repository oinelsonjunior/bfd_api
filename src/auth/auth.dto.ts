import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '../users/user.entity';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsNotEmpty({ message: 'Senha obrigatória' })
  senha: string;
}

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsNotEmpty()
  telefone: string;

  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha: string;

  @IsEnum(['cliente', 'diarista'], { message: 'Role inválida' })
  role: UserRole;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  token: string;

  @MinLength(6)
  novaSenha: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;
}
