import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ enum: ['employee', 'manager'] }) role: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(params: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.email = params.email;
    this.fullName = params.fullName;
    this.role = params.role;
    this.isActive = params.isActive;
    this.version = params.version;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}
