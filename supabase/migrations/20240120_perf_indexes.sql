-- Performance Indexes for Radar 2.0
-- Created based on audit of dataService.ts queries

-- 1. Actions Table
-- Optimizes: FILTER by microregiao_id, ORDER by action_id
CREATE INDEX IF NOT EXISTS idx_actions_microregiao_id ON public.actions(microregiao_id);
-- Optimizes: Lookups by UID
CREATE INDEX IF NOT EXISTS idx_actions_uid ON public.actions(uid);
-- Optimizes: Sorting
CREATE INDEX IF NOT EXISTS idx_actions_action_id ON public.actions(action_id);

-- 2. RACI Table
-- Optimizes: JOINs with actions
CREATE INDEX IF NOT EXISTS idx_action_raci_action_id ON public.action_raci(action_id);

-- 3. Comments Table
-- Optimizes: JOINs with actions and ordering by created_at
CREATE INDEX IF NOT EXISTS idx_action_comments_action_id_created_at ON public.action_comments(action_id, created_at);
-- Optimizes: Lookups by author (optional but good for profile view)
CREATE INDEX IF NOT EXISTS idx_action_comments_author_id ON public.action_comments(author_id);

-- 4. Tag Assignments Table
-- Optimizes: JOINs with actions (Note: uses action_uid, not action_id)
CREATE INDEX IF NOT EXISTS idx_action_tag_assignments_action_uid ON public.action_tag_assignments(action_uid);

-- 5. Profiles Table
-- Optimizes: Filtering active users and by microregiao
CREATE INDEX IF NOT EXISTS idx_profiles_microregiao_active ON public.profiles(microregiao_id) WHERE ativo = true;
-- Optimizes: Lookups by ID (usually PK, but good to ensure)
-- CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id); -- Likely exists as PK

-- 6. Objectives and Activities
-- Optimizes: Filtering by microregiao (if column exists and is used)
-- Checking code... dataService.loadObjectives uses microregiao_id
CREATE INDEX IF NOT EXISTS idx_objectives_microregiao_id ON public.objectives(microregiao_id);
CREATE INDEX IF NOT EXISTS idx_activities_microregiao_id ON public.activities(microregiao_id);

-- 7. Analytics/Logs
-- Optimizes: Aggregations by entity_id
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON public.activity_logs(entity_id);
-- Optimizes: Ordering logs by date
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
