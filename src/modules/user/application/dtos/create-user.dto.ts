import { IsEmail, IsString, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@test.com', description: 'Email address' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (min 8 chars)',
  })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(100, { message: 'Mật khẩu không được vượt quá 100 ký tự' })
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  @MinLength(1, { message: 'Họ tên là bắt buộc' })
  @MaxLength(200, { message: 'Họ tên không được vượt quá 200 ký tự' })
  fullName: string;

  @ApiProperty({
    example: 'employee',
    description: 'Role',
    enum: ['employee', 'manager'],
  })
  @IsString()
  @IsIn(['employee', 'manager'], {
    message: 'Vai trò phải là employee hoặc manager',
  })
  role: string;
}
