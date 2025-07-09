
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Car, ArrowLeft, MapPin, Clock, CreditCard, AlertTriangle, Navigation } from 'lucide-react';

const TOLL_BOOTHS = [
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

const BookExpress = () => {
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedToll, setSelectedToll] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState(0);
  const [timeSlot, setTimeSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [availableTolls, setAvailableTolls] = useState(TOLL_BOOTHS);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login');
      return;
    }

    // Get user's current location
    getCurrentLocation();

    // Check if toll was pre-selected from URL
    const preSelectedToll = searchParams.get('toll');
    if (preSelectedToll) {
      setSelectedToll(preSelectedToll);
    }
  }, [user, navigate, searchParams]);

  const getCurrentLocation = () => {
    setLocationLoading(true);

    if (!navigator.geolocation) {
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Filter toll booths within 20km radius
        const tollsWithDistance = TOLL_BOOTHS.map(toll => ({
          ...toll,
          distance: calculateDistance(latitude, longitude, toll.latitude, toll.longitude)
        }));

        const tollsInRange = tollsWithDistance.filter(toll => toll.distance <= 20);
        setAvailableTolls(tollsInRange);

        setLocationLoading(false);
        
        toast({
          title: "Location Found",
          description: `Found ${tollsInRange.length} toll booths within 20km`,
        });
      },
      (error) => {
        setLocationLoading(false);
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

  useEffect(() => {
    if (selectedToll && userLocation) {
      const selectedTollData = availableTolls.find(t => t.id === selectedToll);
      if (selectedTollData) {
        const calculatedDistance = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          selectedTollData.latitude, 
          selectedTollData.longitude
        );
        setDistance(calculatedDistance);
      }
    }
  }, [selectedToll, userLocation, availableTolls]);

  useEffect(() => {
    if (distance && distance > 0) {
      // Calculate time slot based on distance
      const currentTime = new Date();
      const travelTimeMinutes = distance * 2; // 2 minutes per km
      const arrivalTime = new Date(currentTime.getTime() + travelTimeMinutes * 60000);
      const endTime = new Date(arrivalTime.getTime() + 10 * 60000); // 10 minute window
      
      const startTimeStr = arrivalTime.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const endTimeStr = endTime.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      setTimeSlot(`${startTimeStr} - ${endTimeStr}`);
    } else {
      setTimeSlot('');
    }
  }, [distance]);

  const selectedTollData = availableTolls.find(t => t.id === selectedToll);
  const totalAmount = selectedTollData ? selectedTollData.baseFee + selectedTollData.expressCharge : 0;
  const canAfford = user && user.balance && user.balance >= totalAmount;
  const isInRange = distance > 0 && distance >= 5 && distance <= 20;

  const handleBooking = async () => {
    if (!selectedTollData || !distance || !timeSlot || !canAfford || !isInRange) return;

    setLoading(true);
    
    try {
      // Create booking
      const booking = {
        id: Date.now().toString(),
        driverId: user!.id,
        tollName: selectedTollData.name,
        timeSlot,
        amount: totalAmount,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        distance: parseFloat(distance.toFixed(2)),
        licensePlate: user!.licensePlate,
      };

      // Save booking
      const existingBookings = JSON.parse(localStorage.getItem('driver_bookings') || '[]');
      existingBookings.push(booking);
      localStorage.setItem('driver_bookings', JSON.stringify(existingBookings));

      // Also save for admin view
      const adminBookings = JSON.parse(localStorage.getItem('admin_bookings') || '[]');
      adminBookings.push(booking);
      localStorage.setItem('admin_bookings', JSON.stringify(adminBookings));

      // Deduct amount from balance
      updateBalance(-totalAmount);

      toast({
        title: "Booking Confirmed!",
        description: `Express lane booked for ${selectedTollData.name}. Time slot: ${timeSlot}`,
      });

      navigate('/driver');
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="highway-gradient text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20" 
              onClick={() => navigate('/driver')}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-3">
              <Car className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Book Express Lane</h1>
                <p className="text-blue-100">Skip the queue, save time</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="toll-card">
            <CardHeader>
              <CardTitle className="text-highway-blue">Express Lane Booking</CardTitle>
              <CardDescription>
                Book your express lane passage and get priority access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Balance */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-green-700">Current Balance:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{user.balance?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>

              {/* Location Status */}
              {locationLoading && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Navigation className="h-4 w-4 text-blue-600 animate-spin" />
                    <span className="text-blue-700">Getting your location...</span>
                  </div>
                </div>
              )}

              {userLocation && !locationLoading && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">
                      Location found! {availableTolls.length} toll booths within 20km
                    </span>
                  </div>
                </div>
              )}

              {/* Toll Selection */}
              <div className="space-y-2">
                <Label htmlFor="tollBooth">Select Toll Booth (Within 20km)</Label>
                <Select value={selectedToll} onValueChange={setSelectedToll} disabled={!userLocation || availableTolls.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !userLocation ? "Getting location..." : 
                      availableTolls.length === 0 ? "No toll booths within 20km" :
                      "Choose a toll booth"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTolls.map((toll) => (
                      <SelectItem key={toll.id} value={toll.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{toll.name}</span>
                          <span className="ml-4 text-sm text-gray-500">
                            ₹{toll.baseFee + toll.expressCharge}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-calculated Distance Display */}
              {selectedToll && distance > 0 && (
                <div className="space-y-2">
                  <Label>Distance from Toll Booth</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700">{distance.toFixed(2)} km</span>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      Automatically calculated from your current location
                    </p>
                    {!isInRange && (
                      <p className="text-sm text-red-600 mt-1">
                        You must be within 5-20 km radius to book express lane
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Time Slot Display */}
              {timeSlot && isInRange && (
                <div className="space-y-2">
                  <Label>Allocated Time Slot</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700">{timeSlot}</span>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      You have a 10-minute window to pass through the express lane
                    </p>
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              {selectedTollData && isInRange && (
                <div className="space-y-2">
                  <Label>Pricing Breakdown</Label>
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Base Toll Fee:</span>
                      <span>₹{selectedTollData.baseFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Express Lane Charge:</span>
                      <span>₹{selectedTollData.expressCharge}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Total Amount:</span>
                      <span>₹{totalAmount}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Insufficient Balance Warning */}
              {selectedTollData && !canAfford && isInRange && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-700 font-medium">Insufficient Balance</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    Please add ₹{(totalAmount - (user.balance || 0)).toFixed(2)} to your account
                  </p>
                </div>
              )}

              {/* Distance Range Warning */}
              {selectedToll && distance > 0 && !isInRange && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-700 font-medium">
                      {distance < 5 ? "Too Close" : "Too Far"}
                    </span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    You must be within 5-20 km radius to book express lane. Current distance: {distance.toFixed(2)} km
                  </p>
                </div>
              )}

              {/* Important Notes */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• You must be within 5-20 km radius to book express lane</li>
                  <li>• You must reach the toll booth within your allocated time slot</li>
                  <li>• Use only the EXPRESS lane marked with AI cameras</li>
                  <li>• Partial refund available if you use regular FASTag lane</li>
                  <li>• Heavy penalties for unauthorized express lane usage</li>
                </ul>
              </div>

              {/* Book Button */}
              <Button
                onClick={handleBooking}
                disabled={!selectedToll || !distance || !timeSlot || !canAfford || loading || !isInRange || !userLocation}
                className="w-full express-gradient text-white py-3 text-lg"
              >
                {loading ? "Processing Booking..." : 
                 !userLocation ? "Getting Location..." :
                 !isInRange ? "Invalid Distance Range" :
                 `Book Express Lane - ₹${totalAmount}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookExpress;
