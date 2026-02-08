-- =============================================
-- Mahean Ahmed Personal Website - Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Stories Table
CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    author_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    image TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Authors Table
CREATE TABLE IF NOT EXISTS authors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bio TEXT,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Profiles Table (User Settings)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    username TEXT,
    email TEXT,
    phone TEXT,
    dob DATE,
    gender TEXT,
    bio TEXT,
    youtube TEXT,
    tiktok TEXT,
    facebook TEXT,
    instagram TEXT,
    address TEXT,
    zip TEXT,
    city TEXT,
    country TEXT,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Trash/Recycle Bin Table
CREATE TABLE IF NOT EXISTS trash (
    id TEXT PRIMARY KEY,
    original_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('story', 'author', 'category')),
    data JSONB NOT NULL,
    name TEXT NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Activity Log Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore', 'permanent_delete', 'login', 'empty_trash')),
    target_type TEXT NOT NULL CHECK (target_type IN ('story', 'author', 'category', 'system')),
    description TEXT NOT NULL,
    user_name TEXT DEFAULT 'Admin',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Login History Table
CREATE TABLE IF NOT EXISTS login_history (
    id TEXT PRIMARY KEY,
    ip TEXT,
    location TEXT,
    device TEXT,
    status TEXT NOT NULL CHECK (status IN ('Success', 'Failed')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Analytics Data Table (Daily Stats)
CREATE TABLE IF NOT EXISTS analytics_daily (
    date DATE PRIMARY KEY,
    visitors INTEGER DEFAULT 0,
    mobile INTEGER DEFAULT 0,
    iphone INTEGER DEFAULT 0,
    pc INTEGER DEFAULT 0,
    other INTEGER DEFAULT 0,
    countries JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_category ON stories(category_id);
CREATE INDEX IF NOT EXISTS idx_stories_date ON stories(date DESC);
CREATE INDEX IF NOT EXISTS idx_trash_type ON trash(type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_timestamp ON login_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_daily(date DESC);

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trash ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access (adjust as needed)
CREATE POLICY "Allow public read access on stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on authors" ON authors FOR SELECT USING (true);
CREATE POLICY "Allow public read access on profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read access on categories" ON categories FOR SELECT USING (true);

-- For admin operations, you'll need to authenticate
-- These policies allow all operations for now (you can restrict later)
CREATE POLICY "Allow all operations on stories" ON stories FOR ALL USING (true);
CREATE POLICY "Allow all operations on authors" ON authors FOR ALL USING (true);
CREATE POLICY "Allow all operations on profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on trash" ON trash FOR ALL USING (true);
CREATE POLICY "Allow all operations on activity_logs" ON activity_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on login_history" ON login_history FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics_daily" ON analytics_daily FOR ALL USING (true);

-- Success message
SELECT 'Database schema created successfully!' as message;
