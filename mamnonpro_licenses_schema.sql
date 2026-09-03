-- MamNonPro License System Schema
-- Chạy trong Supabase SQL Editor

CREATE TABLE IF NOT EXISTS mamnonpro_licenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    school_name TEXT NOT NULL,
    contact_name TEXT DEFAULT '',
    contact_phone TEXT DEFAULT '',
    plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'school', 'premium')),
    max_classes INT DEFAULT 1,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    gas_project_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ
);

ALTER TABLE mamnonpro_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access" ON mamnonpro_licenses FOR ALL USING (false);
CREATE INDEX IF NOT EXISTS idx_mnp_licenses_key ON mamnonpro_licenses(key);