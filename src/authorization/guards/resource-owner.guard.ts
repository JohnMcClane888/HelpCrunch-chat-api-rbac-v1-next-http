import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';


interface RequestUser {
  id?: string;
  sub?: string;
}


@Injectable()
export class ResourceOwnerGuard
implements CanActivate
{

  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {


    const request =
      context
        .switchToHttp()
        .getRequest();



    const user =
      request.user as RequestUser;



    const userId =
      user?.id ?? user?.sub;



    if (!userId) {

      throw new ForbiddenException(
        'User identity missing'
      );

    }



    const conversationId =
      request.params.conversationId;



    if (!conversationId) {

      throw new ForbiddenException(
        'Resource id missing'
      );

    }



    const conversation =
      await this.prisma.conversation.findUnique({

        where: {
          id: conversationId,
        },

        select: {
          createdById: true,
        },

      });



    if (!conversation) {

      throw new ForbiddenException(
        'Resource not found'
      );

    }



    if (
      conversation.createdById !== userId
    ) {

      throw new ForbiddenException(
        'Resource ownership violation'
      );

    }



    return true;

  }

}