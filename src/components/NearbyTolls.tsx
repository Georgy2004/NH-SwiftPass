
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { MapPin, Navigation, Clock, X } from 'lucide-react';

interface TollBooth {
  id: string;
  name: string;
  baseFee: number;
  expressCharge: number;
  latitude: number;
  longitude: number;
  distance?: number;
}

// Sample toll booth locations (in a real app, these would come from a database)
const TOLL_BOOTHS_WITH_LOCATIONS: TollBooth[] = [
  { 
    id: '1', 
    name: 'Mumbai-Pune Expressway - Khopoli', 
    baseFee: 85, 
    expressCharge: 50,
    latitude: 18.7537,
    longitude: 73.4893
  },
  { 
    id: '2', 
    name: 'Delhi-Gurgaon - Sirhaul', 
    baseFee: 45, 
    expressCharge: 30,
    latitude: 28.4595,
    longitude: 77.0266
  },
  { 
    id: '3', 
    name: 'Chennai-Bangalore - Krishnagiri', 
    baseFee: 95, 
    expressCharge: 60,
    latitude: 12.5266,
    longitude: 78.2140
  },
  { 
    id: '4', 
    name: 'Hyderabad-Vijayawada - Panthangi', 
    baseFee: 75, 
    expressCharge: 45,
    latitude: 16.4419,
    longitude: 80.1761
  },
  { 
    id: '5', 
    name: 'Ahmedabad-Mumbai - Vadodara', 
    baseFee: 65, 
    expressCharge: 40,
    latitude: 22.3072,
    longitude: 73.1812
  },
  { 
    id: '6', 
    name: 'NHAI GIPL Thrissur Paliyekkara Toll Plaza', 
    baseFee: 80, 
    expressCharge: 55,
    latitude: 10.5276,
    longitude: 76.2144
  },
];

interface NearbyTollsProps {
  onClose: () => void;
  onSelectToll: (tollId: string) => void;
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

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
        
        // Calculate distances and sort toll booths
        const tollsWithDistance = TOLL_BOOTHS_WITH_LOCATIONS.map(toll => ({
          ...toll,
          distance: calculateDistance(latitude, longitude, toll.latitude, toll.longitude)
        }));

        // Sort by distance and filter tolls within 20km radius (updated from 50km)
        const sortedTolls = tollsWithDistance
          .filter(toll => toll.distance! <= 20)
          .sort((a, b) => a.distance! - b.distance!);

        setNearbyTolls(sortedTolls);
        setLoading(false);

        toast({
          title: "Location Found",
          description: `Found ${sortedTolls.length} toll booths within 20km`,
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
                <span>Getting your location...</span>
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
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{toll.distance?.toFixed(1)} km away</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>~{Math.round((toll.distance! / 60) * 60)} mins</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-2">
                        ₹{toll.baseFee + toll.expressCharge}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        Base: ₹{toll.baseFee} + Express: ₹{toll.expressCharge}
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
