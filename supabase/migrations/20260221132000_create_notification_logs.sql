/*
  # Create API logs table for comprehensive tracking

  1. New Tables
    - `notification_logs`
      - `id` (uuid, primary key)
      - `event_type` (text)
      - `message` (text)
      - `recipient_role` (text) (Mapped to Anna University Roles)
      - `priority` (text) (HIGH, MEDIUM, LOW)
      - `status` (text) (sent, failed, pending)
      - `timestamp` (timestamptz)

  2. Security
    - Enable RLS
    - Grants for authenticated read/insert/update
*/

CREATE TABLE IF NOT EXISTS notification_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    message text NOT NULL,
    recipient_role text NOT NULL CHECK (recipient_role IN ('UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'FINANCE_OFFICER', 'FACULTY', 'IT_SUPPORT')),
    priority text NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
    timestamp timestamptz DEFAULT now()
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all notification logs"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert notification logs"
  ON notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update notification logs"
  ON notification_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can insert notification logs"
  ON notification_logs FOR INSERT
  TO anon
  WITH CHECK (true);
