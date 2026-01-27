-- Remove duplicate/redundant indexes to improve write performance

-- 1. Remove idx_activities_microregiao (redundant with idx_activities_microregiao_id)
DROP INDEX IF EXISTS idx_activities_microregiao;

-- 2. Remove idx_objectives_microregiao (redundant with idx_objectives_microregiao_id)
DROP INDEX IF EXISTS idx_objectives_microregiao;

-- Note: idx_objectives_micro_status is a composite index and might be useful for specific queries, 
-- but if we have idx_objectives_microregiao_id, checking just the ID is typically fast enough unless heavily filtering by status too.
-- Keeping idx_objectives_micro_status for now as it serves a different query pattern than just ID lookup.
