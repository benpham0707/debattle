-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_debates INTEGER DEFAULT 0
);

-- ROOMS table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT CHECK (status IN ('waiting', 'debating', 'finished')) DEFAULT 'waiting',
    topic TEXT NOT NULL,
    player_a_id UUID,  -- No foreign key (allows NULL for guests)
    player_b_id UUID,  -- No foreign key (allows NULL for guests)
    player_a_name TEXT, -- Store guest names directly
    player_b_name TEXT, -- Store guest names directly
    player_a_side TEXT CHECK (player_a_side IN ('pro', 'con')),
    player_b_side TEXT CHECK (player_b_side IN ('pro', 'con')),
    player_a_health INTEGER DEFAULT 100,
    player_b_health INTEGER DEFAULT 100,
    current_phase TEXT CHECK (current_phase IN ('opening', 'rebuttal', 'crossfire', 'final', 'judging')),
    winner_id UUID,    -- No foreign key (can be NULL for guest winners)
    winner_name TEXT   -- Store guest winner name
);

-- MESSAGES table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID, -- Allow NULL for guest messages
    sender_name TEXT NOT NULL, -- Always store sender name (from users.username or guest input)
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    phase TEXT CHECK (phase IN ('opening', 'rebuttal', 'crossfire', 'final', 'judging')) NOT NULL,
    player_side TEXT CHECK (player_side IN ('pro', 'con')) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------
-- USERS TABLE POLICIES
-- ----------------------------
CREATE POLICY "Users can view all users"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own stats"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- ----------------------------
-- ROOMS TABLE POLICIES
-- ----------------------------

-- View all active (non-finished) rooms
CREATE POLICY "Anyone can view active rooms"
    ON rooms FOR SELECT
    USING (status != 'finished');

-- ✅ FIXED: Allow anyone to create a room (guest or logged-in)
CREATE POLICY "Public room creation"
    ON rooms FOR INSERT
    TO public
    WITH CHECK (true);

-- ✅ FIXED: Allow room participants (including guests) to update their room
CREATE POLICY "Room participants can update their room"
    ON rooms FOR UPDATE
    USING (
        auth.uid() = player_a_id OR 
        auth.uid() = player_b_id OR
        (player_a_id IS NULL OR player_b_id IS NULL) -- Allow guest room updates
    );

-- Allow cleanup of finished rooms
CREATE POLICY "Anyone can delete finished rooms"
    ON rooms FOR DELETE
    USING (status = 'finished');

-- ----------------------------
-- MESSAGES TABLE POLICIES
-- ----------------------------

-- Allow everyone to view messages in active rooms
CREATE POLICY "Anyone can view messages in active rooms"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rooms
            WHERE rooms.id = messages.room_id
              AND rooms.status != 'finished'
        )
    );

-- ✅ FIXED: Allow room participants (including guests) to send messages
CREATE POLICY "Room participants can insert messages"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rooms r
            WHERE r.id = room_id
              AND (
                  -- Authenticated users
                  (auth.uid() IS NOT NULL AND (r.player_a_id = auth.uid() OR r.player_b_id = auth.uid()))
                  OR
                  -- Guest users (when at least one player slot is NULL, allow message insertion)
                  (auth.uid() IS NULL AND (r.player_a_id IS NULL OR r.player_b_id IS NULL))
              )
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON rooms TO public;
GRANT SELECT, INSERT ON messages TO public;
GRANT SELECT ON users TO public;

-- Test guest room creation (should work now)
INSERT INTO rooms (topic, player_a_id, player_a_name) 
VALUES ('Test Topic', NULL, 'Guest Player');

-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Anyone can create rooms" ON rooms;
DROP POLICY IF EXISTS "Public room creation" ON rooms;
DROP POLICY IF EXISTS "Room participants can update their room" ON rooms;

-- Create completely open policies for development
CREATE POLICY "dev_open_insert" ON rooms FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "dev_open_select" ON rooms FOR SELECT TO public USING (true);
CREATE POLICY "dev_open_update" ON rooms FOR UPDATE TO public USING (true);
CREATE POLICY "dev_open_delete" ON rooms FOR DELETE TO public USING (true);

-- Also open up messages table
DROP POLICY IF EXISTS "Room participants can insert messages" ON messages;
DROP POLICY IF EXISTS "Anyone can view messages in active rooms" ON messages;

CREATE POLICY "dev_open_messages_insert" ON messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "dev_open_messages_select" ON messages FOR SELECT TO public USING (true);
CREATE POLICY "dev_open_messages_update" ON messages FOR UPDATE TO public USING (true);
CREATE POLICY "dev_open_messages_delete" ON messages FOR DELETE TO public USING (true);