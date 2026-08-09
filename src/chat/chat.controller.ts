import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';

import { Permissions } from '../authorization/decorators/permissions.decorator';
import { Permission } from '../authorization/enums/permission.enum';

import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { ResourceOwnerGuard } from '../authorization/guards/resource-owner.guard';

import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/interfaces/authenticated-user.interface';

import { ChatService } from './chat.service';

import {
  AddParticipantDto,
  CreateConversationDto,
  CreateMessageDto,
  PaginationDto,
} from './dto';


@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {


  constructor(
    private readonly chat: ChatService,
  ) {}



  @Post('conversations')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CHAT_CREATE)
  createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {

    return this.chat.createConversation(
      user.id,
      dto.subject ?? '',
    );

  }





  @Get('conversations')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CHAT_READ)
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ) {

    return this.chat.listConversations(
      user.id,
      pagination,
    );

  }





  @Get('conversations/:conversationId')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CHAT_READ)
  getConversation(
    @CurrentUser() user: AuthenticatedUser,

    @Param(
      'conversationId',
      new ParseUUIDPipe(),
    )
    conversationId: string,

  ) {

    return this.chat.getConversation(
      user.id,
      conversationId,
    );

  }





  @Post('conversations/:conversationId/participants')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CHAT_UPDATE)
  addParticipant(
    @CurrentUser() user: AuthenticatedUser,

    @Param(
      'conversationId',
      new ParseUUIDPipe(),
    )
    conversationId: string,

    @Body()
    dto: AddParticipantDto,

  ) {

    return this.chat.addParticipant(
      user.id,
      conversationId,
      dto.userId,
    );

  }





  @Post('conversations/:conversationId/messages')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CHAT_CREATE)
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,

    @Param(
      'conversationId',
      new ParseUUIDPipe(),
    )
    conversationId: string,

    @Body()
    dto: CreateMessageDto,

  ) {

    return this.chat.sendMessage(
      user.id,
      conversationId,
      dto.body,
    );

  }





  // NEW: отримання повідомлень з pagination

  @Get('conversations/:conversationId/messages')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CHAT_READ)
  listMessages(
    @CurrentUser() user: AuthenticatedUser,

    @Param(
      'conversationId',
      new ParseUUIDPipe(),
    )
    conversationId: string,

    @Query()
    pagination: PaginationDto,

  ) {

    return this.chat.listMessages(
      user.id,
      conversationId,
      pagination,
    );

  }





  @Patch('conversations/:conversationId/close')
  @UseGuards(
    PermissionsGuard,
    ResourceOwnerGuard,
  )
  @Permissions(Permission.CHAT_UPDATE)
  closeConversation(
    @CurrentUser() user: AuthenticatedUser,

    @Param(
      'conversationId',
      new ParseUUIDPipe(),
    )
    conversationId: string,

  ) {

    return this.chat.closeConversation(
      user.id,
      conversationId,
    );

  }





  @Patch('conversations/:conversationId')
  @UseGuards(
    PermissionsGuard,
    ResourceOwnerGuard,
  )
  @Permissions(Permission.CHAT_UPDATE)
  updateConversation(
    @CurrentUser() user: AuthenticatedUser,

    @Param(
      'conversationId',
      new ParseUUIDPipe(),
    )
    conversationId: string,

    @Body()
    dto: {
      subject?: string;
    },

  ) {

    return this.chat.updateConversation(
      user.id,
      conversationId,
      dto.subject ?? '',
    );

  }





  @Delete('conversations/:conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(
    PermissionsGuard,
    ResourceOwnerGuard,
  )
  @Permissions(Permission.CHAT_DELETE)
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUser,

    @Param(
      'conversationId',
      new ParseUUIDPipe(),
    )
    conversationId: string,

  ): Promise<void> {

    await this.chat.deleteConversation(
      user.id,
      conversationId,
    );

  }


}