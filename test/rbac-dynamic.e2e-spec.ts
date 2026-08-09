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


describe('Dynamic RBAC revoke flow', () => {


let app: INestApplication;
let tokenService: TokenService;



const USER_ID =
'78a990d0-bfc1-4f55-a453-3a0b5fd9b347';



const CONVERSATION_ID =
'55555555-5555-4555-8555-555555555555';



let userHasDelete = true;




const permissions = (): string[] => {


const base = [

'chat:create',

'chat:read',

'contact:read',

'ticket:create',

'ticket:read',

];



if(userHasDelete){

base.push(
'chat:delete'
);

}



return base;

};






const authorizationMock = {


listUserPermissions:
jest.fn(
async()=>permissions()
),



getUserPermissions:
jest.fn(
async()=>new Set(
permissions()
)
),



hasUserPermission:
jest.fn(
async(
_id:string,
permission:string
)=>
permissions()
.includes(permission)
),




hasAllUserPermissions:
jest.fn(
async(
_id:string,
perms:string[]
)=>{

const current =
permissions();


return perms.every(
p =>
current.includes(p)
);


}
),





hasAnyUserPermission:
jest.fn(
async(
_id:string,
perms:string[]
)=>

perms.some(
p =>
permissions()
.includes(p)
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
'rbac-user-2@example.com',


username:
'rbac-user-2',


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







beforeEach(()=>{


userHasDelete = true;


});









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

.useValue({

conversation:{


findUnique:
jest.fn(
async()=>({

createdById:
USER_ID,


})
),


},


})







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
'rbac-user-2@example.com',


},


'session-id'


);



return result.accessToken;


}









it(
'user initially has chat:delete',
async()=>{


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
'revoke chat:delete',
async()=>{


userHasDelete=false;




const allowed =

await authorizationMock
.hasUserPermission(
USER_ID,
'chat:delete'
);




expect(allowed)
.toBe(false);



}

);









it(
'new JWT no longer contains chat:delete',
async()=>{


userHasDelete=false;




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
'DELETE conversation returns 403 after revoke',
async()=>{


userHasDelete=false;




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


.expect(403);



}

);









it(
'DELETE conversation works with chat:delete permission',
async()=>{


userHasDelete=true;




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









it(
'CHAT DELETE permission can be restored dynamically',
async()=>{


userHasDelete=false;




let jwt =
await createToken();




let res =

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





expect(
res.body.permissions
)

.not

.toContain(
'chat:delete'
);





userHasDelete=true;




jwt =
await createToken();





res =

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





expect(
res.body.permissions
)

.toContain(
'chat:delete'
);



}

);




});