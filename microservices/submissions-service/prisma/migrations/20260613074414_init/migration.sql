-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('PENDING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('CPP', 'JAVA', 'PYTHON', 'JAVASCRIPT', 'TYPESCRIPT');

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "contest_id" TEXT,
    "language" "Language" NOT NULL,
    "code" TEXT NOT NULL,
    "status" "submission_status" NOT NULL,
    "time_ms" INTEGER,
    "memory_mb" INTEGER,
    "error_message" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "judged_at" TIMESTAMP(3),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_test_case_results" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "status" "submission_status" NOT NULL,
    "execution_time_ms" INTEGER,
    "memory_usage_mb" INTEGER,
    "actual_output" TEXT,

    CONSTRAINT "submission_test_case_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submissions_user_id_problem_id_submitted_at_idx" ON "submissions"("user_id", "problem_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "submissions_contest_id_problem_id_user_id_idx" ON "submissions"("contest_id", "problem_id", "user_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submission_test_case_results_submission_id_test_case_id_idx" ON "submission_test_case_results"("submission_id", "test_case_id");

-- AddForeignKey
ALTER TABLE "submission_test_case_results" ADD CONSTRAINT "submission_test_case_results_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
