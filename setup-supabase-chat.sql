-- Complete Supabase Chat Setup
-- Run this in your Supabase SQL editor

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_session_id ON chat_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "service_role_all_access_chat_sessions" ON chat_sessions;
DROP POLICY IF EXISTS "service_role_all_access_chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "service_role_all_access_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "service_role_full_access" ON chat_sessions;
DROP POLICY IF EXISTS "service_role_full_access" ON chat_participants;
DROP POLICY IF EXISTS "service_role_full_access" ON chat_messages;

-- Create policies for service_role (backend access)
CREATE POLICY "service_role_all_access_chat_sessions" ON chat_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_access_chat_participants" ON chat_participants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_access_chat_messages" ON chat_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create policies for authenticated users (frontend access)
CREATE POLICY "authenticated_users_read_chat_sessions" ON chat_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_chat_participants" ON chat_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_read_chat_messages" ON chat_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_insert_chat_participants" ON chat_participants
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_users_update_chat_participants" ON chat_participants
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_users_insert_chat_messages" ON chat_messages
  FOR INSERT TO authenticated WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON TABLE chat_sessions TO service_role;
GRANT ALL ON TABLE chat_participants TO service_role;
GRANT ALL ON TABLE chat_messages TO service_role;

GRANT SELECT ON TABLE chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE chat_participants TO authenticated;
GRANT SELECT, INSERT ON TABLE chat_messages TO authenticated;

-- Verify the setup
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('chat_sessions', 'chat_messages', 'chat_participants')
ORDER BY tablename, policyname;
