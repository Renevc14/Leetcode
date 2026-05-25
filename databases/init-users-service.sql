CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_enum') THEN
        CREATE TYPE language_enum AS ENUM ('PYTHON', 'JAVA', 'TYPESCRIPT', 'CPP');
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

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    avatar_url VARCHAR(500),
    bio TEXT,
    country_code CHAR(2),
    preferred_language language_enum,
    rating INTEGER NOT NULL DEFAULT 1500 CHECK (rating >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    problems_solved_easy INTEGER NOT NULL DEFAULT 0 CHECK (problems_solved_easy >= 0),
    problems_solved_medium INTEGER NOT NULL DEFAULT 0 CHECK (problems_solved_medium >= 0),
    problems_solved_hard INTEGER NOT NULL DEFAULT 0 CHECK (problems_solved_hard >= 0),
    total_submissions INTEGER NOT NULL DEFAULT 0 CHECK (total_submissions >= 0),
    accepted_submissions INTEGER NOT NULL DEFAULT 0 CHECK (accepted_submissions >= 0),
    acceptance_rate DECIMAL(5,2) CHECK (acceptance_rate IS NULL OR (acceptance_rate >= 0 AND acceptance_rate <= 100)),
    contests_participated INTEGER NOT NULL DEFAULT 0 CHECK (contests_participated >= 0),
    best_rank INTEGER CHECK (best_rank IS NULL OR best_rank > 0),
    last_active_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_rating_desc
ON users(rating DESC) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS set_user_stats_updated_at ON user_stats;
CREATE TRIGGER set_user_stats_updated_at
BEFORE UPDATE ON user_stats
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
