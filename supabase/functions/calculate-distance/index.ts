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

    // Use Directions API for single destination for maximum accuracy (matches Google Maps app)
    if (destinations.length === 1) {
      const directionsUrl = 'https://maps.googleapis.com/maps/api/directions/json'
      const directionsParams = new URLSearchParams({
        origin: origins[0],
        destination: destinations[0],
        mode: 'driving',
        units: 'metric',
        departure_time: 'now',
        traffic_model: 'best_guess',
        region: 'in',
        language: 'en',
        key: GOOGLE_MAPS_API_KEY
      })

      console.log('Directions API Request (Single Destination):', {
        origin: origins[0],
        destination: destinations[0],
        url: `${directionsUrl}?${directionsParams}`,
        timestamp: new Date().toISOString()
      });

      const directionsResponse = await fetch(`${directionsUrl}?${directionsParams}`)
      const directionsData = await directionsResponse.json()

      console.log('Directions API Response:', {
        status: directionsData.status,
        error_message: directionsData.error_message,
        route_found: directionsData.routes?.length > 0,
        first_leg: directionsData.routes?.[0]?.legs?.[0],
        timestamp: new Date().toISOString()
      });

      if (directionsData.status === 'OK' && directionsData.routes.length > 0) {
        const leg = directionsData.routes[0].legs[0]
        const results = [{
          destinationIndex: 0,
          distance: {
            text: leg.distance.text,
            value: leg.distance.value
          },
          duration: {
            text: leg.duration.text,
            value: leg.duration.value
          }
        }]

        return new Response(
          JSON.stringify({ success: true, results }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }
    }

    // Fallback to Distance Matrix API for multiple destinations
    const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json'
    const params = new URLSearchParams({
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      units: 'metric',
      mode: 'driving',
      departure_time: 'now',
      traffic_model: 'best_guess',
      region: 'in',
      language: 'en',
      key: GOOGLE_MAPS_API_KEY
    })

    console.log('Distance Matrix API Request (Multiple Destinations):', {
      origins,
      destinations,
      url: `${baseUrl}?${params}`,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(`${baseUrl}?${params}`)
    const data = await response.json()

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
