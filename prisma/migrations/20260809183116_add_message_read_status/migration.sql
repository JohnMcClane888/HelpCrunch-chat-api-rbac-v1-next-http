-- CreateTable
CREATE TABLE "message_read_receipts" (
"id" UUID NOT NULL,
"messageId" UUID NOT NULL,
"userId" UUID NOT NULL,
"readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "message_read_receipts_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE INDEX "message_read_receipts_messageId_idx"
ON "message_read_receipts"("messageId");


CREATE INDEX "message_read_receipts_userId_idx"
ON "message_read_receipts"("userId");


CREATE UNIQUE INDEX "message_read_receipts_messageId_userId_key"
ON "message_read_receipts"("messageId","userId");


-- AddForeignKey
ALTER TABLE "message_read_receipts"
ADD CONSTRAINT "message_read_receipts_messageId_fkey"
FOREIGN KEY ("messageId")
REFERENCES "messages"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


ALTER TABLE "message_read_receipts"
ADD CONSTRAINT "message_read_receipts_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;