import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { TokenService } from '../src/auth/token/token.service';
import { IdentityService } from '../src/auth/identity/identity.service';
import { AuthorizationService } from '../src/authorization/authorization.service';
import { Permission } from '../src/authorization/enums/permission.enum';
import { ChatService } from '../src/chat/chat.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { UserStatus } from '@prisma/client';

type TestUser = {
  id: string;
  email: string;
  username: string;
  permissions: Set<Permission>;
};

const USERS: Record<string, TestUser> = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    username: 'user',
    permissions: new Set([
      Permission.CHAT_READ,
      Permission.CHAT_CREATE,
      Permission.CHAT_DELETE,
    ]),
  },

  noChatPermission: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'limited@example.com',
    username: 'limited',
    permissions: new Set(),
  },

  updateUser: {
    id: '77777777-7777-4777-8777-777777777777',
    email: 'update@example.com',
    username: 'update-user',
    permissions: new Set([
      Permission.CHAT_READ,
      Permission.CHAT_CREATE,
      Permission.CHAT_UPDATE,
    ]),
  },
};

const authenticatedUser = (user: TestUser) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  roles: ['USER'],
  status: UserStatus.ACTIVE,
  emailVerified: true,
  sessionId: '33333333-3333-4333-8333-333333333333',
  jti: '44444444-4444-4444-8444-444444444444',
});


describe('Chat HTTP / RBAC', () => {

  let app: INestApplication;
  let tokenService: TokenService;


  const authorizationMock = {

    hasAllUserPermissions: jest.fn(
      async (userId: string, permissions: Permission[]) => {
        const user = Object.values(USERS)
          .find(u => u.id === userId);

        return Boolean(
          user &&
          permissions.every(p => user.permissions.has(p))
        );
      },
    ),


    hasAnyUserPermission: jest.fn(
      async (userId: string, permissions: Permission[]) => {
        const user = Object.values(USERS)
          .find(u => u.id === userId);

        return Boolean(
          user &&
          permissions.some(p => user.permissions.has(p))
        );
      },
    ),


    hasUserPermission: jest.fn(
      async (userId: string, permission: Permission) => {
        const user = Object.values(USERS)
          .find(u => u.id === userId);

        return Boolean(
          user?.permissions.has(permission)
        );
      },
    ),


    getUserRoles: jest.fn(async () => ['USER']),
    hasAnyUserRole: jest.fn(async () => false),
  };


  const chatMock = {

    listConversations: jest.fn(async () => [
      {
        id: '55555555-5555-4555-8555-555555555555',
      },
    ]),


    createConversation:
      jest.fn(async (userId: string, subject?: string) => ({
        id: '55555555-5555-4555-8555-555555555555',
        createdById: userId,
        subject,
      })),


    getConversation:
      jest.fn(async () => ({
        id: '55555555-5555-4555-8555-555555555555',
      })),


    addParticipant:
      jest.fn(async () => ({
        userId: USERS.user.id,
      })),


    sendMessage:
      jest.fn(async () => ({
        id: '66666666-6666-4666-8666-666666666666',
      })),


    closeConversation:
      jest.fn(async () => ({
        id: '55555555-5555-4555-8555-555555555555',
      })),


    deleteConversation:
      jest.fn(async () => undefined),
  };


  beforeAll(async () => {

    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ISSUER = 'helpcrunch-test';
    process.env.JWT_AUDIENCE = 'helpcrunch-test-api';


    const identityMock = {

      validateAccessUser:
        jest.fn(async (payload: {sub:string}) => {

          const user =
            Object.values(USERS)
              .find(u => u.id === payload.sub);


          if (!user) {
            throw new Error('unknown user');
          }


          return authenticatedUser(user);
        }),
    };


    const moduleRef: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      })


      .overrideProvider(PrismaService)
      .useValue({})


      .overrideProvider(RedisService)
      .useValue({
        get: jest.fn(async()=>null),
        set: jest.fn(async()=>undefined),
        del: jest.fn(async()=>undefined),
        publish: jest.fn(async()=>undefined),
        subscribeInvalidation:
          jest.fn(async()=>undefined),
        onModuleDestroy:
          jest.fn(async()=>undefined),
      })


      .overrideProvider(IdentityService)
      .useValue(identityMock)


      .overrideProvider(AuthorizationService)
      .useValue(authorizationMock)


      .overrideProvider(ChatService)
      .useValue(chatMock)


      .compile();



    app = moduleRef.createNestApplication();


    app.useGlobalPipes(
      new ValidationPipe({
        whitelist:true,
        forbidNonWhitelisted:true,
        transform:true,
      }),
    );


    await app.init();


    tokenService =
      moduleRef.get(TokenService);

  });



  afterAll(async()=>{
    await app.close();
  });



  async function accessToken(user: TestUser)
  {
    const issued =
      await tokenService.issue(
        {
          id:user.id,
          email:user.email,
        },
        authenticatedUser(user).sessionId,
      );


    return issued.accessToken;
  }



  it('401 without JWT', async()=>{

    await request(app.getHttpServer())
      .get('/chat/conversations')
      .expect(401);

  });



  it('403 without chat read', async()=>{

    const token =
      await accessToken(
        USERS.noChatPermission,
      );


    await request(app.getHttpServer())
      .get('/chat/conversations')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(403);

  });



  it('200 list conversations', async()=>{

    const token =
      await accessToken(
        USERS.user,
      );


    await request(app.getHttpServer())
      .get('/chat/conversations')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(200);

  });



  it('201 create conversation', async()=>{

    const token =
      await accessToken(
        USERS.user,
      );


    await request(app.getHttpServer())
      .post('/chat/conversations')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        subject:'Support',
      })
      .expect(201);

  });



  it('400 invalid conversation payload', async()=>{

    const token =
      await accessToken(
        USERS.user,
      );


    await request(app.getHttpServer())
      .post('/chat/conversations')
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        subject:'',
      })
      .expect(400);

  });



  it('403 delete without permission', async()=>{

    const token =
      await accessToken(
        USERS.updateUser,
      );


    await request(app.getHttpServer())
      .delete(
        '/chat/conversations/55555555-5555-4555-8555-555555555555',
      )
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(403);

  });



  it('204 delete with permission', async()=>{

    const token =
      await accessToken(
        USERS.user,
      );


    await request(app.getHttpServer())
      .delete(
        '/chat/conversations/55555555-5555-4555-8555-555555555555',
      )
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(204);

  });



  it('403 close without update permission', async()=>{

    const token =
      await accessToken(
        USERS.user,
      );


    await request(app.getHttpServer())
      .patch(
        '/chat/conversations/55555555-5555-4555-8555-555555555555/close',
      )
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(403);

  });



  it('200 close with update permission', async()=>{

    const token =
      await accessToken(
        USERS.updateUser,
      );


    await request(app.getHttpServer())
      .patch(
        '/chat/conversations/55555555-5555-4555-8555-555555555555/close',
      )
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .expect(200);

  });



  it('403 add participant without update permission', async()=>{

    const token =
      await accessToken(
        USERS.user,
      );


    await request(app.getHttpServer())
      .post(
        '/chat/conversations/55555555-5555-4555-8555-555555555555/participants',
      )
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        userId: USERS.updateUser.id,
      })
      .expect(403);

  });



  it('201 add participant with update permission', async()=>{

    const token =
      await accessToken(
        USERS.updateUser,
      );


    await request(app.getHttpServer())
      .post(
        '/chat/conversations/55555555-5555-4555-8555-555555555555/participants',
      )
      .set(
        'Authorization',
        `Bearer ${token}`,
      )
      .send({
        userId: USERS.user.id,
      })
      .expect(201);

  });


});