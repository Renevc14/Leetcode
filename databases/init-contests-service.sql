CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contest_status_enum') THEN
        CREATE TYPE contest_status_enum AS ENUM (
            'UPCOMING',
            'LIVE',
            'FINISHED',
            'CANCELLED'
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

CREATE TABLE IF NOT EXISTS contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(128) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status contest_status_enum NOT NULL DEFAULT 'UPCOMING',
    penalty_per_wrong_min INTEGER NOT NULL DEFAULT 20 CHECK (penalty_per_wrong_min >= 0),
    max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0),
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT contests_ends_after_starts CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS contest_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL,
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    score INTEGER NOT NULL DEFAULT 100 CHECK (score > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT contest_problems_contest_problem_key UNIQUE (contest_id, problem_id),
    CONSTRAINT contest_problems_contest_order_key UNIQUE (contest_id, order_index)
);

CREATE TABLE IF NOT EXISTS contest_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT contest_enrollments_contest_user_key UNIQUE (contest_id, user_id)
);

CREATE TABLE IF NOT EXISTS contest_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    final_rank INTEGER NOT NULL CHECK (final_rank > 0),
    problems_solved INTEGER NOT NULL CHECK (problems_solved >= 0),
    total_penalty_minutes INTEGER NOT NULL CHECK (total_penalty_minutes >= 0),
    last_submission_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT contest_results_contest_user_key UNIQUE (contest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contests_status_starts
ON contests(status, starts_at);

CREATE INDEX IF NOT EXISTS idx_contests_ends_at_live
ON contests(ends_at) WHERE status = 'LIVE';

CREATE INDEX IF NOT EXISTS idx_enrollments_user
ON contest_enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_contest
ON contest_enrollments(contest_id);

CREATE INDEX IF NOT EXISTS idx_results_contest_rank
ON contest_results(contest_id, final_rank);

CREATE INDEX IF NOT EXISTS idx_results_user
ON contest_results(user_id);

DROP TRIGGER IF EXISTS set_contests_updated_at ON contests;
CREATE TRIGGER set_contests_updated_at
BEFORE UPDATE ON contests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
