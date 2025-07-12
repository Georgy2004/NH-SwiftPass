CREATE OR REPLACE FUNCTION public.update_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  current_ist TIMESTAMP;
  start_time TIMESTAMP := clock_timestamp();
BEGIN
  -- Log function start
  RAISE LOG 'update_expired_bookings: Function execution started at %', start_time;
  
  -- Get current time in IST (UTC+5:30)
  current_ist := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::TIMESTAMP;
  RAISE LOG 'update_expired_bookings: Current IST time is %', current_ist;
  
  -- Update expired bookings with detailed error handling
  BEGIN
    UPDATE public.bookings 
    SET status = 'expired'::booking_status,
        updated_at = now()
    WHERE status = 'confirmed'::booking_status
      AND (
        -- Bookings from previous days
        (booking_date < current_ist::DATE) OR
        
        -- Bookings from today with expired time slots
        (booking_date = current_ist::DATE AND 
         current_ist::TIME > (
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
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE LOG 'update_expired_bookings: Updated % bookings to expired status', updated_count;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'update_expired_bookings: ERROR updating bookings - %', SQLERRM;
    RAISE EXCEPTION 'Failed to update bookings: %', SQLERRM;
  END;
  
  -- Log function completion
  RAISE LOG 'update_expired_bookings: Function completed in % milliseconds', 
    (EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  -- Ensure at least one row is returned for Supabase RPC calls
  PERFORM 1;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'update_expired_bookings: CRITICAL ERROR - %', SQLERRM;
  RAISE;
END;
$$;

-- Update the cron job to handle errors
SELECT cron.schedule(
    'update-expired-bookings',
    '* * * * *', -- Every minute
    $$
    BEGIN
      PERFORM public.update_expired_bookings();
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Cron job failed: %', SQLERRM;
    END;
    $$
);

-- Add COMMENT for documentation
COMMENT ON FUNCTION public.update_expired_bookings() IS 
'Updates booking status to "expired" when current time exceeds the booked time slot.
Handles both AM/PM and 24-hour time formats. Uses Asia/Kolkata (IST) timezone for all comparisons.';
