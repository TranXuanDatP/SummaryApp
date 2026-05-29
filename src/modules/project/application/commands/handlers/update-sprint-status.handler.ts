import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { UpdateSprintStatusCommand } from '../update-sprint-status.command';
import { SprintDto } from '../../dtos';
import type { ISprintRepository } from '../../../domain/repositories';
import { SPRINT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { NotFoundException } from 'src/libs/core/common';

@CommandHandler(UpdateSprintStatusCommand)
export class UpdateSprintStatusHandler implements ICommandHandler<
  UpdateSprintStatusCommand,
  SprintDto
> {
  constructor(
    @Inject(SPRINT_REPOSITORY_TOKEN)
    private readonly sprintRepository: ISprintRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: UpdateSprintStatusCommand): Promise<SprintDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const sprint = await this.sprintRepository.getById(command.sprintId);
    if (!sprint) {
      throw NotFoundException.withId('Sprint', command.sprintId);
    }

    if (command.status === 'in_progress') {
      sprint.start(eventMetadata);
    } else if (command.status === 'completed') {
      sprint.complete(eventMetadata);
    }

    await this.sprintRepository.save(sprint);

    return new SprintDto({
      id: sprint.id,
      projectId: sprint.projectId,
      name: sprint.name,
      description: sprint.description,
      status: sprint.status.value,
      startDate: sprint.startDate?.toISOString() ?? null,
      endDate: sprint.endDate?.toISOString() ?? null,
      sortOrder: sprint.sortOrder,
      version: sprint.version,
      createdAt: sprint.createdAt,
      updatedAt: sprint.updatedAt,
    });
  }
}
