export class WorkLogDefaultsDto {
  suggestedProjectId: string | null;
  suggestedProjectName: string | null;
  todayDate: string;

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
