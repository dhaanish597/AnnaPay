/*
  # Add resolved status to notification_logs
*/

ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_status_check;
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_status_check 
CHECK (status IN ('sent', 'failed', 'pending', 'resolved'));
