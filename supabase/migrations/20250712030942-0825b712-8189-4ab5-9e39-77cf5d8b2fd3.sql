
-- Create a function to update expired bookings
CREATE OR REPLACE FUNCTION update_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update bookings where current time has exceeded the time slot end time
  UPDATE bookings 
  SET status = 'expired'::booking_status,
      updated_at = now()
  WHERE status = 'confirmed'::booking_status
    AND booking_date <= CURRENT_DATE
    AND (
      -- If booking is for today, check if current time has passed the end time
      (booking_date = CURRENT_DATE AND 
       CURRENT_TIME > (split_part(time_slot, ' - ', 2)::time + interval '0 minutes')) OR
      -- If booking date is in the past, automatically expire
      booking_date < CURRENT_DATE
    );
END;
$$;

-- Add 'expired' status to the booking_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status' AND 'expired' = ANY(enum_range(NULL::booking_status)::text[])) THEN
        ALTER TYPE booking_status ADD VALUE 'expired';
    END IF;
END $$;

-- Create a scheduled job to run every minute to check for expired bookings
SELECT cron.schedule(
    'update-expired-bookings',
    '* * * * *', -- Every minute
    'SELECT update_expired_bookings();'
);
