-- Fix Supabase RLS policies to allow service_role to delete chat data
-- Run this in your Supabase SQL editor

-- Grant service_role full access to chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access" ON chat_sessions;
CREATE POLICY "service_role_full_access" ON chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Grant service_role full access to chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access" ON chat_messages;
CREATE POLICY "service_role_full_access" ON chat_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Grant service_role full access to chat_participants
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access" ON chat_participants;
CREATE POLICY "service_role_full_access" ON chat_participants
  FOR ALL USING (auth.role() = 'service_role');

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('chat_sessions', 'chat_messages', 'chat_participants');
