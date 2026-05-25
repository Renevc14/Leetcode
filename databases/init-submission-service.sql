CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_enum') THEN
        CREATE TYPE language_enum AS ENUM ('PYTHON', 'JAVA', 'TYPESCRIPT', 'CPP');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status_enum') THEN
        CREATE TYPE submission_status_enum AS ENUM (
            'PENDING',
            'ACCEPTED',
            'WRONG_ANSWER',
            'TIME_LIMIT_EXCEEDED',
            'MEMORY_LIMIT_EXCEEDED',
            'RUNTIME_ERROR',
            'COMPILATION_ERROR',
            'INTERNAL_ERROR'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_status_enum') THEN
        CREATE TYPE test_status_enum AS ENUM (
            'ACCEPTED',
            'WRONG_ANSWER',
            'TIME_LIMIT_EXCEEDED',
            'MEMORY_LIMIT_EXCEEDED',
            'RUNTIME_ERROR',
            'COMPILATION_ERROR'
        );
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    problem_id UUID NOT NULL,
    contest_id UUID,
    language language_enum NOT NULL,
    source_code TEXT NOT NULL,
    status submission_status_enum NOT NULL DEFAULT 'PENDING',
    peak_execution_time_ms INTEGER CHECK (peak_execution_time_ms >= 0),
    peak_memory_mb INTEGER CHECK (peak_memory_mb >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL,
    status test_status_enum NOT NULL,
    execution_time_ms INTEGER CHECK (execution_time_ms >= 0),
    memory_used_mb INTEGER CHECK (memory_used_mb >= 0),
    actual_output TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_test_results_submission_id
ON submission_test_results(submission_id);

DROP TRIGGER IF EXISTS set_submissions_updated_at ON submissions;
CREATE TRIGGER set_submissions_updated_at
BEFORE UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();