/*
  # Audit Trail Sequence
*/

CREATE TABLE IF NOT EXISTS notification_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id uuid NOT NULL REFERENCES notification_logs(id) ON DELETE CASCADE,
    action text NOT NULL, -- 'CREATED', 'RESOLVED', 'ESCALATED', 'SCHEDULED_TRIGGERED'
    actor_identifier text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_notification_id ON notification_audit_logs(notification_id);
