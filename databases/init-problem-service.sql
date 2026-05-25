CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_enum') THEN
        CREATE TYPE difficulty_enum AS ENUM ('EASY', 'MEDIUM', 'HARD');
    END IF;

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

CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(150) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    constraints TEXT,
    difficulty difficulty_enum NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    time_limit_ms INTEGER NOT NULL CHECK (time_limit_ms > 0),
    memory_limit_mb INTEGER NOT NULL CHECK (memory_limit_mb > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS code_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language language_enum NOT NULL,
    template_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT code_templates_problem_id_language_key UNIQUE (problem_id, language)
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS problem_tags (
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_test_cases_problem_id ON test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_code_templates_problem_id ON code_templates(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_tags_tag_id ON problem_tags(tag_id);

DROP TRIGGER IF EXISTS set_problems_updated_at ON problems;
CREATE TRIGGER set_problems_updated_at
BEFORE UPDATE ON problems
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS set_test_cases_updated_at ON test_cases;
CREATE TRIGGER set_test_cases_updated_at
BEFORE UPDATE ON test_cases
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS set_code_templates_updated_at ON code_templates;
CREATE TRIGGER set_code_templates_updated_at
BEFORE UPDATE ON code_templates
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS set_tags_updated_at ON tags;
CREATE TRIGGER set_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();