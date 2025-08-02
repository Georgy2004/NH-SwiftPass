import { supabase } from '@/integrations/supabase/client';

export interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  error?: string;
}

// Haversine formula as fallback
const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export async function calculateAccurateDistance(
  userLat: number,
  userLng: number,
  destinations: Array<{ lat: number; lng: number; id: string }>
): Promise<Record<string, DistanceResult>> {
  try {
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
        // Use Haversine as fallback
        const fallbackDistance = calculateHaversineDistance(userLat, userLng, destination.lat, destination.lng);
        results[destination.id] = {
          distance: fallbackDistance,
          duration: fallbackDistance * 2, // Rough estimate: 2 minutes per km
          error: `Google Maps API error: ${result.error}, using fallback calculation`
        };
      } else {
        results[destination.id] = {
          distance: result.distance.value / 1000, // Convert meters to kilometers
          duration: result.duration.value / 60, // Convert seconds to minutes
        };
      }
    });

    return results;

  } catch (error) {
    console.error('Distance calculation failed - Google Maps API unavailable:', error);
    
    // Don't calculate any distances when Google Maps API is unavailable
    throw new Error('Google Maps API unavailable');
  }
}

export function calculateSingleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return calculateHaversineDistance(lat1, lon1, lat2, lon2);
}