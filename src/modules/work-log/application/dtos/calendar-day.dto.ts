import { ApiProperty } from '@nestjs/swagger';

export class CalendarDayDto {
  @ApiProperty() date: string;
  @ApiProperty() isBusinessDay: boolean;
  @ApiProperty() hasWorkLog: boolean;
  @ApiProperty({ nullable: true }) workLogId: string | null;
  @ApiProperty() isEditable: boolean;
  @ApiProperty({ nullable: true }) editWindowClosesAt: string | null;

  constructor(params: {
    date: string;
    isBusinessDay: boolean;
    hasWorkLog: boolean;
    workLogId: string | null;
    isEditable: boolean;
    editWindowClosesAt: string | null;
  }) {
    this.date = params.date;
    this.isBusinessDay = params.isBusinessDay;
    this.hasWorkLog = params.hasWorkLog;
    this.workLogId = params.workLogId;
    this.isEditable = params.isEditable;
    this.editWindowClosesAt = params.editWindowClosesAt;
  }
}
