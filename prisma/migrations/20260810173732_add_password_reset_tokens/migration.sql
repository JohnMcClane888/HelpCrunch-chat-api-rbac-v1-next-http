-- DropForeignKey
ALTER TABLE "user_roles"
DROP CONSTRAINT "user_roles_userId_fkey";

-- AlterTable
ALTER TABLE "user_roles"
DROP CONSTRAINT "user_roles_pkey",
ALTER COLUMN "userId" SET DATA TYPE UUID,
ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId", "roleId");

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key"
ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx"
ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx"
ON "password_reset_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "password_reset_tokens"
ADD CONSTRAINT "password_reset_tokens_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles"
ADD CONSTRAINT "user_roles_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;