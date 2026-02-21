/*
  # Add scheduled_at column
*/

ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_status_check;
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_status_check 
CHECK (status IN ('sent', 'failed', 'pending', 'resolved', 'escalated', 'scheduled'));
