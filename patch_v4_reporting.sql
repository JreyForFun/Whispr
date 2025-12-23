-- patch_v4_reporting.sql

-- 1. Create Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL,
    reported_id UUID NOT NULL, 
    room_id UUID, -- Optional, if we want to trace connection
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports (reported_id);

-- 3. RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create a report (Insert Only)
CREATE POLICY "Public create report" ON reports FOR INSERT WITH CHECK (true);

-- No public read access. Only admins (service_role) can read reports.
-- (No SELECT policy created = default deny)
