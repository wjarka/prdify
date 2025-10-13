-- =====================================================================
-- Migration: Initial PRDify Database Schema
-- Created: 2025-10-13
-- Description: Creates the complete database schema for PRDify application
--              including profiles, prds, prd_questions tables with RLS policies
-- 
-- Tables Created:
--   - profiles: User profile data (1:1 with auth.users)
--   - prds: Main PRD documents table
--   - prd_questions: Q&A history for planning sessions
--
-- Security: All tables have RLS enabled with granular policies
-- =====================================================================

-- =====================================================================
-- 1. CREATE ENUM TYPES
-- =====================================================================

-- Create enum type for PRD status tracking
-- This enum represents the lifecycle stages of a PRD document
create type prd_status as enum (
  'planning',         -- Step 1: Planning session with AI
  'planning_review',  -- Step 2: Review of planning summary
  'prd_review',       -- Step 3: Review of generated PRD
  'completed'         -- Process completed
);

-- =====================================================================
-- 2. CREATE TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table: profiles
-- Purpose: Stores additional user profile data (1:1 relation with auth.users)
-- Notes: Separates application data from Supabase Auth data for better modularity
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Table: prds
-- Purpose: Main table storing PRD documents for users
-- Notes: 
--   - summary and content are nullable as they are filled in later steps
--   - Unique constraint ensures user cannot have duplicate PRD names
-- ---------------------------------------------------------------------
create table prds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  main_problem text not null,
  in_scope text not null,
  out_of_scope text not null,
  success_criteria text not null,
  status prd_status not null default 'planning',
  summary text null,  -- Filled during step 2 (planning review)
  content text null,  -- Filled during step 3 (PRD review)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure PRD names are unique per user
  constraint unique_user_prd_name unique(user_id, name)
);

-- ---------------------------------------------------------------------
-- Table: prd_questions
-- Purpose: Stores Q&A history during planning sessions (many:1 with prds)
-- Notes: answer is nullable to support questions awaiting user response
-- ---------------------------------------------------------------------
create table prd_questions (
  id uuid primary key default gen_random_uuid(),
  prd_id uuid not null references prds(id) on delete cascade,
  round_number integer not null,
  question text not null,
  answer text null,  -- NULL if awaiting user response
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 3. CREATE INDEXES
-- =====================================================================

-- Index for efficient lookup of user's PRDs
create index idx_prds_user_id on prds(user_id);

-- Index for efficient lookup of questions by PRD
create index idx_prd_questions_prd_id on prd_questions(prd_id);

-- Composite index for sorting questions by round within a PRD
create index idx_prd_questions_prd_round on prd_questions(prd_id, round_number);

-- =====================================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT AUTOMATION
-- =====================================================================

-- Function to automatically update the updated_at timestamp
-- Security: search_path is set to empty to prevent search_path injection attacks
create or replace function update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for profiles table
create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at_column();

-- Trigger for prds table
create trigger update_prds_updated_at
  before update on prds
  for each row
  execute function update_updated_at_column();

-- Trigger for prd_questions table
create trigger update_prd_questions_updated_at
  before update on prd_questions
  for each row
  execute function update_updated_at_column();

-- =====================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on all tables to ensure data isolation per user
alter table profiles enable row level security;
alter table prds enable row level security;
alter table prd_questions enable row level security;

-- =====================================================================
-- 6. CREATE RLS POLICIES FOR PROFILES TABLE
-- =====================================================================

-- Policy: Allow authenticated users to view their own profile
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_view_own_profile"
  on profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Policy: Allow authenticated users to insert their own profile
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_insert_own_profile"
  on profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Policy: Allow authenticated users to update their own profile
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_update_own_profile"
  on profiles for update
  to authenticated
  using ((select auth.uid()) = id);

-- Policy: Prevent anonymous users from accessing profiles
-- (No select policy for anon means they cannot read any profiles)

-- =====================================================================
-- 7. CREATE RLS POLICIES FOR PRDS TABLE
-- =====================================================================

-- Policy: Allow authenticated users to view their own PRDs
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_view_own_prds"
  on prds for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Policy: Allow authenticated users to create PRDs for themselves
-- Ensures user_id matches the authenticated user
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_create_own_prds"
  on prds for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Policy: Allow authenticated users to update their own PRDs
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_update_own_prds"
  on prds for update
  to authenticated
  using ((select auth.uid()) = user_id);

-- Policy: Allow authenticated users to delete their own PRDs
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_delete_own_prds"
  on prds for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Policy: Prevent anonymous users from accessing PRDs
-- (No policies for anon means they cannot access any PRDs)

-- =====================================================================
-- 8. CREATE RLS POLICIES FOR PRD_QUESTIONS TABLE
-- =====================================================================

-- Policy: Allow authenticated users to view questions of their own PRDs
-- Uses a subquery to verify ownership through the prds table
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_view_questions_of_own_prds"
  on prd_questions for select
  to authenticated
  using (
    exists (
      select 1 from prds
      where prds.id = prd_questions.prd_id
      and prds.user_id = (select auth.uid())
    )
  );

-- Policy: Allow authenticated users to create questions in their own PRDs
-- Verifies that the PRD belongs to the authenticated user
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_create_questions_in_own_prds"
  on prd_questions for insert
  to authenticated
  with check (
    exists (
      select 1 from prds
      where prds.id = prd_questions.prd_id
      and prds.user_id = (select auth.uid())
    )
  );

-- Policy: Allow authenticated users to update questions of their own PRDs
-- Ensures only the owner of the PRD can modify associated questions
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_update_questions_of_own_prds"
  on prd_questions for update
  to authenticated
  using (
    exists (
      select 1 from prds
      where prds.id = prd_questions.prd_id
      and prds.user_id = (select auth.uid())
    )
  );

-- Policy: Allow authenticated users to delete questions of their own PRDs
-- Provides full CRUD control over questions in user's PRDs
-- Performance: auth.uid() wrapped in subquery to evaluate once per query, not per row
create policy "authenticated_users_can_delete_questions_of_own_prds"
  on prd_questions for delete
  to authenticated
  using (
    exists (
      select 1 from prds
      where prds.id = prd_questions.prd_id
      and prds.user_id = (select auth.uid())
    )
  );

-- Policy: Prevent anonymous users from accessing PRD questions
-- (No policies for anon means they cannot access any questions)

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================

