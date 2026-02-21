/*
  # Create notifications table for payroll system

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key) - Unique identifier for each notification
      - `role` (text) - Target role: Admin, HR, or Finance
      - `priority` (text) - Priority level: HIGH, MEDIUM, or LOW
      - `message` (text) - Notification message content
      - `status` (text) - Delivery status: sent or failed
      - `created_at` (timestamptz) - Timestamp when notification was created

  2. Security
    - Enable RLS on `notifications` table
    - Add policy for authenticated users to read all notifications
    - Add policy for authenticated users to insert notifications
    - Add policy for authenticated users to update notification status
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('Admin', 'HR', 'Finance')),
  priority text NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update notification status"
  ON notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can insert notifications"
  ON notifications FOR INSERT
  TO anon
  WITH CHECK (true);