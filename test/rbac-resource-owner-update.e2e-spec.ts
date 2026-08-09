import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';

import {
  Test,
  TestingModule,
} from '@nestjs/testing';

import request from 'supertest';

import { AppModule } from '../src/app.module';

import { TokenService } from '../src/auth/token/token.service';
import { IdentityService } from '../src/auth/identity/identity.service';
import { AuthorizationService } from '../src/authorization/authorization.service';

import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { ChatService } from '../src/chat/chat.service';

import { UserStatus } from '@prisma/client';


describe(
'RBAC resource owner update flow',
()=>{

let app: INestApplication;
let tokenService: TokenService;


const USER_A =
'78a990d0-bfc1-4f55-a453-3a0b5fd9b347';


const USER_B =
'99999999-bfc1-4f55-a453-999999999999';


const CONVERSATION_ID =
'55555555-5555-4555-8555-555555555555';


let currentUser =
USER_A;



const authorizationMock = {

hasUserPermission:
jest.fn(
async()=>true
),

hasAllUserPermissions:
jest.fn(
async()=>true
),

hasAnyUserPermission:
jest.fn(
async()=>true
),

getUserPermissions:
jest.fn(
async()=>new Set([
'chat:update'
])
),

listUserPermissions:
jest.fn(
async()=>[
'chat:update'
]
),

};



const identityMock = {

validateAccessUser:
jest.fn(
async()=>({

id:
currentUser,

email:
`${currentUser}@example.com`,

username:
'user',

roles:[
'USER'
],

status:
UserStatus.ACTIVE,

emailVerified:true,

})
),

};



const prismaMock = {


conversation:{


findUnique:
jest.fn<
Promise<{createdById:string}|null>,
[]
>(
async()=>({

createdById:
USER_A,

})
),

},


};



const chatMock = {

updateConversation:
jest.fn(
async(
userId:string,
conversationId:string,
subject:string
)=>({

id:
conversationId,

createdById:
userId,

subject,

})
),

};



beforeAll(
async()=>{


process.env.JWT_ACCESS_SECRET =
'test-access-secret';


process.env.JWT_REFRESH_SECRET =
'test-refresh-secret';



const moduleRef:TestingModule =

await Test
.createTestingModule({

imports:[
AppModule
]

})

.overrideProvider(
AuthorizationService
)

.useValue(
authorizationMock
)


.overrideProvider(
IdentityService
)

.useValue(
identityMock
)


.overrideProvider(
ChatService
)

.useValue(
chatMock
)


.overrideProvider(
PrismaService
)

.useValue(
prismaMock
)


.overrideProvider(
RedisService
)

.useValue({

get:
jest.fn(
async()=>null
),

set:
jest.fn(
async()=>undefined
),

del:
jest.fn(
async()=>undefined
),

publish:
jest.fn(
async()=>undefined
),

subscribeInvalidation:
jest.fn(
async()=>undefined
),

onModuleDestroy:
jest.fn(
async()=>undefined
),

})


.compile();



app =
moduleRef.createNestApplication();


app.useGlobalPipes(

new ValidationPipe({

whitelist:true,

forbidNonWhitelisted:true,

transform:true,

})

);


await app.init();



tokenService =
moduleRef.get(
TokenService
);


}

);



afterAll(
async()=>{

await app.close();

}

);



async function createToken(
userId:string
){

currentUser =
userId;


const result =

await tokenService.issue(

{

id:
userId,

email:
`${userId}@example.com`,

},

'session-id'

);


return result.accessToken;

}



it(
'owner can update own conversation',
async()=>{


const jwt =
await createToken(USER_A);



await request(
app.getHttpServer()
)

.patch(
`/chat/conversations/${CONVERSATION_ID}`
)

.send({

subject:
'Updated subject'

})

.set(
'Authorization',
`Bearer ${jwt}`
)

.expect(200);


}

);



it(
'user cannot update чужу conversation',
async()=>{


const jwt =
await createToken(USER_B);



await request(
app.getHttpServer()
)

.patch(
`/chat/conversations/${CONVERSATION_ID}`
)

.send({

subject:
'Hacked title'

})

.set(
'Authorization',
`Bearer ${jwt}`
)

.expect(403);


}

);



it(
'missing conversation returns 403',
async()=>{


prismaMock.conversation.findUnique
.mockResolvedValue(
null
);



const jwt =
await createToken(USER_A);



await request(
app.getHttpServer()
)

.patch(
`/chat/conversations/${CONVERSATION_ID}`
)

.send({

subject:
'New title'

})

.set(
'Authorization',
`Bearer ${jwt}`
)

.expect(403);


}

);


});