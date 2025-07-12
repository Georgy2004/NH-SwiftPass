CREATE OR REPLACE FUNCTION update_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  time_slot_end TIME;
BEGIN
  -- Update bookings where current time has exceeded the time slot end time
  FOR booking_rec IN 
    SELECT id, time_slot, booking_date 
    FROM bookings 
    WHERE status = 'confirmed'::booking_status
      AND booking_date <= CURRENT_DATE
  LOOP
    -- Parse the end time from time_slot (format: "HH:MM am/pm - HH:MM am/pm")
    BEGIN
      time_slot_end := to_timestamp(
        split_part(booking_rec.time_slot, ' - ', 2), 
        'HH:MI am'
      )::time;
      
      -- Update if booking is in the past or time has passed today
      IF booking_rec.booking_date < CURRENT_DATE OR
         (booking_rec.booking_date = CURRENT_DATE AND CURRENT_TIME > time_slot_end)
      THEN
        UPDATE bookings 
        SET status = 'expired'::booking_status,
            updated_at = now()
        WHERE id = booking_rec.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other bookings
      RAISE NOTICE 'Error processing booking %: %', booking_rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$;
