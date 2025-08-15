-- Add new enum values to booking_status
ALTER TYPE booking_status ADD VALUE 'FastTag';
ALTER TYPE booking_status ADD VALUE 'fined';

-- Update any existing FastTag bookings if they exist (this is safe to run)
UPDATE bookings SET status = 'FastTag' WHERE status = 'FastTag';