-- Add admin_processed field to track admin decisions on bookings
ALTER TABLE public.bookings 
ADD COLUMN admin_processed BOOLEAN DEFAULT FALSE;