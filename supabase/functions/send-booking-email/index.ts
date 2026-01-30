import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BookingEmailRequest {
  to_email: string;
  to_name: string;
  toll_name: string;
  booking_date: string;
  time_slot: string;
  amount: number;
  booking_type: "Express Lane" | "FasTag Lane";
  distance?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
    const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID");
    const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
    const EMAILJS_PRIVATE_KEY = Deno.env.get("EMAILJS_PRIVATE_KEY");

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
      console.error("Missing EmailJS configuration");
      return new Response(
        JSON.stringify({ error: "EmailJS not configured", success: false }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const params: BookingEmailRequest = await req.json();

    // Validate required fields
    if (!params.to_email || !params.toll_name || !params.booking_date || !params.time_slot) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", success: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format the booking date for display
    const formattedDate = new Date(params.booking_date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Prepare template parameters for EmailJS
    const templateParams = {
      to_email: params.to_email,
      to_name: params.to_name || params.to_email.split("@")[0],
      toll_name: params.toll_name,
      booking_date: formattedDate,
      time_slot: params.time_slot,
      amount: `₹${params.amount}`,
      booking_type: params.booking_type,
      distance: params.distance ? `${params.distance.toFixed(2)} km` : "N/A",
    };

    // Call EmailJS REST API with private key for server-to-server authentication
    const emailjsResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: templateParams,
      }),
    });

    if (!emailjsResponse.ok) {
      const errorText = await emailjsResponse.text();
      console.error("EmailJS API error:", emailjsResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `EmailJS API error: ${errorText}`, 
          success: false,
          status: emailjsResponse.status 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Booking confirmation email sent successfully to:", params.to_email);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in send-booking-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
