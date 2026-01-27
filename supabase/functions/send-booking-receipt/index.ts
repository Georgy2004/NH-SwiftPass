import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingReceiptRequest {
  email: string;
  bookingDetails: {
    tollName: string;
    timeSlot: string;
    bookingDate: string;
    amount: number;
    bookingType: 'express' | 'fasttag';
    distance?: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, bookingDetails }: BookingReceiptRequest = await req.json();

    // Validate required fields
    if (!email || !bookingDetails) {
      throw new Error("Missing required fields: email and bookingDetails");
    }

    const { tollName, timeSlot, bookingDate, amount, bookingType, distance } = bookingDetails;

    const bookingTypeLabel = bookingType === 'fasttag' ? 'FasTag Lane' : 'Express Lane';
    const formattedDate = new Date(bookingDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚗 Booking Confirmed!</h1>
              <p style="color: #e0e7ff; margin-top: 8px; font-size: 16px;">${bookingTypeLabel} Booking</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
                Thank you for your booking! Here are your booking details:
              </p>
              
              <!-- Booking Details Card -->
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Toll Booth:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${tollName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time Slot:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${timeSlot}</td>
                  </tr>
                  ${distance ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Distance:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${distance.toFixed(2)} km</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Booking Type:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${bookingTypeLabel}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Amount -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="color: #d1fae5; margin: 0 0 4px 0; font-size: 14px;">Amount Paid</p>
                <p style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">₹${amount}</p>
              </div>
              
              <!-- Instructions -->
              <div style="border-left: 4px solid #3b82f6; padding-left: 16px; margin-bottom: 24px;">
                <h3 style="color: #1e40af; margin: 0 0 8px 0; font-size: 16px;">📋 Important Instructions</h3>
                <ul style="color: #4b5563; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Arrive at the toll booth during your allocated time slot</li>
                  <li>Use the designated ${bookingTypeLabel} only</li>
                  <li>Keep this email as proof of booking</li>
                  <li>Your vehicle license plate will be verified automatically</li>
                </ul>
              </div>
              
              <!-- Support -->
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 0;">
                Questions? Contact our support team for assistance.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} TollExpress. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "TollExpress <onboarding@resend.dev>",
      to: [email],
      subject: `Booking Confirmed - ${bookingTypeLabel} at ${tollName}`,
      html: emailHtml,
    });

    console.log("Booking receipt email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-booking-receipt function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
