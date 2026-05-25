import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  type ICommandBus,
  type IQueryBus,
  COMMAND_BUS_TOKEN,
  QUERY_BUS_TOKEN,
} from 'src/libs/core';
import {
  MarkNotificationReadCommand,
  MarkAllReadCommand,
  UpdateNotificationPreferenceCommand,
  PreferenceItem,
} from '../../application/commands';
import {
  GetNotificationsQuery,
  GetNotificationPreferencesQuery,
} from '../../application/queries';
import {
  NotificationDto,
  NotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
} from '../../application/dtos';
import { CurrentUser } from '@modules/auth/infrastructure/http/decorators';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

function parsePagination(page?: string, limit?: string) {
  let p = page ? parseInt(page, 10) : DEFAULT_PAGE;
  let l = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;
  if (isNaN(p) || p < 1) p = DEFAULT_PAGE;
  if (isNaN(l) || l < 1) l = DEFAULT_LIMIT;
  if (l > MAX_PAGE_LIMIT) l = MAX_PAGE_LIMIT;
  return { page: p, limit: l };
}

type PaginatedNotificationResponse = {
  data: NotificationDto[];
  total: number;
  page: number;
  totalPages: number;
};

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Paginated notification list' })
  async getList(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedNotificationResponse> {
    const { page: p, limit: l } = parsePagination(page, limit);
    const query = new GetNotificationsQuery(user.userId, p, l);
    return this.queryBus.execute(query);
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(@CurrentUser() user: any): Promise<{ success: boolean }> {
    const command = new MarkAllReadCommand(user.userId);
    return this.commandBus.execute(command);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    const command = new MarkNotificationReadCommand(id, user.userId);
    return this.commandBus.execute(command);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get my notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  async getPreferences(
    @CurrentUser() user: any,
  ): Promise<NotificationPreferenceDto[]> {
    const query = new GetNotificationPreferencesQuery(user.userId);
    return this.queryBus.execute(query);
  }

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update my notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @Body() dto: UpdateNotificationPreferenceDto,
    @CurrentUser() user: any,
  ): Promise<NotificationPreferenceDto[]> {
    const preferences = dto.preferences.map(
      (item) => new PreferenceItem(item.type, item.channel, item.enabled),
    );
    const command = new UpdateNotificationPreferenceCommand(
      user.userId,
      preferences,
    );
    await this.commandBus.execute(command);

    const query = new GetNotificationPreferencesQuery(user.userId);
    return this.queryBus.execute(query);
  }
}
