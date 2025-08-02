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

    // Construct the Distance Matrix API URL
    const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json'
    const params = new URLSearchParams({
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      units: 'metric',
      mode: 'driving',
      departure_time: 'now', // For real-time traffic
      traffic_model: 'best_guess', // Consider current traffic conditions
      key: GOOGLE_MAPS_API_KEY
    })

    const response = await fetch(`${baseUrl}?${params}`)
    const data = await response.json()

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

  } catch (error) {
    console.error('Distance calculation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
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
