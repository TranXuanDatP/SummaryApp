import { randomUUID } from 'crypto';
import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { CreateSprintCommand } from '../create-sprint.command';
import { SprintDto } from '../../dtos';
import type { ISprintRepository } from '../../../domain/repositories';
import { SprintId } from '../../../domain/value-objects';
import { Sprint } from '../../../domain/entities';
import { SPRINT_REPOSITORY_TOKEN } from '../../../constants/tokens';

@CommandHandler(CreateSprintCommand)
export class CreateSprintHandler implements ICommandHandler<
  CreateSprintCommand,
  SprintDto
> {
  constructor(
    @Inject(SPRINT_REPOSITORY_TOKEN)
    private readonly sprintRepository: ISprintRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: CreateSprintCommand): Promise<SprintDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const sprint = Sprint.create(
      new SprintId(randomUUID()),
      {
        projectId: command.projectId,
        name: command.name,
        description: command.description,
        startDate: command.startDate,
        endDate: command.endDate,
        sortOrder: command.sortOrder,
      },
      eventMetadata,
    );

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
