import emailjs from '@emailjs/browser';

// EmailJS configuration
// You need to set these values from your EmailJS dashboard (https://dashboard.emailjs.com)
const EMAILJS_SERVICE_ID = 'service_tollexpress'; // Replace with your EmailJS service ID
const EMAILJS_TEMPLATE_ID = 'template_booking';   // Replace with your EmailJS template ID
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';     // Replace with your EmailJS public key

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
  // Check if EmailJS is configured
  if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
    console.warn('EmailJS not configured. Please set up EmailJS credentials in src/utils/emailService.ts');
    return false;
  }

  try {
    const templateParams = {
      to_email: params.to_email,
      to_name: params.to_name || params.to_email.split('@')[0],
      toll_name: params.toll_name,
      booking_date: new Date(params.booking_date).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time_slot: params.time_slot,
      amount: `₹${params.amount}`,
      booking_type: params.booking_type,
      distance: params.distance ? `${params.distance.toFixed(2)} km` : 'N/A',
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Booking confirmation email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    return false;
  }
};

// Instructions for setting up EmailJS:
// 1. Go to https://www.emailjs.com/ and create a free account
// 2. Create an Email Service (connect your Gmail, Outlook, etc.)
// 3. Create an Email Template with these variables:
//    - {{to_email}} - Recipient email
//    - {{to_name}} - Recipient name
//    - {{toll_name}} - Toll booth name
//    - {{booking_date}} - Booking date
//    - {{time_slot}} - Time slot
//    - {{amount}} - Amount paid
//    - {{booking_type}} - Express Lane or FasTag Lane
//    - {{distance}} - Distance from toll
// 4. Get your Service ID, Template ID, and Public Key from the dashboard
// 5. Replace the values at the top of this file
