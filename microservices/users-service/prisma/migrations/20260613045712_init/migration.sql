-- CreateEnum
CREATE TYPE "UserProblemStatus" AS ENUM ('ATTEMPTED', 'SOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "authentik_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "country_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_problems" (
    "user_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "status" "UserProblemStatus" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_problems_pkey" PRIMARY KEY ("user_id","problem_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_authentik_id_key" ON "users"("authentik_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_name_key" ON "users"("user_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "user_problems" ADD CONSTRAINT "user_problems_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
