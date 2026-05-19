export class CalendarDayDto {
  date: string;
  isBusinessDay: boolean;
  hasWorkLog: boolean;
  workLogId: string | null;
  isEditable: boolean;
  editWindowClosesAt: string | null;

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
