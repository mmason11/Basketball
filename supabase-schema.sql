-- ============================================================
-- Supabase Schema for Morton Potters Girls Basketball Website
-- Run this SQL in the Supabase SQL Editor for a fresh project
-- ============================================================


-- =====================================================
-- DRILLS TABLE
-- =====================================================
CREATE TABLE drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  focus TEXT,
  space_needed TEXT,
  players TEXT,
  duration INTEGER DEFAULT 15,
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- CALENDAR EVENTS TABLE
-- =====================================================
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gender TEXT NOT NULL DEFAULT 'girls',
  date TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT 'varsity',
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_date ON calendar_events(date);
CREATE INDEX idx_calendar_events_team ON calendar_events(team);
CREATE INDEX idx_calendar_events_gender ON calendar_events(gender);


-- =====================================================
-- GAMES TABLE
-- =====================================================
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gender TEXT NOT NULL DEFAULT 'girls',
  team TEXT NOT NULL DEFAULT 'varsity',
  game_id TEXT NOT NULL,
  date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  time TEXT,
  location TEXT,
  home_away TEXT NOT NULL DEFAULT 'home',
  game_type TEXT NOT NULL DEFAULT 'regular',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gender, game_id)
);

CREATE INDEX idx_games_gender ON games(gender);
CREATE INDEX idx_games_date ON games(date);
CREATE INDEX idx_games_team ON games(team);


-- =====================================================
-- GAME DETAILS TABLE
-- =====================================================
CREATE TABLE game_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gender TEXT NOT NULL DEFAULT 'girls',
  game_id TEXT NOT NULL,
  jersey_color TEXT,
  bus_time TEXT,
  address TEXT,
  notes TEXT,
  overrides TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, gender)
);

CREATE INDEX idx_game_details_gender ON game_details(gender);


-- =====================================================
-- PRACTICE PLANS TABLE
-- =====================================================
CREATE TABLE practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gender TEXT NOT NULL DEFAULT 'girls',
  date TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT 'varsity',
  theme TEXT,
  total_time INTEGER DEFAULT 120,
  warmup JSONB DEFAULT '{"duration": 30, "dynamics": "", "conditioning": ""}',
  technical_training JSONB DEFAULT '{"drillId": "", "duration": 15}',
  drill1 JSONB DEFAULT '{"drillId": "", "duration": 20}',
  drill2 JSONB DEFAULT '{"drillId": "", "duration": 30}',
  drill3 JSONB DEFAULT '{"drillId": "", "duration": 20}',
  selected_players JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, team, gender)
);

CREATE INDEX idx_practice_plans_date ON practice_plans(date);
CREATE INDEX idx_practice_plans_team ON practice_plans(team);
CREATE INDEX idx_practice_plans_gender ON practice_plans(gender);


-- =====================================================
-- PLAYERS TABLE
-- =====================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gender TEXT NOT NULL DEFAULT 'girls',
  number INTEGER,
  name TEXT NOT NULL,
  position TEXT,
  year TEXT,
  category TEXT NOT NULL CHECK (category IN ('varsity', 'swing', 'jv')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_category ON players(category);
CREATE INDEX idx_players_gender ON players(gender);


-- =====================================================
-- ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gender TEXT NOT NULL DEFAULT 'girls',
  message TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_gender ON announcements(gender);


-- =====================================================
-- TEAM SETTINGS TABLE
-- =====================================================
CREATE TABLE team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gender TEXT NOT NULL DEFAULT 'girls',
  key TEXT NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, gender)
);

CREATE INDEX idx_team_settings_gender ON team_settings(gender);


-- =====================================================
-- WORKOUTS TABLE (individual exercises / activities)
-- =====================================================
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  muscle_group TEXT,
  equipment TEXT,
  sets TEXT,
  reps TEXT,
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- WEIGHT PLANS TABLE (named workout plans with activity lists)
-- =====================================================
CREATE TABLE weight_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  activities TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_plans ENABLE ROW LEVEL SECURITY;

-- drills
CREATE POLICY "Allow public read on drills" ON drills FOR SELECT USING (true);
CREATE POLICY "Allow public insert on drills" ON drills FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on drills" ON drills FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on drills" ON drills FOR DELETE USING (true);

-- calendar_events
CREATE POLICY "Allow public read on calendar_events" ON calendar_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert on calendar_events" ON calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on calendar_events" ON calendar_events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on calendar_events" ON calendar_events FOR DELETE USING (true);

-- games
CREATE POLICY "Allow public read on games" ON games FOR SELECT USING (true);
CREATE POLICY "Allow public insert on games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on games" ON games FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on games" ON games FOR DELETE USING (true);

-- game_details
CREATE POLICY "Allow public read on game_details" ON game_details FOR SELECT USING (true);
CREATE POLICY "Allow public insert on game_details" ON game_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on game_details" ON game_details FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on game_details" ON game_details FOR DELETE USING (true);

-- practice_plans
CREATE POLICY "Allow public read on practice_plans" ON practice_plans FOR SELECT USING (true);
CREATE POLICY "Allow public insert on practice_plans" ON practice_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on practice_plans" ON practice_plans FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on practice_plans" ON practice_plans FOR DELETE USING (true);

-- players
CREATE POLICY "Allow public read on players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public insert on players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on players" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on players" ON players FOR DELETE USING (true);

-- announcements
CREATE POLICY "Allow public read on announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Allow public insert on announcements" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on announcements" ON announcements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on announcements" ON announcements FOR DELETE USING (true);

-- team_settings
CREATE POLICY "Allow public read on team_settings" ON team_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on team_settings" ON team_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on team_settings" ON team_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on team_settings" ON team_settings FOR DELETE USING (true);

-- workouts
CREATE POLICY "Allow public read on workouts" ON workouts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on workouts" ON workouts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on workouts" ON workouts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on workouts" ON workouts FOR DELETE USING (true);

-- weight_plans
CREATE POLICY "Allow public read on weight_plans" ON weight_plans FOR SELECT USING (true);
CREATE POLICY "Allow public insert on weight_plans" ON weight_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on weight_plans" ON weight_plans FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on weight_plans" ON weight_plans FOR DELETE USING (true);
