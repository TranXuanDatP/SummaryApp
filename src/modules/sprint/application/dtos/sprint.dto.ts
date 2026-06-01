import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SprintDto {
  @ApiProperty() id: string;
  @ApiProperty() projectId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ enum: ['planning', 'in_progress', 'completed'] }) status: string;
  @ApiPropertyOptional({ nullable: true }) startDate: string | null;
  @ApiPropertyOptional({ nullable: true }) endDate: string | null;
  @ApiProperty() sortOrder: number;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(params: {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    sortOrder: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.projectId = params.projectId;
    this.name = params.name;
    this.description = params.description;
    this.status = params.status;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.sortOrder = params.sortOrder;
    this.version = params.version;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}
