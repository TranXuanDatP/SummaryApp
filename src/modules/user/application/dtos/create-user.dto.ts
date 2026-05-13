import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(100, { message: 'Mật khẩu không được vượt quá 100 ký tự' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Họ tên là bắt buộc' })
  @MaxLength(200, { message: 'Họ tên không được vượt quá 200 ký tự' })
  fullName: string;

  @IsString()
  @IsIn(['employee', 'manager'], {
    message: 'Vai trò phải là employee hoặc manager',
  })
  role: string;
}
