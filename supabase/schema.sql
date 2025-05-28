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
    -- In your current schema, messages phase enum needs updating:
    phase TEXT CHECK (phase IN ('side_selection', 'opening_prep', 'opening', 'rebuttal', 'crossfire', 'final', 'judging')) NOT NULL,
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

-- Database schema updates for enhanced game logic
-- Add these to your existing schema

-- Add judging completion tracking to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS opening_judging_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS rebuttal_judging_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS final_judging_complete BOOLEAN DEFAULT FALSE;

-- Add error tracking for failed judgments
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS opening_judging_error TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS rebuttal_judging_error TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS final_judging_error TEXT;

-- Add last completed phase tracking
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_completed_phase TEXT;

-- Update debate_rounds table to match new structure
ALTER TABLE debate_rounds DROP COLUMN IF EXISTS score_pro;
ALTER TABLE debate_rounds DROP COLUMN IF EXISTS score_con;
ALTER TABLE debate_rounds ADD COLUMN IF NOT EXISTS score_pro INTEGER;
ALTER TABLE debate_rounds ADD COLUMN IF NOT EXISTS score_con INTEGER;
ALTER TABLE debate_rounds ADD COLUMN IF NOT EXISTS health_damage INTEGER DEFAULT 0;

-- Ensure winner column uses correct values
ALTER TABLE debate_rounds DROP CONSTRAINT IF EXISTS debate_rounds_winner_check;
ALTER TABLE debate_rounds ADD CONSTRAINT debate_rounds_winner_check 
  CHECK (winner IN ('pro', 'con', 'tie'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_current_phase ON rooms(current_phase);
CREATE INDEX IF NOT EXISTS idx_rooms_phase_timing ON rooms(phase_start_time, phase_duration);
CREATE INDEX IF NOT EXISTS idx_messages_phase_side ON messages(room_id, phase, player_side);
CREATE INDEX IF NOT EXISTS idx_debate_rounds_room_phase ON debate_rounds(room_id, phase);

-- Function to automatically advance finished games to completion
CREATE OR REPLACE FUNCTION check_game_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- If either player reaches 0 HP, finish the game
  IF NEW.player_a_health <= 0 OR NEW.player_b_health <= 0 THEN
    -- Determine winner
    IF NEW.player_a_health <= 0 AND NEW.player_b_health <= 0 THEN
      -- Both eliminated (tie)
      NEW.status = 'finished';
      NEW.current_phase = NULL;
      NEW.winner_id = NULL;
      NEW.winner_name = 'TIE GAME';
    ELSIF NEW.player_a_health <= 0 THEN
      -- Player B wins
      NEW.status = 'finished';
      NEW.current_phase = NULL;
      NEW.winner_id = NEW.player_b_id;
      NEW.winner_name = COALESCE(NEW.player_b_name, 'Player B');
    ELSE
      -- Player A wins
      NEW.status = 'finished';
      NEW.current_phase = NULL;
      NEW.winner_id = NEW.player_a_id;
      NEW.winner_name = COALESCE(NEW.player_a_name, 'Player A');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic game completion
DROP TRIGGER IF EXISTS trigger_check_game_completion ON rooms;
CREATE TRIGGER trigger_check_game_completion
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION check_game_completion();

-- Stored procedure for phase advancement (called by PhaseManager)
CREATE OR REPLACE FUNCTION advance_room_phase(
  room_id_param UUID,
  new_phase_param TEXT,
  duration_param INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE rooms 
  SET 
    current_phase = new_phase_param,
    phase_start_time = NOW(),
    phase_duration = duration_param,
    last_completed_phase = current_phase
  WHERE id = room_id_param;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure for finishing games
CREATE OR REPLACE FUNCTION finish_game(
  room_id_param UUID,
  winner_id_param UUID DEFAULT NULL,
  winner_name_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE rooms 
  SET 
    status = 'finished',
    current_phase = NULL,
    phase_start_time = NULL,
    phase_duration = NULL,
    winner_id = winner_id_param,
    winner_name = winner_name_param
  WHERE id = room_id_param;
END;
$$ LANGUAGE plpgsql;

-- View for game statistics
CREATE OR REPLACE VIEW game_stats AS
SELECT 
  r.id as room_id,
  r.topic,
  r.status,
  r.current_phase,
  r.player_a_health,
  r.player_b_health,
  r.winner_name,
  COUNT(dr.id) as completed_rounds,
  AVG(CASE WHEN dr.winner = 'pro' THEN dr.score_pro ELSE dr.score_con END) as avg_winning_score,
  SUM(dr.health_damage) as total_damage_dealt,
  r.created_at,
  EXTRACT(EPOCH FROM (COALESCE(r.phase_start_time, NOW()) - r.created_at)) as game_duration_seconds
FROM rooms r
LEFT JOIN debate_rounds dr ON r.id = dr.room_id
GROUP BY r.id, r.topic, r.status, r.current_phase, r.player_a_health, r.player_b_health, r.winner_name, r.created_at, r.phase_start_time;

-- Grant permissions
GRANT ALL ON game_stats TO public;