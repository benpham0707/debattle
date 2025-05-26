-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable realtime for the rooms table (skip if already exists)
-- ALTER PUBLICATION supabase_realtime ADD TABLE rooms; -- Comment out since it already exists

-- USERS table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_debates INTEGER DEFAULT 0
);

-- ROOMS table with side selection voting
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT CHECK (status IN ('waiting', 'side_selection', 'ready_to_start', 'debating', 'finished')) DEFAULT 'waiting',
    topic TEXT NOT NULL,
    player_a_id UUID,  -- No foreign key (allows NULL for guests)
    player_b_id UUID,  -- No foreign key (allows NULL for guests)
    player_a_name TEXT, -- Store guest names directly
    player_b_name TEXT, -- Store guest names directly
    player_a_ready BOOLEAN DEFAULT FALSE, -- Ready state for Player A
    player_b_ready BOOLEAN DEFAULT FALSE, -- Ready state for Player B
    
    -- Side selection voting fields
    player_a_side_vote TEXT CHECK (player_a_side_vote IN ('pro', 'con')), -- What player A voted for
    player_b_side_vote TEXT CHECK (player_b_side_vote IN ('pro', 'con')), -- What player B voted for
    player_a_side TEXT CHECK (player_a_side IN ('pro', 'con')), -- Final assigned side for player A
    player_b_side TEXT CHECK (player_b_side IN ('pro', 'con')), -- Final assigned side for player B
    side_selection_deadline TIMESTAMP WITH TIME ZONE, -- When voting ends
    
    player_a_health INTEGER DEFAULT 100,
    player_b_health INTEGER DEFAULT 100,
    current_phase TEXT CHECK (current_phase IN ('side_selection', 'opening_prep', 'opening', 'rebuttal', 'crossfire', 'final', 'judging')),
    
    -- Phase timing
    phase_start_time TIMESTAMP WITH TIME ZONE,
    phase_duration INTEGER, -- Duration in seconds
    
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
    phase TEXT CHECK (phase IN ('side_selection', 'opening', 'rebuttal', 'crossfire', 'final', 'judging')) NOT NULL,
    player_side TEXT CHECK (player_side IN ('pro', 'con')) NOT NULL
);

-- DEBATE_ROUNDS table - to track AI judging results per phase
CREATE TABLE IF NOT EXISTS debate_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    phase TEXT CHECK (phase IN ('opening', 'rebuttal', 'crossfire', 'final')) NOT NULL,
    
    -- AI Judging Results
    ai_judgment JSONB, -- Store full AI response
    player_a_score INTEGER, -- Score out of 100
    player_b_score INTEGER, -- Score out of 100
    winner TEXT CHECK (winner IN ('player_a', 'player_b', 'tie')), -- Round winner
    health_damage INTEGER, -- How much HP the losing player lost
    
    -- Performance metrics
    player_a_clarity_score INTEGER,
    player_a_logic_score INTEGER,
    player_a_rebuttal_score INTEGER,
    player_a_persuasion_score INTEGER,
    
    player_b_clarity_score INTEGER,
    player_b_logic_score INTEGER,
    player_b_rebuttal_score INTEGER,
    player_b_persuasion_score INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_player_a ON rooms(player_a_id);
CREATE INDEX IF NOT EXISTS idx_rooms_player_b ON rooms(player_b_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_debate_rounds_room_id ON debate_rounds(room_id);
CREATE INDEX IF NOT EXISTS idx_debate_rounds_phase ON debate_rounds(phase);

-- DEVELOPMENT ONLY - Disable RLS for MVP
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE debate_rounds DISABLE ROW LEVEL SECURITY;

-- Grant full permissions for development
GRANT ALL ON users TO public;
GRANT ALL ON rooms TO public;
GRANT ALL ON messages TO public;
GRANT ALL ON debate_rounds TO public;

-- Ensure realtime is enabled
ALTER TABLE rooms REPLICA IDENTITY FULL;