
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Car, ArrowLeft, MapPin, Clock, CreditCard, AlertTriangle, Navigation } from 'lucide-react';

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
  const [availableTolls, setAvailableTolls] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login');
      return;
    }

    // Get user's current location and fetch toll booths
    getCurrentLocation();
    fetchTollBooths();

    // Check if toll was pre-selected from URL
    const preSelectedToll = searchParams.get('toll');
    if (preSelectedToll) {
      setSelectedToll(preSelectedToll);
    }
  }, [user, navigate, searchParams]);

  const fetchTollBooths = async () => {
    try {
      const { data, error } = await supabase
        .from('toll_booths')
        .select('*');

      if (error) {
        console.error('Error fetching toll booths:', error);
        toast({
          title: "Error",
          description: "Failed to load toll booths",
          variant: "destructive",
        });
        return;
      }

      setAvailableTolls(data || []);
    } catch (error) {
      console.error('Error in fetchTollBooths:', error);
    }
  };

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
        setLocationLoading(false);
        
        toast({
          title: "Location Found",
          description: "Location detected successfully",
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
    if (selectedToll && userLocation && availableTolls.length > 0) {
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
  const totalAmount = selectedTollData ? 75 + selectedTollData.express_lane_fee : 0; // Base fee + express charge
  const canAfford = user && user.balance && user.balance >= totalAmount;
  const isInRange = distance > 0 && distance >= 5 && distance <= 20;

  const handleBooking = async () => {
    if (!selectedTollData || !distance || !timeSlot || !canAfford || !isInRange || !user) return;

    setLoading(true);
    
    try {
      console.log('Creating booking with data:', {
        user_id: user.id,
        toll_booth_id: selectedTollData.id,
        booking_date: new Date().toISOString().split('T')[0],
        time_slot: timeSlot,
        distance_from_toll: parseFloat(distance.toFixed(2)),
        amount: totalAmount,
        status: 'confirmed'
      });

      // Create booking in Supabase
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          toll_booth_id: selectedTollData.id,
          booking_date: new Date().toISOString().split('T')[0],
          time_slot: timeSlot,
          distance_from_toll: parseFloat(distance.toFixed(2)),
          amount: totalAmount,
          status: 'confirmed'
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Booking error:', bookingError);
        toast({
          title: "Booking Failed",
          description: `Error: ${bookingError.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Booking created successfully:', bookingData);

      // Update user balance using the Supabase function
      const { data: balanceResult, error: balanceError } = await supabase
        .rpc('update_user_balance', {
          user_uuid: user.id,
          amount_change: -totalAmount,
          transaction_description: `Express lane booking for ${selectedTollData.name}`
        });

      if (balanceError || !balanceResult) {
        console.error('Balance update error:', balanceError);
        toast({
          title: "Warning",
          description: "Booking created but balance update failed. Please contact support.",
          variant: "destructive",
        });
      } else {
        // Update local balance
        updateBalance(-totalAmount);
      }

      toast({
        title: "Booking Confirmed!",
        description: `Express lane booked for ${selectedTollData.name}. Time slot: ${timeSlot}`,
      });

      navigate('/driver');
    } catch (error) {
      console.error('Booking error:', error);
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

  // Filter tolls within 20km if location is available
  const nearbyTolls = userLocation 
    ? availableTolls.filter(toll => {
        const tollDistance = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          toll.latitude, 
          toll.longitude
        );
        return tollDistance <= 20;
      })
    : availableTolls;

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
                      Location found! {nearbyTolls.length} toll booths available
                    </span>
                  </div>
                </div>
              )}

              {/* Toll Selection */}
              <div className="space-y-2">
                <Label htmlFor="tollBooth">Select Toll Booth</Label>
                <Select value={selectedToll} onValueChange={setSelectedToll} disabled={availableTolls.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      availableTolls.length === 0 ? "Loading toll booths..." :
                      nearbyTolls.length === 0 && userLocation ? "No toll booths within 20km" :
                      "Choose a toll booth"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {nearbyTolls.map((toll) => (
                      <SelectItem key={toll.id} value={toll.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{toll.name}</span>
                          <span className="ml-4 text-sm text-gray-500">
                            ₹{75 + toll.express_lane_fee}
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
                      <span>₹75</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Express Lane Charge:</span>
                      <span>₹{selectedTollData.express_lane_fee}</span>
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
