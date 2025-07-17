import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { MapPin, Navigation, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

interface TollBooth {
  id: string;
  name: string;
  highway: string; // Added from Supabase schema
  express_lane_fee: number; // Changed from expressCharge to match DB
  latitude: number;
  longitude: number;
  distance?: number;
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

interface NearbyTollsProps {
  onClose: () => void;
  onSelectToll: (tollId: string) => void;
}

const NearbyTolls = ({ onClose, onSelectToll }: NearbyTollsProps) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyTolls, setNearbyTolls] = useState<TollBooth[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Fetch toll booths after getting location
        fetchTollBooths(latitude, longitude);
        
        toast({
          title: "Location Found",
          description: "Location detected successfully",
        });
      },
      (error) => {
        setLocationError('Unable to retrieve your location');
        setLoading(false);
        toast({
          title: "Location Error",
          description: "Please enable location access to find nearby tolls",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const fetchTollBooths = async (userLat: number, userLng: number) => {
    try {
      const { data, error } = await supabase
        .from('toll_booths')
        .select('*');

      if (error) {
        console.error('Error fetching toll booths:', error);
        toast({
          title: "Error",
          description: "Failed to load toll booths from database",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Calculate distances and filter/sort
      const tollsWithDistance: TollBooth[] = (data || []).map(toll => {
        const tollDistance = calculateDistance(userLat, userLng, toll.latitude, toll.longitude);
        return {
          id: toll.id,
          name: toll.name,
          highway: toll.highway, // Map highway
          express_lane_fee: toll.express_lane_fee,
          latitude: toll.latitude,
          longitude: toll.longitude,
          distance: tollDistance
        };
      });

      // Sort by distance and filter tolls within 20km radius
      const sortedTolls = tollsWithDistance
        .filter(toll => toll.distance! <= 20)
        .sort((a, b) => a.distance! - b.distance!);

      setNearbyTolls(sortedTolls);
      setLoading(false);

      toast({
        title: "Toll Booths Found",
        description: `Found ${sortedTolls.length} toll booths within 20km`,
      });
    } catch (error) {
      console.error('Error in fetchTollBooths from Supabase:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching tolls.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSelectToll = (tollId: string) => {
    onSelectToll(tollId);
    onClose();
  };

  // Assuming a base fee of ₹75 for consistency with BookExpress.tsx
  // In a real application, this should ideally be part of the toll_booths table if dynamic.
  const BASE_TOLL_FEE = 75; 

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-highway-blue">Nearby Toll Booths</CardTitle>
              <CardDescription>
                Toll booths within 20km of your current location
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Navigation className="h-4 w-4 animate-spin" />
                <span>Getting your location and finding nearby toll booths...</span>
              </div>
            </div>
          )}

          {locationError && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Location Access Required</h3>
              <p className="text-gray-500 mb-4">{locationError}</p>
              <Button onClick={getCurrentLocation} className="highway-gradient">
                <Navigation className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {!loading && !locationError && nearbyTolls.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Nearby Tolls</h3>
              <p className="text-gray-500">No toll booths found within 20km of your location</p>
            </div>
          )}

          {!loading && !locationError && nearbyTolls.length > 0 && (
            <div className="space-y-3">
              {nearbyTolls.map((toll) => (
                <div 
                  key={toll.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleSelectToll(toll.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-highway-blue">{toll.name}</h4>
                      <p className="text-sm text-gray-600">{toll.highway}</p> {/* Display highway */}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{toll.distance?.toFixed(1)} km away</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          {/* Assuming average speed of 30 km/hr for time calculation */}
                          <span>~{Math.round((toll.distance! / 30) * 60)} mins</span> 
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-2">
                        ₹{BASE_TOLL_FEE + toll.express_lane_fee}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        Base: ₹{BASE_TOLL_FEE} + Express: ₹{toll.express_lane_fee}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NearbyTolls;
