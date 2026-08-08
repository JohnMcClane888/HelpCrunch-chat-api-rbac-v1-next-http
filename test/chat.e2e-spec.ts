import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../src/auth/token/token.service';
import { AuthorizationService } from '../src/authorization/authorization.service';
import { ChatService } from '../src/chat/chat.service';
import { IdentityService } from '../src/auth/identity/identity.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { AppModule } from '../src/app.module';
import { Permission } from '../src/authorization/enums/permission.enum';
import { UserStatus } from '@prisma/client';
import request from 'supertest';

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
    hasAllUserPermissions: jest.fn(async (userId: string, permissions: Permission[]) => {
      const user = Object.values(USERS).find((candidate) => candidate.id === userId);
      return Boolean(user && permissions.every((permission) => user.permissions.has(permission)));
    }),
    hasAnyUserPermission: jest.fn(async (userId: string, permissions: Permission[]) => {
      const user = Object.values(USERS).find((candidate) => candidate.id === userId);
      return Boolean(user && permissions.some((permission) => user.permissions.has(permission)));
    }),
    hasUserPermission: jest.fn(async (userId: string, permission: Permission) => {
      const user = Object.values(USERS).find((candidate) => candidate.id === userId);
      return Boolean(user?.permissions.has(permission));
    }),
    getUserRoles: jest.fn(async () => ['USER']),
    hasAnyUserRole: jest.fn(async () => false),
  };

  const chatMock = {
    listConversations: jest.fn(async () => [{ id: '55555555-5555-4555-8555-555555555555' }]),
    createConversation: jest.fn(async (userId: string, subject?: string) => ({
      id: '55555555-5555-4555-8555-555555555555',
      createdById: userId,
      subject,
    })),
    getConversation: jest.fn(async () => ({ id: '55555555-5555-4555-8555-555555555555' })),
    addParticipant: jest.fn(async () => ({ userId: USERS.user.id })),
    sendMessage: jest.fn(async () => ({ id: '66666666-6666-4666-8666-666666666666' })),
    closeConversation: jest.fn(async () => ({ id: '55555555-5555-4555-8555-555555555555' })),
    deleteConversation: jest.fn(async () => undefined),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ISSUER = 'helpcrunch-test';
    process.env.JWT_AUDIENCE = 'helpcrunch-test-api';
    process.env.JWT_ACCESS_TTL_SECONDS = '900';
    process.env.JWT_REFRESH_TTL_SECONDS = '3600';

    const identityMock = {
      validateAccessUser: jest.fn(async (payload: { sub: string }) => {
        const user = Object.values(USERS).find((candidate) => candidate.id === payload.sub);
        if (!user) throw new Error('unknown test user');
        return authenticatedUser(user);
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RedisService)
      .useValue({
        get: jest.fn(async () => null),
        set: jest.fn(async () => undefined),
        del: jest.fn(async () => undefined),
        publish: jest.fn(async () => undefined),
        subscribeInvalidation: jest.fn(async () => undefined),
        onModuleDestroy: jest.fn(async () => undefined),
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
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    tokenService = moduleRef.get(TokenService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function accessToken(user: TestUser): Promise<string> {
    const issued = await tokenService.issue(
      { id: user.id, email: user.email },
      authenticatedUser(user).sessionId,
    );
    return issued.accessToken;
  }

  it('returns 401 without an access JWT', async () => {
    await request(app.getHttpServer())
      .get('/chat/conversations')
      .expect(401);
  });

  it('returns 403 when JWT is valid but chat:read is missing', async () => {
    const token = await accessToken(USERS.noChatPermission);

    await request(app.getHttpServer())
      .get('/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('returns 200 for an authorized conversation list', async () => {
    const token = await accessToken(USERS.user);

    await request(app.getHttpServer())
      .get('/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([{ id: '55555555-5555-4555-8555-555555555555' }]);
  });

  it('returns 201 when an authorized user creates a conversation', async () => {
    const token = await accessToken(USERS.user);

    await request(app.getHttpServer())
      .post('/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Support conversation' })
      .expect(201)
      .expect({
        id: '55555555-5555-4555-8555-555555555555',
        createdById: USERS.user.id,
        subject: 'Support conversation',
      });
  });

  it('returns 400 for an invalid conversation payload', async () => {
    const token = await accessToken(USERS.user);

    await request(app.getHttpServer())
      .post('/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: '' })
      .expect(400);
  });

  it('returns 204 when an authorized user deletes a conversation', async () => {
    const token = await accessToken(USERS.user);

    await request(app.getHttpServer())
      .delete('/chat/conversations/55555555-5555-4555-8555-555555555555')
      .set('Authorization', `Bearer ${token}`)
      .expect(204)
      .expect('');
  });
});
