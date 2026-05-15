import { Inject, Optional } from '@nestjs/common';
import { ICommandHandler } from 'src/libs/core/application';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core/constants';
import type { IRequestContextProvider } from 'src/libs/core/common';
import { DomainException, NotFoundException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { MergeProjectsCommand } from '../merge-projects.command';
import { ProjectDto } from '../../dtos';
import type { IProjectRepository } from '../../../domain/repositories';
import { PROJECT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { Project } from '../../../domain/entities';

@CommandHandler(MergeProjectsCommand)
export class MergeProjectsHandler implements ICommandHandler<
  MergeProjectsCommand,
  ProjectDto
> {
  constructor(
    @Inject(PROJECT_REPOSITORY_TOKEN)
    private readonly projectRepository: IProjectRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: MergeProjectsCommand): Promise<ProjectDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const target = await this.projectRepository.getById(command.targetProjectId);
    if (!target) {
      throw NotFoundException.entity('Project', command.targetProjectId, {
        suggestion: 'Kiểm tra lại ID dự án đích',
      });
    }

    const sourceProjects: Project[] = [];
    for (const sourceId of command.sourceProjectIds) {
      if (sourceId === command.targetProjectId) {
        throw new DomainException(
          'Cannot merge a project into itself',
          'PROJECT_MERGE_SAME_ID',
          { suggestion: 'Loại bỏ ID đích khỏi danh sách nguồn' },
        );
      }
      const source = await this.projectRepository.getById(sourceId);
      if (!source) {
        throw NotFoundException.entity('Project', sourceId, {
          suggestion: 'Kiểm tra lại ID dự án nguồn',
        });
      }
      if (source.status.value === 'archived') {
        throw new DomainException(
          `Source project ${sourceId} is already archived`,
          'PROJECT_MERGE_SOURCE_ARCHIVED',
          { suggestion: 'Chỉ gộp được dự án đang hoạt động' },
        );
      }
      sourceProjects.push(source);
    }

    for (const source of sourceProjects) {
      source.archive(eventMetadata);
      await this.projectRepository.save(source);
    }

    return new ProjectDto({
      id: target.id,
      name: target.name,
      description: target.description,
      status: target.status.value,
      version: target.version,
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
    });
  }
}
