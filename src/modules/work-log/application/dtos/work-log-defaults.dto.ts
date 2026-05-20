import { ApiProperty } from '@nestjs/swagger';

export class WorkLogDefaultsDto {
  @ApiProperty({ nullable: true }) suggestedProjectId: string | null;
  @ApiProperty({ nullable: true }) suggestedProjectName: string | null;
  @ApiProperty() todayDate: string;

  constructor(params: {
    suggestedProjectId: string | null;
    suggestedProjectName: string | null;
    todayDate: string;
  }) {
    this.suggestedProjectId = params.suggestedProjectId;
    this.suggestedProjectName = params.suggestedProjectName;
    this.todayDate = params.todayDate;
  }
}
