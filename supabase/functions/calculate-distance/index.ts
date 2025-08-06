// @ts-nocheck - Disable TypeScript checking for this Deno file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders }) 
  }

  try {
    const { origins, destinations } = await req.json()

    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured')
    }

    // Construct the Distance Matrix API URL with enhanced parameters for maximum accuracy
    const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json'
    const params = new URLSearchParams({
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      units: 'metric',
      mode: 'driving',
      departure_time: 'now', // For real-time traffic data
      traffic_model: 'optimistic', // Use optimistic traffic for shorter routes
      region: 'in', // India region bias for better local routing
      language: 'en',
      avoid: 'indoor', // Avoid indoor routes for better accuracy
      key: GOOGLE_MAPS_API_KEY
    })

    // Log request details for debugging
    console.log('Distance Matrix API Request:', {
      origins,
      destinations,
      url: `${baseUrl}?${params}`,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(`${baseUrl}?${params}`)
    const data = await response.json()

    // Log detailed response for debugging discrepancies
    console.log('Distance Matrix API Response:', {
      status: data.status,
      error_message: data.error_message,
      results_count: data.rows?.[0]?.elements?.length || 0,
      first_result: data.rows?.[0]?.elements?.[0],
      timestamp: new Date().toISOString()
    });

    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.error_message || data.status}`)
    }

    // Extract distances and durations
    const results = data.rows[0].elements.map((element: any, index: number) => {
      if (element.status === 'OK') {
        return {
          destinationIndex: index,
          distance: {
            text: element.distance.text,
            value: element.distance.value // in meters
          },
          duration: {
            text: element.duration.text,
            value: element.duration.value // in seconds
          }
        }
      } else {
        return {
          destinationIndex: index,
          error: element.status
        }
      }
    })

    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error: unknown) {
    console.error('Distance calculation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
