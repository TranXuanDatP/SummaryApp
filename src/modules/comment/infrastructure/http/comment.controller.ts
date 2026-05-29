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
import { AuditLog } from 'src/libs/shared';

@ApiTags('comments')
@ApiBearerAuth('JWT-auth')
@Controller('work-logs')
export class WorkLogCommentController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
  ) {}

  @Post(':workLogId/comments')
  @AuditLog('comment.create', 'Comment')
  @Roles('manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo bình luận trên báo cáo công việc' })
  @ApiParam({ name: 'workLogId', description: 'ID Báo cáo CV' })
  @ApiResponse({ status: 201, description: 'Đã tạo bình luận' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy báo cáo CV' })
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
  @AuditLog('comment.update', 'Comment')
  @Roles('manager')
  @ApiOperation({ summary: 'Cập nhật bình luận' })
  @ApiParam({ name: 'id', description: 'ID Bình luận' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật bình luận' })
  @ApiResponse({ status: 403, description: 'Không phải tác giả bình luận' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  async update(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
  ): Promise<CommentDto> {
    const command = new UpdateCommentCommand(id, dto.content, user.userId);
    return this.commandBus.execute<UpdateCommentCommand, CommentDto>(command);
  }

  @Delete(':id')
  @AuditLog('comment.delete', 'Comment')
  @Roles('manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa bình luận' })
  @ApiParam({ name: 'id', description: 'ID Bình luận' })
  @ApiResponse({ status: 200, description: 'Đã xóa bình luận' })
  @ApiResponse({ status: 403, description: 'Không phải tác giả bình luận' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
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
