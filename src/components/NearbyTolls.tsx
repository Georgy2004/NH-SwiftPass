import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { MapPin, Navigation, Clock, X } from 'lucide-react';
import.meta.env.VITE_Maps_API_KEY.

interface TollBooth {
  id: string;
  name: string;
  highway: string; // Added highway based on the database schema
  express_lane_fee: number; // Changed from expressCharge to match schema
  latitude: number;
  longitude: number;
  distance?: number;
}

declare global {
  interface Window {
    google: any;
  }
}

interface NearbyTollsProps {
  onClose: () => void;
  onSelectToll: (tollId: string) => void;
}

// Haversine formula (still useful for display even with Google's distance)
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

const NearbyTolls = ({ onClose, onSelectToll }: NearbyTollsProps) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyTolls, setNearbyTolls] = useState<TollBooth[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure Google Maps API is loaded before trying to use it
    if (window.google) {
      getCurrentLocation();
    } else {
      // Fallback or wait for the API to load if not already present
      // In a real app, you might want a more robust loading mechanism
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_Maps_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => getCurrentLocation();
      script.onerror = () => {
        setLocationError('Failed to load Google Maps API. Check your internet connection or API key.');
        setLoading(false);
      };
      document.head.appendChild(script);
    }
  }, []);

  const getCurrentLocation = () => {
    setLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        findNearbyTollBooths(latitude, longitude);
      },
      (error) => {
        setLocationError('Unable to retrieve your location. Please enable location access.');
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
        maximumAge: 0
      }
    );
  };

  const findNearbyTollBooths = (lat: number, lng: number) => {
    if (!window.google || !window.google.maps.places) {
      setLocationError('Google Places API not loaded.');
      setLoading(false);
      return;
    }

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    const request = {
      location: new window.google.maps.LatLng(lat, lng),
      radius: 20000, // Search within 20 km radius
      type: ['point_of_interest'], // Use generic point_of_interest, then filter
      keyword: 'toll booth' // Search for toll booths
    };

    service.nearbySearch(request, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        const tolls: TollBooth[] = results
          .filter(place => 
            place.name?.toLowerCase().includes('toll') || 
            place.types?.includes('toll_road') || 
            place.types?.includes('highway') // Broaden search
          )
          .map(place => {
            const placeLat = place.geometry?.location?.lat();
            const placeLng = place.geometry?.location?.lng();

            if (placeLat === undefined || placeLng === undefined) {
              return null;
            }

            const distance = calculateDistance(lat, lng, placeLat, placeLng);
            
            // Placeholder for express_lane_fee and highway, as Places API doesn't provide this directly
            // In a real application, you'd match these results with your backend toll_booths database
            // using latitude/longitude or name to get the correct fee and highway info.
            return {
              id: place.place_id || place.name || Math.random().toString(), // Use place_id or name as ID
              name: place.name || 'Unknown Toll Booth',
              highway: 'Unknown Highway', // Placeholder
              express_lane_fee: 50.00, // Placeholder fee
              latitude: placeLat,
              longitude: placeLng,
              distance: distance
            };
          })
          .filter(Boolean) as TollBooth[];

        // Sort by distance and take up to 5 nearest
        const sortedTolls = tolls.sort((a, b) => a.distance! - b.distance!).slice(0, 5);

        setNearbyTolls(sortedTolls);
        setLoading(false);
        toast({
          title: "Toll Booths Found",
          description: `Found ${sortedTolls.length} nearest toll booths.`,
        });
      } else {
        setLocationError('No toll booths found nearby or an error occurred with Places API.');
        setLoading(false);
        toast({
          title: "Search Error",
          description: "Failed to find nearby toll booths.",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectToll = (tollId: string) => {
    onSelectToll(tollId);
    onClose();
  };

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
              {nearbyTolls.map((toll) => {
                const totalFee = 75 + toll.express_lane_fee; // Base fee + express lane fee
                const isSelectable = toll.distance! >= 5 && toll.distance! <= 20;

                return (
                  <div 
                    key={toll.id}
                    className={`p-4 border rounded-lg transition-colors ${isSelectable ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                    onClick={() => isSelectable && handleSelectToll(toll.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-highway-blue">{toll.name}</h4>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{toll.distance?.toFixed(1)} km away</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>~{Math.round((toll.distance! / 60) * 60)} mins</span> {/* This calculation for minutes might need refinement based on average speed */}
                          </div>
                        </div>
                        {!isSelectable && (
                          <p className="text-sm text-red-600 mt-1">
                            {toll.distance! < 5 ? "Too close to book" : "Too far to book"}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-2">
                          ₹{totalFee}
                        </Badge>
                        <p className="text-xs text-gray-500">
                          Base: ₹75 + Express: ₹{toll.express_lane_fee}
                        </p>
                        <Badge 
                          variant={isSelectable ? 'default' : 'destructive'} 
                          className="ml-2 text-xs mt-1"
                        >
                          {isSelectable ? 'BOOKABLE' : (toll.distance! < 5 ? 'TOO CLOSE' : 'TOO FAR')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NearbyTolls;
