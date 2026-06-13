-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('CPP', 'JAVA', 'PYTHON', 'JAVASCRIPT', 'TYPESCRIPT');

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description_md" TEXT NOT NULL,
    "constrains_md" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "time_limit_ms" INTEGER NOT NULL,
    "memory_limit_mb" INTEGER NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expected_output" TEXT NOT NULL,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_categories" (
    "problem_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "problem_categories_pkey" PRIMARY KEY ("problem_id","category_id")
);

-- CreateTable
CREATE TABLE "problem_languages" (
    "problem_id" TEXT NOT NULL,
    "language" "Language" NOT NULL,

    CONSTRAINT "problem_languages_pkey" PRIMARY KEY ("problem_id","language")
);

-- CreateIndex
CREATE UNIQUE INDEX "problems_slug_key" ON "problems"("slug");

-- CreateIndex
CREATE INDEX "problems_difficulty_idx" ON "problems"("difficulty");

-- CreateIndex
CREATE INDEX "test_cases_problem_id_idx" ON "test_cases"("problem_id");

-- CreateIndex
CREATE INDEX "test_cases_problem_id_is_sample_idx" ON "test_cases"("problem_id", "is_sample");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "problem_categories_category_id_idx" ON "problem_categories"("category_id");

-- CreateIndex
CREATE INDEX "problem_languages_language_idx" ON "problem_languages"("language");

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_categories" ADD CONSTRAINT "problem_categories_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_categories" ADD CONSTRAINT "problem_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_languages" ADD CONSTRAINT "problem_languages_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
