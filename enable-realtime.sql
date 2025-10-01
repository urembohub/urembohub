-- Enable real-time for chat tables
-- Run this in your Supabase SQL editor

-- Enable real-time for chat_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;

-- Enable real-time for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Enable real-time for chat_participants
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

-- Verify real-time is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('chat_sessions', 'chat_messages', 'chat_participants');
