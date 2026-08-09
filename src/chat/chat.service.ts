import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Permission } from '../authorization/enums/permission.enum';
import { AuthorizationService } from '../authorization/authorization.service';

import { PaginationDto } from './dto';



export interface ChatRepository {


  createConversation(
    userId: string,
    subject: string,
  ): Promise<any>;



  findConversation(
    conversationId: string,
  ): Promise<any>;



  listAllConversations(): Promise<any[]>;



  listConversationsForUser(
    userId: string,
    pagination?: {
      skip: number;
      take: number;
    },
  ): Promise<any[]>;



  countConversationsForUser(
    userId: string,
  ): Promise<number>;



  listMessages(
    conversationId: string,
    pagination?: {
      skip: number;
      take: number;
    },
  ): Promise<any[]>;



  countMessages(
    conversationId: string,
  ): Promise<number>;



  isActiveParticipant(
    userId: string,
    conversationId: string,
  ): Promise<boolean>;



  isCreator(
    userId: string,
    conversationId: string,
  ): Promise<boolean>;



  addParticipant(
    conversationId: string,
    userId: string,
  ): Promise<any>;



  closeConversation(
    conversationId: string,
  ): Promise<any>;



  deleteConversation(
    conversationId: string,
  ): Promise<void>;



  updateConversation(
    conversationId: string,
    subject: string,
  ): Promise<any>;



  createMessage(
    conversationId: string,
    userId: string,
    body: string,
  ): Promise<any>;



}



@Injectable()
export class ChatService {


  constructor(
    private readonly chats: ChatRepository,
    private readonly authorization: AuthorizationService,
  ) {}





  async createConversation(
    userId: string,
    subject: string,
  ) {


    return this.chats.createConversation(
      userId,
      subject.trim(),
    );


  }







  async getConversation(
    userId: string,
    conversationId: string,
  ) {


    const isAdmin =
      await this.authorization.hasAnyUserRole(
        userId,
        [
          'ADMIN',
          'AGENT',
        ],
      );



    const conversation =
      await this.chats.findConversation(
        conversationId,
      );



    if (!conversation) {

      throw new ForbiddenException();

    }



    if (!isAdmin) {


      const participant =
        await this.chats.isActiveParticipant(
          userId,
          conversationId,
        );



      if (!participant) {

        throw new ForbiddenException();

      }


    }



    return conversation;


  }








  async sendMessage(
    userId: string,
    conversationId: string,
    body: string,
  ) {



    const conversation =
      await this.chats.findConversation(
        conversationId,
      );



    if (
      !conversation ||
      conversation.status === 'CLOSED'
    ) {

      throw new BadRequestException();

    }






    const allowed =
      await this.authorization.hasAnyUserRole(
        userId,
        [
          'ADMIN',
          'AGENT',
        ],
      );





    if (!allowed) {


      const participant =
        await this.chats.isActiveParticipant(
          userId,
          conversationId,
        );



      if (!participant) {

        throw new ForbiddenException();

      }


    }





    return this.chats.createMessage(
      conversationId,
      userId,
      body,
    );


  }









  async listMessages(
    userId: string,
    conversationId: string,
    pagination?: PaginationDto,
  ) {


    const allowed =
      await this.authorization.hasAnyUserRole(
        userId,
        [
          'ADMIN',
          'AGENT',
        ],
      );



    if (!allowed) {


      const participant =
        await this.chats.isActiveParticipant(
          userId,
          conversationId,
        );



      if (!participant) {

        throw new ForbiddenException();

      }


    }





    const page =
      pagination?.page ?? 1;



    const limit =
      pagination?.limit ?? 20;



    const skip =
      (page - 1) * limit;





    const items =
      await this.chats.listMessages(
        conversationId,
        {
          skip,
          take: limit,
        },
      );





    const total =
      await this.chats.countMessages(
        conversationId,
      );






    return {

      items,

      page,

      limit,

      total,

      pages:
        Math.ceil(total / limit),

    };


  }









  async closeConversation(
    userId: string,
    conversationId: string,
  ) {



    const owner =
      await this.chats.isCreator(
        userId,
        conversationId,
      );



    if (!owner) {

      throw new ForbiddenException();

    }





    return this.chats.closeConversation(
      conversationId,
    );


  }









  async deleteConversation(
    userId: string,
    conversationId: string,
  ) {



    const permission =
      await this.authorization.hasUserPermission(
        userId,
        Permission.CHAT_DELETE,
      );



    if (!permission) {

      throw new ForbiddenException();

    }





    return this.chats.deleteConversation(
      conversationId,
    );


  }









  async updateConversation(
    userId: string,
    conversationId: string,
    subject: string,
  ) {



    const owner =
      await this.chats.isCreator(
        userId,
        conversationId,
      );



    if (!owner) {

      throw new ForbiddenException();

    }





    return this.chats.updateConversation(
      conversationId,
      subject.trim(),
    );


  }









  async listConversations(
    userId: string,
    pagination?: PaginationDto,
  ) {



    const page =
      pagination?.page ?? 1;



    const limit =
      pagination?.limit ?? 20;



    const skip =
      (page - 1) * limit;





    const items =
      await this.chats.listConversationsForUser(
        userId,
        {
          skip,
          take: limit,
        },
      );





    const total =
      await this.chats.countConversationsForUser(
        userId,
      );






    return {

      items,

      page,

      limit,

      total,

      pages:
        Math.ceil(total / limit),

    };


  }









  async addParticipant(
    userId: string,
    conversationId: string,
    participantId: string,
  ) {



    const owner =
      await this.chats.isCreator(
        userId,
        conversationId,
      );



    if (!owner) {

      throw new ForbiddenException();

    }





    return this.chats.addParticipant(
      conversationId,
      participantId,
    );


  }



}