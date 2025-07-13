
-- Add 'expired' status to the booking_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status' AND 'expired' = ANY(enum_range(NULL::booking_status)::text[])) THEN
        ALTER TYPE booking_status ADD VALUE 'expired';
    END IF;
END $$;

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
    AND (
      -- If booking date is in the past, automatically expire
      booking_date < CURRENT_DATE OR
      -- If booking is for today, check if current time has passed the end time
      (booking_date = CURRENT_DATE AND 
       CURRENT_TIME > (
         -- Parse the end time from time_slot (e.g., "07:11 am - 07:21 am")
         CASE 
           WHEN LOWER(TRIM(split_part(time_slot, ' - ', 2))) LIKE '%pm' AND 
                CAST(split_part(TRIM(split_part(time_slot, ' - ', 2)), ':', 1) AS INTEGER) != 12
           THEN 
             -- PM times (except 12 PM): add 12 hours
             (CAST(split_part(TRIM(split_part(time_slot, ' - ', 2)), ':', 1) AS INTEGER) + 12)::TEXT || ':' || 
             split_part(split_part(TRIM(split_part(time_slot, ' - ', 2)), ':', 2), ' ', 1)
           WHEN LOWER(TRIM(split_part(time_slot, ' - ', 2))) LIKE '%am' AND 
                CAST(split_part(TRIM(split_part(time_slot, ' - ', 2)), ':', 1) AS INTEGER) = 12
           THEN 
             -- 12 AM: convert to 00:xx
             '00:' || split_part(split_part(TRIM(split_part(time_slot, ' - ', 2)), ':', 2), ' ', 1)
           ELSE 
             -- AM times (except 12 AM) and 12 PM: keep as is
             split_part(TRIM(split_part(time_slot, ' - ', 2)), ':', 1) || ':' || 
             split_part(split_part(TRIM(split_part(time_slot, ' - ', 2)), ':', 2), ' ', 1)
         END
       )::TIME)
    );
END;
$$;

-- Create a scheduled job to run every minute to check for expired bookings
SELECT cron.schedule(
    'update-expired-bookings',
    '* * * * *', -- Every minute
    'SELECT update_expired_bookings();'
);

-- Run the function once immediately to update existing bookings
SELECT update_expired_bookings();
