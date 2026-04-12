-- IntelliCodeRev database schema
-- Works with local PostgreSQL, Neon, Railway — any standard Postgres
-- Run with: psql -U postgres -d intelliCodeRev -f schema.sql

create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  github_id    bigint unique not null,
  github_login text not null,
  name         text,
  avatar_url   text,
  github_token text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists repos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete cascade,
  github_repo_id bigint unique,
  full_name      text not null,
  owner          text not null,
  name           text not null,
  private        boolean default false,
  auto_review    boolean default false,
  default_branch text default 'main',
  created_at     timestamptz default now()
);

create table if not exists review_jobs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  repo_id       uuid references repos(id) on delete set null,
  owner         text not null,
  repo          text not null,
  branch        text default 'main',
  status        text default 'pending'
                check (status in ('pending','running','complete','failed')),
  trigger       text default 'manual'
                check (trigger in ('manual','webhook','batch','scheduled')),
  summary       text,
  agent_log     jsonb,
  model_used    text,
  duration_ms   int,
  error_message text,
  pr_url        text,
  pr_number     int,
  data          jsonb,
  created_at    timestamptz default now(),
  completed_at  timestamptz
);

create table if not exists findings (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references review_jobs(id) on delete cascade,
  type        text not null
              check (type in ('vulnerability','consistency','format','revision')),
  severity    text not null
              check (severity in ('critical','warning','info')),
  title       text not null,
  description text,
  file        text,
  line_start  int,
  line_end    int,
  cwe         text,
  suggestion  text,
  diff_patch  text,
  data        jsonb,
  created_at  timestamptz default now()
);

create table if not exists batch_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  name         text not null,
  repo_urls    text[],
  status       text default 'pending',
  total        int default 0,
  completed    int default 0,
  failed       int default 0,
  created_at   timestamptz default now(),
  completed_at timestamptz
);

-- Indexes
create index if not exists idx_review_jobs_user   on review_jobs(user_id);
create index if not exists idx_review_jobs_status on review_jobs(status);
create index if not exists idx_findings_job       on findings(job_id);
create index if not exists idx_findings_severity  on findings(severity);
create index if not exists idx_repos_user         on repos(user_id);

-- Enable uuid generation (needed for gen_random_uuid())
create extension if not exists "pgcrypto";
