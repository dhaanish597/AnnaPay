/*
  # Add college column to notification_logs
*/

ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS college text;
