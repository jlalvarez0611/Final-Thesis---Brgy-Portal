-- This migration adds the new registration fields to the profiles table
-- Run this in your Supabase SQL Editor

-- First, check if the columns exist before adding them
-- If the profiles table doesn't have these columns, add them:

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS suffix VARCHAR(50),
ADD COLUMN IF NOT EXISTS sex VARCHAR(50),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS place_of_birth VARCHAR(255),
ADD COLUMN IF NOT EXISTS civil_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS nationality VARCHAR(255),
ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20);

-- Make sure is_approved column exists with default false
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Create an index on is_approved for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);

-- Create an index on role for better filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
