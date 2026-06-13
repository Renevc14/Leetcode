/*
  Warnings:

  - You are about to drop the column `constrains_md` on the `problems` table. All the data in the column will be lost.
  - Added the required column `constraints_md` to the `problems` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "problems" DROP COLUMN "constrains_md",
ADD COLUMN     "constraints_md" TEXT NOT NULL;
