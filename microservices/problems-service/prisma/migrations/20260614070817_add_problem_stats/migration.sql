-- CreateTable
CREATE TABLE "problem_stats" (
    "problem_id" TEXT NOT NULL,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "total_accepted" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_stats_pkey" PRIMARY KEY ("problem_id")
);

-- AddForeignKey
ALTER TABLE "problem_stats" ADD CONSTRAINT "problem_stats_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
