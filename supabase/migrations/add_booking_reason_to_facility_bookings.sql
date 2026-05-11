-- This migration creates the facilities and facility_bookings tables
-- Run this in your Supabase SQL Editor

-- Create the facilities table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.facilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    capacity INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the facility_bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.facility_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_date TIMESTAMPTZ NOT NULL,
    duration_hours INTEGER,
    duration_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    booking_reason TEXT,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing tables (for backwards compatibility)
ALTER TABLE facilities
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS capacity INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE facility_bookings
ADD COLUMN IF NOT EXISTS booking_reason TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_facilities_name ON facilities(name);
CREATE INDEX IF NOT EXISTS idx_facility_bookings_facility_id ON facility_bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_bookings_resident_id ON facility_bookings(resident_id);
CREATE INDEX IF NOT EXISTS idx_facility_bookings_status ON facility_bookings(status);
CREATE INDEX IF NOT EXISTS idx_facility_bookings_booking_date ON facility_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_facility_bookings_is_hidden ON facility_bookings(is_hidden);
CREATE INDEX IF NOT EXISTS idx_facility_bookings_booking_reason ON facility_bookings(booking_reason);

-- Enable Row Level Security
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for facilities
-- Everyone can view facilities
DROP POLICY IF EXISTS "Everyone can view facilities" ON facilities;
CREATE POLICY "Everyone can view facilities" ON facilities
    FOR SELECT USING (true);

-- Only admins can insert/update/delete facilities
DROP POLICY IF EXISTS "Admins can manage facilities" ON facilities;
CREATE POLICY "Admins can manage facilities" ON facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for facility_bookings
-- Residents can view their own bookings
DROP POLICY IF EXISTS "Users can view their own facility bookings" ON facility_bookings;
CREATE POLICY "Users can view their own facility bookings" ON facility_bookings
    FOR SELECT USING (auth.uid() = resident_id);

-- Residents can insert their own bookings
DROP POLICY IF EXISTS "Users can create their own facility bookings" ON facility_bookings;
CREATE POLICY "Users can create their own facility bookings" ON facility_bookings
    FOR INSERT WITH CHECK (auth.uid() = resident_id);

-- Residents can update their own pending bookings (to cancel them)
DROP POLICY IF EXISTS "Users can update their own pending facility bookings" ON facility_bookings;
CREATE POLICY "Users can update their own pending facility bookings" ON facility_bookings
    FOR UPDATE USING (auth.uid() = resident_id AND status = 'pending');

-- Admins can view all bookings
DROP POLICY IF EXISTS "Admins can view all facility bookings" ON facility_bookings;
CREATE POLICY "Admins can view all facility bookings" ON facility_bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all bookings (approve/reject)
DROP POLICY IF EXISTS "Admins can update all facility bookings" ON facility_bookings;
CREATE POLICY "Admins can update all facility bookings" ON facility_bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to update updated_at timestamp for facilities
CREATE OR REPLACE FUNCTION update_facility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for facility_bookings
CREATE OR REPLACE FUNCTION update_facility_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old facility bookings
CREATE OR REPLACE FUNCTION cleanup_old_facility_bookings()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete bookings where booking_date is in the past (before current timestamp)
    -- This applies to all statuses: pending, approved, rejected, cancelled
    DELETE FROM facility_bookings
    WHERE booking_date < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (so the application can call it)
GRANT EXECUTE ON FUNCTION cleanup_old_facility_bookings() TO authenticated;