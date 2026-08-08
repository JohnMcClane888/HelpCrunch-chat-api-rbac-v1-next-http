import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { ConversationStatus } from '@prisma/client';

import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/enums/permission.enum';
import { ChatRepository } from '../database/repositories/chat.repository';

const PRIVILEGED_CHAT_ROLES = ['AGENT', 'ADMIN', 'OWNER'] as const;

@Injectable()
export class ChatService {
  constructor(
    private readonly chats: ChatRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async createConversation(userId: string, subject?: string) {
    return this.chats.createConversation(userId, subject?.trim() || undefined);
  }

  async listConversations(userId: string) {
    const elevated = await this.authorization.hasAnyUserRole(
      userId,
      PRIVILEGED_CHAT_ROLES,
    );

    return elevated
      ? this.chats.listAllConversations()
      : this.chats.listConversationsForUser(userId);
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.requireConversation(conversationId);
    await this.assertCanRead(userId, conversationId);
    return conversation;
  }

  async addParticipant(
    actorUserId: string,
    conversationId: string,
    participantUserId: string,
  ) {
    await this.requireConversation(conversationId);
    await this.assertCanManageConversation(actorUserId, conversationId);
    return this.chats.addParticipant(conversationId, participantUserId);
  }

  async sendMessage(userId: string, conversationId: string, body: string) {
    const conversation = await this.requireConversation(conversationId);

    if (conversation.status !== ConversationStatus.OPEN) {
      throw new BadRequestException('Conversation is closed');
    }

    const participant = await this.chats.isActiveParticipant(
      conversationId,
      userId,
    );
    if (!participant) {
      throw new ForbiddenException('Conversation participant access required');
    }

    return this.chats.createMessage(conversationId, userId, body.trim());
  }

  async closeConversation(userId: string, conversationId: string) {
    await this.requireConversation(conversationId);
    await this.assertCanManageConversation(userId, conversationId);
    return this.chats.closeConversation(conversationId);
  }

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    await this.requireConversation(conversationId);
    await this.assertCanDelete(userId, conversationId);
    await this.chats.deleteConversation(conversationId);
  }

  private async requireConversation(conversationId: string) {
    const conversation = await this.chats.findConversation(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  private async assertCanRead(userId: string, conversationId: string): Promise<void> {
    if (await this.isPrivileged(userId)) return;

    const participant = await this.chats.isActiveParticipant(
      conversationId,
      userId,
    );
    if (!participant) {
      throw new ForbiddenException('Conversation participant access required');
    }
  }

  private async assertCanManageConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (await this.isPrivileged(userId)) return;

    const creator = await this.chats.isCreator(conversationId, userId);
    if (!creator) {
      throw new ForbiddenException('Conversation management access required');
    }
  }

  private async assertCanDelete(userId: string, conversationId: string): Promise<void> {
    if (await this.authorization.hasUserPermission(userId, Permission.CHAT_DELETE)) {
      if (await this.isPrivileged(userId)) return;
    }

    const creator = await this.chats.isCreator(conversationId, userId);
    if (!creator) {
      throw new ForbiddenException('Conversation delete access required');
    }
  }

  private isPrivileged(userId: string): Promise<boolean> {
    return this.authorization.hasAnyUserRole(userId, PRIVILEGED_CHAT_ROLES);
  }
}
