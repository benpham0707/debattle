-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_debates INTEGER DEFAULT 0
);

-- Create rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT CHECK (status IN ('waiting', 'debating', 'finished')) DEFAULT 'waiting',
    topic TEXT NOT NULL,
    player_a_id UUID REFERENCES users(id),
    player_b_id UUID REFERENCES users(id),
    player_a_side TEXT CHECK (player_a_side IN ('pro', 'con')),
    player_b_side TEXT CHECK (player_b_side IN ('pro', 'con')),
    player_a_health INTEGER DEFAULT 100,
    player_b_health INTEGER DEFAULT 100,
    current_phase TEXT CHECK (current_phase IN ('opening', 'rebuttal', 'crossfire', 'final', 'judging')),
    winner_id UUID REFERENCES users(id)
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    phase TEXT CHECK (phase IN ('opening', 'rebuttal', 'crossfire', 'final', 'judging')) NOT NULL,
    player_side TEXT CHECK (player_side IN ('pro', 'con')) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all users"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own stats"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Create policies for rooms table
CREATE POLICY "Anyone can view active rooms"
    ON rooms FOR SELECT
    USING (status != 'finished');

CREATE POLICY "Users can create rooms"
    ON rooms FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Room participants can update their room"
    ON rooms FOR UPDATE
    USING (auth.uid() = player_a_id OR auth.uid() = player_b_id);

-- Create policies for messages table
CREATE POLICY "Anyone can view messages in active rooms"
    ON messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM rooms
        WHERE rooms.id = messages.room_id
        AND rooms.status != 'finished'
    ));

CREATE POLICY "Room participants can insert messages"
    ON messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM rooms
        WHERE rooms.id = messages.room_id
        AND (rooms.player_a_id = auth.uid() OR rooms.player_b_id = auth.uid())
    )); 