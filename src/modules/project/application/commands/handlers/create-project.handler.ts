import { randomUUID } from 'crypto';
import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { ConflictException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { CreateProjectCommand } from '../create-project.command';
import { ProjectDto } from '../../dtos';
import type { IProjectRepository } from '../../../domain/repositories';
import { ProjectId } from '../../../domain/value-objects';
import { Project } from '../../../domain/entities';
import { PROJECT_REPOSITORY_TOKEN } from '../../../constants/tokens';

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<
  CreateProjectCommand,
  ProjectDto
> {
  constructor(
    @Inject(PROJECT_REPOSITORY_TOKEN)
    private readonly projectRepository: IProjectRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: CreateProjectCommand): Promise<ProjectDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const existing = await this.projectRepository.findByName(command.name);
    if (existing) {
      throw ConflictException.duplicate('Project', 'name', command.name, {
        code: 'PROJECT_DUPLICATE_NAME',
        suggestion: 'Sử dụng tên khác hoặc tìm kiếm dự án hiện có',
      });
    }

    const project = Project.create(
      new ProjectId(randomUUID()),
      {
        name: command.name,
        description: command.description,
      },
      eventMetadata,
    );

    try {
      await this.projectRepository.save(project);
    } catch (error: any) {
      if (error?.code === '23505' || error?.constraint?.includes('name')) {
        throw ConflictException.duplicate('Project', 'name', command.name, {
          code: 'PROJECT_DUPLICATE_NAME',
          suggestion: 'Sử dụng tên khác hoặc tìm kiếm dự án hiện có',
        });
      }
      throw error;
    }

    return new ProjectDto({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status.value,
      version: project.version,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  }
}
