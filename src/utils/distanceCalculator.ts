import { supabase } from '@/integrations/supabase/client';

export interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  error?: string;
}

export async function calculateAccurateDistance(
  userLat: number,
  userLng: number,
  destinations: Array<{ lat: number; lng: number; id: string }>
): Promise<Record<string, DistanceResult>> {
  try {
    // Log input parameters for debugging
    console.log('Distance Calculation Input:', {
      userLocation: { lat: userLat, lng: userLng },
      destinations: destinations.map(dest => ({
        id: dest.id,
        lat: dest.lat,
        lng: dest.lng
      })),
      timestamp: new Date().toISOString()
    });

    // Prepare origins and destinations for Google Maps API
    const origins = [`${userLat},${userLng}`];
    const destinationCoords = destinations.map(dest => `${dest.lat},${dest.lng}`);

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('calculate-distance', {
      body: {
        origins,
        destinations: destinationCoords
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to calculate distances');
    }

    // Process results and map to destination IDs
    const results: Record<string, DistanceResult> = {};
    
    data.results.forEach((result: any, index: number) => {
      const destination = destinations[index];
      if (result.error) {
        // No fallback - throw error if Google Maps API fails
        throw new Error(`Google Maps API error for destination ${destination.id}: ${result.error}`);
      } else {
        const distanceKm = result.distance.value / 1000;
        const durationMin = result.duration.value / 60;
        
        results[destination.id] = {
          distance: distanceKm,
          duration: durationMin,
        };
        
        // Log individual results for debugging
        console.log(`Distance Result for ${destination.id}:`, {
          tollName: destination.id,
          distance: {
            meters: result.distance.value,
            kilometers: distanceKm,
            text: result.distance.text
          },
          duration: {
            seconds: result.duration.value,
            minutes: durationMin,
            text: result.duration.text
          }
        });
      }
    });

    console.log('Final Distance Results:', results);
    return results;

  } catch (error) {
    console.error('Distance calculation failed - Google Maps API unavailable:', error);
    throw new Error('Google Maps API unavailable - distance calculation failed');
  }
}
