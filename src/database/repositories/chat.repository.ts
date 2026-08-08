import { Injectable } from '@nestjs/common';
import { ConversationStatus, MessageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

const participantSelect = {
  userId: true,
  joinedAt: true,
  leftAt: true,
  user: {
    select: {
      id: true,
      email: true,
      username: true,
    },
  },
} satisfies Prisma.ConversationParticipantSelect;

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  sender: {
    select: {
      id: true,
      email: true,
      username: true,
    },
  },
} satisfies Prisma.MessageSelect;

const conversationInclude = {
  participants: {
    orderBy: { joinedAt: 'asc' as const },
    select: participantSelect,
  },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    take: 100,
    select: messageSelect,
  },
} satisfies Prisma.ConversationInclude;

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  createConversation(
    createdById: string,
    subject?: string,
  ) {
    return this.prisma.conversation.create({
      data: {
        createdById,
        subject,
        participants: {
          create: { userId: createdById },
        },
      },
      include: conversationInclude,
    });
  }

  findConversation(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude,
    });
  }

  listConversationsForUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        OR: [
          { createdById: userId },
          { participants: { some: { userId, leftAt: null } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: conversationInclude,
    });
  }

  listAllConversations() {
    return this.prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: conversationInclude,
    });
  }

  async isActiveParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      select: { leftAt: true },
    });

    return participant?.leftAt === null;
  }

  async isCreator(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { createdById: true },
    });

    return conversation?.createdById === userId;
  }

  async addParticipant(conversationId: string, userId: string) {
    return this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      create: { conversationId, userId },
      update: { leftAt: null },
      select: participantSelect,
    });
  }

  async closeConversation(conversationId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.CLOSED,
        closedAt: new Date(),
      },
      include: conversationInclude,
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.prisma.conversation.delete({ where: { id: conversationId } });
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    body: string,
  ) {
    return this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body,
        status: MessageStatus.SENT,
      },
      select: messageSelect,
    });
  }
}
