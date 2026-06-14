/*
  Warnings:

  - You are about to drop the column `authentik_id` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_authentik_id_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "authentik_id";
