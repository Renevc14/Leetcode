-- CreateEnum
CREATE TYPE "contest_status" AS ENUM ('UPCOMING', 'ONGOING', 'FINISHED', 'CANCELED');

-- CreateTable
CREATE TABLE "contests" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" "contest_status" NOT NULL,
    "max_participants" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_problems" (
    "contest_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "contest_problems_pkey" PRIMARY KEY ("contest_id","problem_id")
);

-- CreateTable
CREATE TABLE "contest_enrollments" (
    "contest_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_enrollments_pkey" PRIMARY KEY ("contest_id","user_id")
);

-- CreateTable
CREATE TABLE "contest_results" (
    "contest_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "solved_count" INTEGER NOT NULL,
    "total_time_minutes" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contest_results_pkey" PRIMARY KEY ("contest_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contests_slug_key" ON "contests"("slug");

-- CreateIndex
CREATE INDEX "contests_status_idx" ON "contests"("status");

-- CreateIndex
CREATE INDEX "contests_starts_at_idx" ON "contests"("starts_at");

-- CreateIndex
CREATE INDEX "contests_ends_at_idx" ON "contests"("ends_at");

-- CreateIndex
CREATE INDEX "contest_problems_contest_id_order_index_idx" ON "contest_problems"("contest_id", "order_index");

-- CreateIndex
CREATE INDEX "contest_enrollments_user_id_idx" ON "contest_enrollments"("user_id");

-- AddForeignKey
ALTER TABLE "contest_problems" ADD CONSTRAINT "contest_problems_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_enrollments" ADD CONSTRAINT "contest_enrollments_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_results" ADD CONSTRAINT "contest_results_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
