import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Inject,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { type ICommandBus, COMMAND_BUS_TOKEN } from 'src/libs/core';
import {
  CreateCommentCommand,
  UpdateCommentCommand,
  DeleteCommentCommand,
} from '../../application/commands';
import { CreateCommentDto, CommentDto } from '../../application/dtos';
import {
  CurrentUser,
  Roles,
} from '@modules/auth/infrastructure/http/decorators';

@ApiTags('comments')
@ApiBearerAuth('JWT-auth')
@Controller('work-logs')
export class WorkLogCommentController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
  ) {}

  @Post(':workLogId/comments')
  @Roles('manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a comment on a work log' })
  @ApiParam({ name: 'workLogId', description: 'WorkLog ID' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 404, description: 'WorkLog not found' })
  async create(
    @Param('workLogId') workLogId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<CommentDto> {
    const command = new CreateCommentCommand(
      workLogId,
      dto.content,
      user.userId,
    );
    const result = await this.commandBus.execute<
      CreateCommentCommand,
      CommentDto
    >(command);
    res.header('Location', `/comments/${result.id}`);
    return result;
  }
}

@ApiTags('comments')
@ApiBearerAuth('JWT-auth')
@Controller('comments')
export class CommentController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
  ) {}

  @Put(':id')
  @Roles('manager')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  @ApiResponse({ status: 403, description: 'Not the comment author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
  ): Promise<CommentDto> {
    const command = new UpdateCommentCommand(id, dto.content, user.userId);
    return this.commandBus.execute<UpdateCommentCommand, CommentDto>(command);
  }

  @Delete(':id')
  @Roles('manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({ status: 403, description: 'Not the comment author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<{ deleted: boolean; id: string }> {
    const command = new DeleteCommentCommand(id, user.userId);
    return this.commandBus.execute<
      DeleteCommentCommand,
      { deleted: boolean; id: string }
    >(command);
  }
}
