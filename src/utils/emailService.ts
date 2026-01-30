import { supabase } from '@/integrations/supabase/client';

interface BookingEmailParams {
  to_email: string;
  to_name: string;
  toll_name: string;
  booking_date: string;
  time_slot: string;
  amount: number;
  booking_type: 'Express Lane' | 'FasTag Lane';
  distance?: number;
}

export const sendBookingConfirmationEmail = async (params: BookingEmailParams): Promise<boolean> => {
  try {
    // Call the Edge Function (server-side) to send emails
    // This bypasses EmailJS domain restrictions since the request comes from Supabase servers
    const { data, error } = await supabase.functions.invoke('send-booking-email', {
      body: params,
    });

    if (error) {
      console.error('Failed to send booking confirmation email:', error);
      return false;
    }

    if (!data?.success) {
      console.error('Email sending failed:', data?.error);
      return false;
    }

    console.log('Booking confirmation email sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    return false;
  }
};
