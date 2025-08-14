-- Add 'refund' status to booking_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'refund' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'booking_status')) THEN
        ALTER TYPE booking_status ADD VALUE 'refund';
    END IF;
END $$;

-- Add RLS policy for admins to update all bookings
CREATE POLICY "Admins can update all bookings" 
ON bookings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'::user_role
  )
);