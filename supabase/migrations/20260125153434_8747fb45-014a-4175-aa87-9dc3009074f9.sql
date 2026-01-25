-- Create vehicles table for multi-vehicle support
CREATE TABLE public.vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_plate TEXT NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'car',
    vehicle_name TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own vehicles
CREATE POLICY "Users can view own vehicles"
ON public.vehicles
FOR SELECT
USING (user_id = auth.uid());

-- Drivers can create their own vehicles
CREATE POLICY "Users can create own vehicles"
ON public.vehicles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Drivers can update their own vehicles
CREATE POLICY "Users can update own vehicles"
ON public.vehicles
FOR UPDATE
USING (user_id = auth.uid());

-- Drivers can delete their own vehicles
CREATE POLICY "Users can delete own vehicles"
ON public.vehicles
FOR DELETE
USING (user_id = auth.uid());

-- Admins can view all vehicles
CREATE POLICY "Admins can view all vehicles"
ON public.vehicles
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
));

-- Create index for faster queries
CREATE INDEX idx_vehicles_user_id ON public.vehicles(user_id);