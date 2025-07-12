-- Update the function to properly handle AM/PM time parsing and date logic
CREATE OR REPLACE FUNCTION public.update_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update bookings where current time has exceeded the time slot end time
  UPDATE public.bookings 
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

-- Manually run the function once to update existing expired bookings
SELECT public.update_expired_bookings();

-- Schedule the function to run every minute
SELECT cron.schedule(
    'update-expired-bookings',
    '* * * * *', -- Every minute
    'SELECT public.update_expired_bookings();'
);
