import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginRequestDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1, { message: 'Mật khẩu là bắt buộc' })
  @MaxLength(200)
  password: string;
}
