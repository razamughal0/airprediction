-- Uplift initial schema (portable PostgreSQL / Supabase)
-- Idempotent: safe for fresh databases and for databases created earlier with
-- `drizzle-kit push`. This migration never drops data.

CREATE TABLE IF NOT EXISTS students (
  id serial PRIMARY KEY,
  student_id varchar(30) NOT NULL,
  name varchar(120) NOT NULL,
  email varchar(180) NOT NULL,
  course varchar(100) NOT NULL,
  year integer NOT NULL DEFAULT 2,
  avatar_color varchar(20) NOT NULL,
  engagement integer NOT NULL,
  quiz_score integer NOT NULL,
  attendance integer NOT NULL,
  late_submissions integer NOT NULL,
  missed_assessments integer NOT NULL,
  risk_score integer NOT NULL,
  last_active timestamptz NOT NULL,
  weekly_activity jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS students_student_id_unique ON students (student_id);
CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique ON students (email);
CREATE INDEX IF NOT EXISTS students_course_idx ON students (course);
CREATE INDEX IF NOT EXISTS students_risk_score_idx ON students (risk_score);

CREATE TABLE IF NOT EXISTS portal_users (
  id serial PRIMARY KEY,
  name varchar(120) NOT NULL,
  email varchar(180) NOT NULL,
  role varchar(20) NOT NULL,
  student_id integer REFERENCES students (id),
  courses jsonb NOT NULL DEFAULT '[]'::jsonb,
  notifications_enabled boolean NOT NULL DEFAULT true,
  weekly_digest boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_users_email_unique ON portal_users (email);
CREATE INDEX IF NOT EXISTS portal_users_role_idx ON portal_users (role);
CREATE INDEX IF NOT EXISTS portal_users_student_id_idx ON portal_users (student_id);

CREATE TABLE IF NOT EXISTS interventions (
  id serial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES students (id),
  author_id integer NOT NULL REFERENCES portal_users (id),
  title varchar(180) NOT NULL,
  type varchar(60) NOT NULL,
  notes text NOT NULL,
  status varchar(25) NOT NULL DEFAULT 'scheduled',
  due_date varchar(12) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interventions_student_id_idx ON interventions (student_id);
CREATE INDEX IF NOT EXISTS interventions_author_id_idx ON interventions (author_id);
CREATE INDEX IF NOT EXISTS interventions_status_idx ON interventions (status);
CREATE INDEX IF NOT EXISTS interventions_due_date_idx ON interventions (due_date);

-- RLS is intentionally not enabled here: the app talks to PostgreSQL with a
-- server-side connection string and enforces role scope in API handlers.
