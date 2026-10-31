-- Air University Enterprise Academic Intelligence & Management Ecosystem Migration
-- Idempotent and non-destructive.

CREATE TABLE IF NOT EXISTS roles (
  id serial PRIMARY KEY,
  code varchar(30) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id serial PRIMARY KEY,
  code varchar(20) NOT NULL UNIQUE,
  name varchar(140) NOT NULL,
  building_code varchar(30) NOT NULL,
  head_name varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS programs (
  id serial PRIMARY KEY,
  code varchar(20) NOT NULL UNIQUE,
  name varchar(160) NOT NULL,
  department_id integer NOT NULL REFERENCES departments(id),
  degree_level varchar(40) NOT NULL DEFAULT 'BS',
  total_credits integer NOT NULL DEFAULT 132,
  duration_years integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_sessions (
  id serial PRIMARY KEY,
  code varchar(30) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  start_date varchar(16) NOT NULL,
  end_date varchar(16) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS semesters (
  id serial PRIMARY KEY,
  program_id integer NOT NULL REFERENCES programs(id),
  semester_number integer NOT NULL,
  name varchar(80) NOT NULL,
  session_id integer REFERENCES academic_sessions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buildings (
  id serial PRIMARY KEY,
  code varchar(30) NOT NULL UNIQUE,
  name varchar(140) NOT NULL,
  building_type varchar(50) NOT NULL,
  floors integer NOT NULL DEFAULT 3,
  pos_x numeric(6,2) NOT NULL DEFAULT 0,
  pos_z numeric(6,2) NOT NULL DEFAULT 0,
  color varchar(20) NOT NULL DEFAULT '#1e6091',
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS classrooms (
  id serial PRIMARY KEY,
  code varchar(40) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  building_id integer NOT NULL REFERENCES buildings(id),
  room_type varchar(40) NOT NULL DEFAULT 'Lecture Hall',
  capacity integer NOT NULL DEFAULT 40,
  floor integer NOT NULL DEFAULT 1,
  has_multimedia boolean NOT NULL DEFAULT true,
  has_lab_pcs boolean NOT NULL DEFAULT false
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS semester_number integer NOT NULL DEFAULT 3;
ALTER TABLE students ADD COLUMN IF NOT EXISTS section_code varchar(30) NOT NULL DEFAULT 'BSAI-S3-A';
ALTER TABLE students ADD COLUMN IF NOT EXISTS program_id integer;
ALTER TABLE students ADD COLUMN IF NOT EXISTS department_id integer;
ALTER TABLE students ADD COLUMN IF NOT EXISTS semester_id integer;
ALTER TABLE students ADD COLUMN IF NOT EXISTS section_id integer;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gpa numeric(4,2) NOT NULL DEFAULT 3.10;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cgpa numeric(4,2) NOT NULL DEFAULT 3.15;
ALTER TABLE students ADD COLUMN IF NOT EXISTS earned_credits integer NOT NULL DEFAULT 36;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_cr boolean NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS warning_level varchar(30) NOT NULL DEFAULT 'Low Risk';
ALTER TABLE students ADD COLUMN IF NOT EXISTS status varchar(30) NOT NULL DEFAULT 'active';

ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS password_hash varchar(200) NOT NULL DEFAULT '';
ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS is_cr boolean NOT NULL DEFAULT false;
ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS department_id integer;

CREATE TABLE IF NOT EXISTS sections (
  id serial PRIMARY KEY,
  code varchar(30) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  program_id integer NOT NULL REFERENCES programs(id),
  program_code varchar(20) NOT NULL,
  semester_id integer NOT NULL REFERENCES semesters(id),
  semester_number integer NOT NULL,
  advisor_name varchar(120) NOT NULL,
  cr_student_id integer,
  capacity integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teachers (
  id serial PRIMARY KEY,
  user_id integer REFERENCES portal_users(id),
  employee_id varchar(30) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  email varchar(180) NOT NULL UNIQUE,
  designation varchar(100) NOT NULL,
  primary_department_id integer NOT NULL REFERENCES departments(id),
  primary_department_code varchar(20) NOT NULL,
  additional_departments jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_programs jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_weekly_hours integer NOT NULL DEFAULT 18,
  office_room varchar(60) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id serial PRIMARY KEY,
  code varchar(30) NOT NULL,
  name varchar(160) NOT NULL,
  program_id integer NOT NULL REFERENCES programs(id),
  program_code varchar(20) NOT NULL,
  department_id integer NOT NULL REFERENCES departments(id),
  semester_number integer NOT NULL,
  credit_hours integer NOT NULL DEFAULT 3,
  course_type varchar(30) NOT NULL DEFAULT 'Core',
  status varchar(30) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courses_program_sem_idx ON courses(program_code, semester_number);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id serial PRIMARY KEY,
  teacher_id integer NOT NULL REFERENCES teachers(id),
  course_id integer NOT NULL REFERENCES courses(id),
  program_id integer NOT NULL REFERENCES programs(id),
  semester_id integer NOT NULL REFERENCES semesters(id),
  section_id integer NOT NULL REFERENCES sections(id),
  classroom_id integer NOT NULL REFERENCES classrooms(id),
  weekly_sessions integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id serial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES students(id),
  course_id integer NOT NULL REFERENCES courses(id),
  section_id integer NOT NULL REFERENCES sections(id),
  semester_number integer NOT NULL,
  teacher_id integer NOT NULL REFERENCES teachers(id),
  attendance_pct integer NOT NULL DEFAULT 85,
  quiz_marks numeric(5,2) NOT NULL DEFAULT 12.00,
  assignment_marks numeric(5,2) NOT NULL DEFAULT 12.00,
  midterm_marks numeric(5,2) NOT NULL DEFAULT 22.00,
  final_marks numeric(5,2) NOT NULL DEFAULT 30.00,
  total_marks numeric(5,2) NOT NULL DEFAULT 76.00,
  letter_grade varchar(5) NOT NULL DEFAULT 'B+',
  grade_points numeric(3,2) NOT NULL DEFAULT 3.30,
  status varchar(30) NOT NULL DEFAULT 'enrolled',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enrollments_student_idx ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON enrollments(course_id);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id serial PRIMARY KEY,
  program_id integer NOT NULL REFERENCES programs(id),
  program_code varchar(20) NOT NULL,
  semester_id integer NOT NULL REFERENCES semesters(id),
  semester_number integer NOT NULL,
  section_id integer NOT NULL REFERENCES sections(id),
  section_code varchar(30) NOT NULL,
  course_id integer NOT NULL REFERENCES courses(id),
  course_code varchar(30) NOT NULL,
  course_name varchar(160) NOT NULL,
  teacher_id integer NOT NULL REFERENCES teachers(id),
  teacher_name varchar(120) NOT NULL,
  classroom_id integer NOT NULL REFERENCES classrooms(id),
  classroom_code varchar(40) NOT NULL,
  day_of_week varchar(20) NOT NULL,
  session_slot varchar(20) NOT NULL,
  start_time varchar(20) NOT NULL,
  end_time varchar(20) NOT NULL,
  credit_hours integer NOT NULL DEFAULT 3,
  status varchar(25) NOT NULL DEFAULT 'scheduled'
);

CREATE UNIQUE INDEX IF NOT EXISTS tt_section_day_slot_uniq ON timetable_entries(section_id, day_of_week, session_slot);
CREATE UNIQUE INDEX IF NOT EXISTS tt_teacher_day_slot_uniq ON timetable_entries(teacher_id, day_of_week, session_slot);
CREATE UNIQUE INDEX IF NOT EXISTS tt_classroom_day_slot_uniq ON timetable_entries(classroom_id, day_of_week, session_slot);

CREATE TABLE IF NOT EXISTS cr_assignments (
  id serial PRIMARY KEY,
  section_id integer NOT NULL UNIQUE REFERENCES sections(id),
  section_code varchar(30) NOT NULL,
  program_code varchar(20) NOT NULL,
  semester_number integer NOT NULL,
  student_id integer NOT NULL REFERENCES students(id),
  student_name varchar(120) NOT NULL,
  student_reg_no varchar(40) NOT NULL,
  assigned_by varchar(120) NOT NULL DEFAULT 'System Administrator',
  status varchar(25) NOT NULL DEFAULT 'active',
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id serial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES students(id),
  course_id integer NOT NULL REFERENCES courses(id),
  section_id integer NOT NULL REFERENCES sections(id),
  timetable_entry_id integer REFERENCES timetable_entries(id),
  date varchar(16) NOT NULL,
  session_slot varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'present',
  marked_by varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessments (
  id serial PRIMARY KEY,
  course_id integer NOT NULL REFERENCES courses(id),
  section_id integer NOT NULL REFERENCES sections(id),
  title varchar(160) NOT NULL,
  assessment_type varchar(40) NOT NULL,
  total_marks numeric(5,2) NOT NULL,
  weightage numeric(5,2) NOT NULL,
  due_date varchar(16) NOT NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id serial PRIMARY KEY,
  assessment_id integer NOT NULL REFERENCES assessments(id),
  student_id integer NOT NULL REFERENCES students(id),
  course_id integer NOT NULL REFERENCES courses(id),
  obtained_marks numeric(5,2) NOT NULL,
  total_marks numeric(5,2) NOT NULL,
  graded_by varchar(120) NOT NULL,
  graded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gpa_records (
  id serial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES students(id),
  semester_number integer NOT NULL,
  semester_name varchar(80) NOT NULL,
  credit_hours integer NOT NULL,
  quality_points numeric(6,2) NOT NULL,
  gpa numeric(4,2) NOT NULL,
  cgpa numeric(4,2) NOT NULL,
  course_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backlogs (
  id serial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES students(id),
  course_id integer NOT NULL REFERENCES courses(id),
  course_code varchar(30) NOT NULL,
  course_name varchar(160) NOT NULL,
  program_code varchar(20) NOT NULL,
  semester_number integer NOT NULL,
  credit_hours integer NOT NULL DEFAULT 3,
  failed_grade varchar(8) NOT NULL DEFAULT 'F',
  attempts integer NOT NULL DEFAULT 1,
  status varchar(30) NOT NULL DEFAULT 'uncleared',
  cleared_semester integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_withdrawals (
  id serial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES students(id),
  course_id integer NOT NULL REFERENCES courses(id),
  course_code varchar(30) NOT NULL,
  course_name varchar(160) NOT NULL,
  program_code varchar(20) NOT NULL,
  semester_number integer NOT NULL,
  credit_hours integer NOT NULL DEFAULT 3,
  withdrawal_type varchar(40) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'approved',
  reason text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_by varchar(120) NOT NULL DEFAULT 'System Administrator'
);

CREATE TABLE IF NOT EXISTS academic_warnings (
  id serial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES students(id),
  risk_level varchar(30) NOT NULL,
  risk_score integer NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  gpa_trigger boolean NOT NULL DEFAULT false,
  attendance_trigger boolean NOT NULL DEFAULT false,
  backlog_trigger boolean NOT NULL DEFAULT false,
  withdrawal_trigger boolean NOT NULL DEFAULT false,
  status varchar(30) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id integer REFERENCES portal_users(id),
  role_target varchar(30) NOT NULL DEFAULT 'all',
  section_id integer,
  title varchar(180) NOT NULL,
  message text NOT NULL,
  category varchar(40) NOT NULL DEFAULT 'Academic',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_requests (
  id serial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES students(id),
  student_name varchar(120) NOT NULL,
  section_id integer NOT NULL REFERENCES sections(id),
  section_code varchar(30) NOT NULL,
  program_code varchar(20) NOT NULL,
  request_type varchar(50) NOT NULL,
  subject varchar(180) NOT NULL,
  description text NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'open',
  submitted_by_cr boolean NOT NULL DEFAULT false,
  response_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  actor_user_id integer,
  actor_name varchar(120) NOT NULL,
  actor_role varchar(30) NOT NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(60) NOT NULL,
  entity_id varchar(60) NOT NULL,
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grading_scale (
  id serial PRIMARY KEY,
  letter_grade varchar(8) NOT NULL UNIQUE,
  min_percentage integer NOT NULL,
  max_percentage integer NOT NULL,
  grade_points numeric(3,2) NOT NULL
);
