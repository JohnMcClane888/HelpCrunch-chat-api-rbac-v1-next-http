import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(userId: string, subject: string) {
    return this.prisma.conversation.create({
      data: {
        subject,

        createdById: userId,

        participants: {
          create: {
            userId,
          },
        },
      },
    });
  }

  async findConversation(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },

      include: {
        participants: true,
      },
    });
  }

  async listAllConversations() {
    return this.prisma.conversation.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async listConversationsForUser(
    userId: string,
    pagination?: {
      skip: number;
      take: number;
    },
  ) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },

      skip: pagination?.skip,

      take: pagination?.take,

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async countConversationsForUser(userId: string) {
    return this.prisma.conversation.count({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
    });
  }

  async isActiveParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,

        userId,
      },
    });

    return !!participant;
  }

  async isCreator(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },

      select: {
        createdById: true,
      },
    });

    return conversation?.createdById === userId;
  }

  async addParticipant(conversationId: string, userId: string) {
    return this.prisma.conversationParticipant.create({
      data: {
        conversationId,

        userId,
      },
    });
  }

  async closeConversation(conversationId: string) {
    return this.prisma.conversation.update({
      where: {
        id: conversationId,
      },

      data: {
        status: "CLOSED",
      },
    });
  }

  async deleteConversation(conversationId: string) {
    await this.prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });
  }

  async updateConversation(conversationId: string, subject: string) {
    return this.prisma.conversation.update({
      where: {
        id: conversationId,
      },

      data: {
        subject,
      },
    });
  }

  async createMessage(conversationId: string, userId: string, body: string) {
    return this.prisma.message.create({
      data: {
        conversationId,

        senderId: userId,

        body,
      },
    });
  }
}
