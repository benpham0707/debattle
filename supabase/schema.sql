-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_debates INTEGER DEFAULT 0
);

-- ROOMS table
CREATE TABLE IF NOT EXISTS rooms (
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
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID, -- Allow NULL for guest messages
    sender_name TEXT, -- Store sender name (nullable for now)
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    phase TEXT CHECK (phase IN ('opening', 'rebuttal', 'crossfire', 'final', 'judging')) NOT NULL,
    player_side TEXT CHECK (player_side IN ('pro', 'con')) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- DEVELOPMENT ONLY - Disable RLS for MVP
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Grant full permissions for development
GRANT ALL ON users TO public;
GRANT ALL ON rooms TO public;
GRANT ALL ON messages TO public;