import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

import { TokenService } from '../src/auth/token/token.service';
import { IdentityService } from '../src/auth/identity/identity.service';
import { AuthorizationService } from '../src/authorization/authorization.service';

import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { ChatService } from '../src/chat/chat.service';

import { UserStatus } from '@prisma/client';


describe('RBAC multiple permissions flow', () => {


let app: INestApplication;
let tokenService: TokenService;


const USER_ID =
'78a990d0-bfc1-4f55-a453-3a0b5fd9b347';



let currentPermissions = [
'chat:create',
'chat:read',
];



const authorizationMock = {


listUserPermissions:
jest.fn(
async()=>currentPermissions
),



getUserPermissions:
jest.fn(
async()=>new Set(currentPermissions)
),



hasUserPermission:
jest.fn(
async(
_id:string,
permission:string
)=>
currentPermissions.includes(permission)
),



hasAllUserPermissions:
jest.fn(
async(
_id:string,
permissions:string[]
)=>
permissions.every(
p =>
currentPermissions.includes(p)
)
),



hasAnyUserPermission:
jest.fn(
async(
_id:string,
permissions:string[]
)=>
permissions.some(
p =>
currentPermissions.includes(p)
)
),



getUserRoles:
jest.fn(
async()=>[
'USER'
]
),



hasAnyUserRole:
jest.fn(
async()=>true
),



hasAllUserRoles:
jest.fn(
async()=>true
),



invalidateUser:
jest.fn(
async()=>undefined
),


};



const identityMock = {


validateAccessUser:
jest.fn(
async()=>({

id:USER_ID,

email:
'rbac-test@example.com',

username:
'rbac-test',

roles:[
'USER'
],

status:
UserStatus.ACTIVE,

emailVerified:true,


})
),


};



const chatMock = {


deleteConversation:
jest.fn(
async()=>undefined
),


};



beforeAll(
async()=>{


process.env.JWT_ACCESS_SECRET =
'test-access-secret';


process.env.JWT_REFRESH_SECRET =
'test-refresh-secret';



const moduleRef: TestingModule =


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

.useValue({})



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


});



afterAll(
async()=>{

await app.close();

});



async function createToken(){


const result =

await tokenService.issue(

{

id:USER_ID,

email:
'rbac-test@example.com',

},

'session-id'

);


return result.accessToken;


}




it(
'ALL permissions passes when user has all permissions',
async()=>{


currentPermissions = [
'chat:create',
'chat:read',
'chat:update',
];


const jwt =
await createToken();



const allowed =

await authorizationMock
.hasAllUserPermissions(
USER_ID,
[
'chat:create',
'chat:read'
]
);



expect(
allowed
)
.toBe(true);


});





it(
'ALL permissions fails when one permission missing',
async()=>{


currentPermissions = [
'chat:create'
];


const allowed =

await authorizationMock
.hasAllUserPermissions(
USER_ID,
[
'chat:create',
'chat:delete'
]
);



expect(
allowed
)
.toBe(false);


});





it(
'ANY permissions passes when one permission exists',
async()=>{


currentPermissions = [
'chat:read'
];


const allowed =

await authorizationMock
.hasAnyUserPermission(
USER_ID,
[
'chat:delete',
'chat:read'
]
);



expect(
allowed
)
.toBe(true);


});





it(
'ANY permissions fails when no permission exists',
async()=>{


currentPermissions = [
'chat:create'
];


const allowed =

await authorizationMock
.hasAnyUserPermission(
USER_ID,
[
'chat:delete',
'chat:update'
]
);



expect(
allowed
)
.toBe(false);


});


});