import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { DeleteSprintCommand } from '../delete-sprint.command';
import type { ISprintRepository } from '../../../domain/repositories';
import { SPRINT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { NotFoundException } from 'src/libs/core/common';

@CommandHandler(DeleteSprintCommand)
export class DeleteSprintHandler implements ICommandHandler<
  DeleteSprintCommand,
  { deleted: boolean; id: string }
> {
  constructor(
    @Inject(SPRINT_REPOSITORY_TOKEN)
    private readonly sprintRepository: ISprintRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: DeleteSprintCommand): Promise<{ deleted: boolean; id: string }> {
    const sprint = await this.sprintRepository.getById(command.sprintId);
    if (!sprint) {
      throw NotFoundException.withId('Sprint', command.sprintId);
    }

    sprint.delete();
    await this.sprintRepository.save(sprint);

    return { deleted: true, id: command.sprintId };
  }
}
