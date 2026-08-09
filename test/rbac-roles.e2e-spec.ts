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
'RBAC roles flow',
()=>{


let app: INestApplication;

let tokenService: TokenService;



const USER_ID =
'78a990d0-bfc1-4f55-a453-3a0b5fd9b347';



const CONVERSATION_ID =
'55555555-5555-4555-8555-555555555555';



let currentRoles:string[] = [
'USER'
];



const rolePermissions = ():string[] => {


if(
currentRoles.includes('ADMIN')
){

return [

'chat:create',

'chat:read',

'chat:update',

'chat:delete',

];

}



if(
currentRoles.includes('USER')
){

return [

'chat:create',

'chat:read',

'chat:delete',

];

}



return [];

};





const authorizationMock = {


getUserRoles:
jest.fn(
async()=>currentRoles
),



listUserPermissions:
jest.fn(
async()=>rolePermissions()
),



getUserPermissions:
jest.fn(
async()=>new Set(
rolePermissions()
)
),



hasUserPermission:
jest.fn(
async(
_id:string,
permission:string
)=>

rolePermissions()
.includes(permission)

),



hasAllUserPermissions:
jest.fn(
async(
_id:string,
permissions:string[]
)=>

permissions.every(
p =>
rolePermissions()
.includes(p)
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
rolePermissions()
.includes(p)
)

),



hasAnyUserRole:
jest.fn(
async(
_id:string,
roles:string[]
)=>

roles.some(
r =>
currentRoles.includes(r)
)

),



hasAllUserRoles:
jest.fn(
async(
_id:string,
roles:string[]
)=>

roles.every(
r =>
currentRoles.includes(r)
)

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
'rbac-user@example.com',

username:
'rbac-user',

roles:
currentRoles,

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



createConversation:
jest.fn(
async(
userId:string,
subject:string
)=>({

id:
CONVERSATION_ID,

createdById:
userId,

subject,

})

),


};





const prismaMock = {


conversation:{


findUnique:
jest.fn(
async()=>({

createdById:
USER_ID,

})

),


},


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







async function createToken(){


const result =

await tokenService.issue(

{

id:USER_ID,

email:
'rbac-user@example.com',

},

'session-id'

);



return result.accessToken;


}








it(
'USER role has chat:delete permission',
async()=>{


currentRoles=[
'USER'
];



const jwt =
await createToken();




const res =

await request(
app.getHttpServer()
)

.get(
'/authorization/me/permissions'
)

.set(
'Authorization',
`Bearer ${jwt}`
);



expect(res.status)
.toBe(200);



expect(
res.body.permissions
)

.toContain(
'chat:delete'
);



}

);







it(
'removing USER role removes permissions',
async()=>{


currentRoles=[];



const jwt =
await createToken();




const res =

await request(
app.getHttpServer()
)

.get(
'/authorization/me/permissions'
)

.set(
'Authorization',
`Bearer ${jwt}`
);



expect(res.status)
.toBe(200);



expect(
res.body.permissions
)

.not

.toContain(
'chat:delete'
);



}

);







it(
'ADMIN role gets elevated permissions',
async()=>{


currentRoles=[
'ADMIN'
];



const jwt =
await createToken();




const res =

await request(
app.getHttpServer()
)

.get(
'/authorization/me/permissions'
)

.set(
'Authorization',
`Bearer ${jwt}`
);



expect(res.status)
.toBe(200);



expect(
res.body.permissions
)

.toEqual(

expect.arrayContaining([

'chat:create',

'chat:read',

'chat:update',

'chat:delete',

])

);



}

);







it(
'ADMIN can delete conversation',
async()=>{


currentRoles=[
'ADMIN'
];



const jwt =
await createToken();




await request(
app.getHttpServer()
)


.delete(
`/chat/conversations/${CONVERSATION_ID}`
)


.set(
'Authorization',
`Bearer ${jwt}`
)


.expect(204);



}

);



});