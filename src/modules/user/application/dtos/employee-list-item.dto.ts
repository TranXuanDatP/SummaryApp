import { ApiProperty } from '@nestjs/swagger';

export class EmployeeListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() fullName: string;
  @ApiProperty() email: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() completionRate: number;
  @ApiProperty() loggedDays: number;
  @ApiProperty() totalBusinessDays: number;

  constructor(params: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    completionRate: number;
    loggedDays: number;
    totalBusinessDays: number;
  }) {
    this.id = params.id;
    this.fullName = params.fullName;
    this.email = params.email;
    this.isActive = params.isActive;
    this.completionRate = params.completionRate;
    this.loggedDays = params.loggedDays;
    this.totalBusinessDays = params.totalBusinessDays;
  }
}
