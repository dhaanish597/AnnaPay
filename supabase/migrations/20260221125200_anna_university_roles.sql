/*
  # Create roles and users tables, map them, and update notifications constraint

  1. New Tables
    - `roles`: For Anna University notification platform roles
    - `users`: Basic mock users table
    - `user_roles`: Mapping table for users & roles
    
  2. Constraint Changes
    - Update `notifications` role constraint to allow the new roles
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL
);

-- Insert initial university roles
INSERT INTO roles (name) VALUES 
('UNIVERSITY_ADMIN'),
('COLLEGE_ADMIN'),
('FINANCE_OFFICER'),
('FACULTY'),
('IT_SUPPORT')
ON CONFLICT (name) DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create mapping table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Update notifications check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_role_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_role_check 
CHECK (role IN ('UNIVERSITY_ADMIN', 'COLLEGE_ADMIN', 'FINANCE_OFFICER', 'FACULTY', 'IT_SUPPORT'));
