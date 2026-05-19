import { IQuery } from 'src/libs/core/application';
import { CalendarDayDto } from '../dtos';

export class GetCalendarViewQuery extends IQuery<CalendarDayDto[]> {
  constructor(
    public readonly employeeId: string,
    public readonly month: number,
    public readonly year: number,
  ) {
    super();
  }
}
