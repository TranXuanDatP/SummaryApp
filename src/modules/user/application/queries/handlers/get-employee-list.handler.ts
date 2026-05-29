import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetEmployeeListQuery } from '../get-employee-list.query';
import { EmployeeListItemDto } from '../../dtos';
import { USER_READ_DAO_TOKEN } from '../../../constants/tokens';
import type { IUserReadDao } from '../ports';
import { WORK_LOG_READ_DAO_TOKEN } from '@modules/work-log/constants/tokens';
import type { IWorkLogReadDao } from '@modules/work-log/application/queries/ports';
import { BUSINESS_DAY_CALCULATOR_TOKEN } from '@modules/work-log/constants/tokens';
import type { IBusinessDayCalculator } from '@modules/work-log/domain/services';

@QueryHandler(GetEmployeeListQuery)
export class GetEmployeeListHandler implements IQueryHandler<
  GetEmployeeListQuery,
  EmployeeListItemDto[]
> {
  constructor(
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {}

  async execute(query: GetEmployeeListQuery): Promise<EmployeeListItemDto[]> {
    const { month, year } = query;
    const employees = await this.userReadDao.findAllActiveByRole('employee');
    if (employees.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const effectiveTotal = this.countBusinessDaysUpTo(month, year, today);

    // Batch: count work logs per employee in one query
    const employeeIds = employees.map((e) => e.id);
    const counts = await this.workLogReadDao.countByEmployeeIdsAndMonth(
      employeeIds,
      month,
      year,
    );

    return employees.map((emp) => {
      const loggedDays = counts.get(emp.id) ?? 0;
      const completionRate =
        effectiveTotal > 0 ? Math.round((loggedDays / effectiveTotal) * 100) / 100 : 0;

      return new EmployeeListItemDto({
        id: emp.id,
        fullName: emp.fullName,
        email: emp.email,
        isActive: emp.isActive,
        completionRate,
        loggedDays,
        totalBusinessDays: effectiveTotal,
      });
    });
  }

  private countBusinessDaysUpTo(
    month: number,
    year: number,
    upTo: Date,
  ): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      if (date > upTo) break;
      if (this.calculator.isBusinessDay(date)) count++;
    }
    return count;
  }
}
