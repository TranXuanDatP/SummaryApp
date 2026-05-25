import { Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { ICommandHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { CommandHandler } from 'src/libs/shared/cqrs';
import { DATABASE_WRITE_TOKEN } from 'src/libs/shared/database/drizzle/database.provider';
import type { DrizzleDB } from 'src/libs/shared/database/drizzle/database.type';
import { DeleteProjectCommand } from '../delete-project.command';
import type { IProjectRepository } from '../../../domain/repositories';
import { PROJECT_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { workLogsTable } from '@modules/work-log/infrastructure/persistence/drizzle/schema';

@CommandHandler(DeleteProjectCommand)
export class DeleteProjectHandler implements ICommandHandler<
  DeleteProjectCommand,
  { deleted: boolean; id: string; workLogsDeleted: number }
> {
  constructor(
    @Inject(PROJECT_REPOSITORY_TOKEN)
    private readonly projectRepository: IProjectRepository,
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  async execute(
    command: DeleteProjectCommand,
  ): Promise<{ deleted: boolean; id: string; workLogsDeleted: number }> {
    const project = await this.projectRepository.getById(command.id);
    if (!project) {
      throw NotFoundException.entity('Project', command.id, {
        suggestion: 'Kiểm tra lại ID dự án',
      });
    }

    // Cascade: batch soft delete all active work logs belonging to this project
    const now = new Date();
    const result = await this.db
      .update(workLogsTable)
      .set({ isDeleted: true, deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(workLogsTable.projectId, command.id),
          eq(workLogsTable.isDeleted, false),
        ),
      );

    // Soft delete the project itself
    project.delete();
    await this.projectRepository.save(project);

    const workLogsDeleted = (result as any).rowCount ?? 0;

    return { deleted: true, id: command.id, workLogsDeleted };
  }
}
