
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
import { calculateAccurateDistance, DistanceResult } from '@/utils/distanceCalculator';

// This file now uses Google Maps API for accurate distance calculation

interface TollBoothWithDistance {   
  id: string;
  name: string;
  highway: string;
  latitude: number;
  longitude: number;
  express_lane_fee: number;
  distance: number;
  duration: number; // in minutes
  isSelectable: boolean;
}

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
  const [availableTolls, setAvailableTolls] = useState<TollBoothWithDistance[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login');
      return;
    }

    // Get user's current location and fetch toll booths
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
        // Ensure high precision coordinates
        const latitude = parseFloat(position.coords.latitude.toFixed(8));
        const longitude = parseFloat(position.coords.longitude.toFixed(8));
        
        console.log('GPS Location Details:', {
          lat: latitude,
          lng: longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed
        });
        
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Fetch toll booths after getting location
        fetchTollBooths(latitude, longitude);
        
        toast({
          title: "Location Found",
          description: `Location detected with ${Math.round(position.coords.accuracy)}m accuracy`,
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
        timeout: 15000, // Increased timeout for better accuracy
        maximumAge: 0 // No cache - always get fresh location
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
          description: "Failed to load toll booths",
          variant: "destructive",
        });
        setLocationLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setAvailableTolls([]);
        setLocationLoading(false);
        return;
      }

      // Prepare destinations for Google Maps API
      const destinations = data.map(toll => ({
        lat: toll.latitude,
        lng: toll.longitude,
        id: toll.id
      }));

      // Calculate accurate distances using Google Maps API
      const distanceResults = await calculateAccurateDistance(userLat, userLng, destinations);

      // Map toll booths with accurate distance data
      const tollsWithDistance: TollBoothWithDistance[] = data.map(toll => {
        const distanceData = distanceResults[toll.id];
        return {
          ...toll,
          distance: distanceData.distance,
          duration: distanceData.duration,
          isSelectable: distanceData.distance >= 5 && distanceData.distance <= 20,
        };
      });

      // Sort by distance and take only the first 5
      const sortedTolls = tollsWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      setAvailableTolls(sortedTolls);
      setLocationLoading(false);

      const selectableTolls = sortedTolls.filter(toll => toll.isSelectable);
      
      toast({
        title: "Toll Booths Found",
        description: `Found ${sortedTolls.length} nearest toll booths. ${selectableTolls.length} are within booking range (5-20km) using accurate road distances`,
      });
    } catch (error) {
      console.error('Error in fetchTollBooths:', error);
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (selectedToll && userLocation && availableTolls.length > 0) {
      const selectedTollData = availableTolls.find(t => t.id === selectedToll);
      if (selectedTollData) {
        setDistance(selectedTollData.distance);
      }
    }
  }, [selectedToll, userLocation, availableTolls]);

  const selectedTollData = availableTolls.find(t => t.id === selectedToll);
  
  useEffect(() => {
    if (distance && distance > 0 && selectedTollData) {
      // Calculate time slot based on accurate travel time from Google Maps
      const currentTime = new Date();
      const travelTimeMinutes = selectedTollData.duration || (distance * 2); // Use Google Maps duration or fallback
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
  }, [distance, selectedTollData]);
  const totalAmount = selectedTollData ? selectedTollData.express_lane_fee : 0;
  const canAfford = user && user.balance && user.balance >= totalAmount;
  const isInRange = selectedTollData ? selectedTollData.isSelectable : false;

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
        // Refresh user profile to show updated balance
        updateBalance(0);
      }

      // Send booking confirmation email
      try {
        const emailResponse = await fetch(
          'https://xdqkafdnxtvhlamamuqj.supabase.co/functions/v1/send-booking-receipt',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWthZmRueHR2aGxhbWFtdXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODkzNzcsImV4cCI6MjA2NzU2NTM3N30.vHM2T4L-02UhMHKyrMgIVaNykvTl-VIMl6qoWSZn9L0`,
            },
            body: JSON.stringify({
              email: user.email,
              bookingDetails: {
                tollName: selectedTollData.name,
                timeSlot: timeSlot,
                bookingDate: new Date().toISOString().split('T')[0],
                amount: totalAmount,
                bookingType: 'express',
                distance: distance,
              },
            }),
          }
        );
        
        if (emailResponse.ok) {
          console.log('Booking confirmation email sent');
        } else {
          console.error('Failed to send confirmation email');
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      toast({
        title: "Booking Confirmed!",
        description: `Express lane booked for ${selectedTollData.name}. Confirmation email sent to ${user.email}`,
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
                    <span className="text-blue-700">Getting your location and finding nearby toll booths...</span>
                  </div>
                </div>
              )}

              {userLocation && !locationLoading && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">
                      Location found! Showing 5 nearest toll booths
                    </span>
                  </div>
                </div>
              )}

              {/* Toll Selection */}
              <div className="space-y-2">
                <Label htmlFor="tollBooth">Select Toll Booth (5 Nearest - Distance Order)</Label>
                <Select value={selectedToll} onValueChange={setSelectedToll} disabled={availableTolls.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      availableTolls.length === 0 ? "Finding nearest toll booths..." :
                      "Choose from 5 nearest toll booths"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTolls.map((toll) => (
                      <SelectItem 
                        key={toll.id} 
                        value={toll.id}
                        disabled={!toll.isSelectable}
                        className={!toll.isSelectable ? "opacity-50" : ""}
                      >
                        <div className="flex justify-between items-center w-full">
                          <div className="flex flex-col">
                            <span className="font-medium">{toll.name}</span>
                            <span className="text-xs text-gray-500">
                              {toll.distance.toFixed(1)} km away • {Math.round(toll.duration)} min drive • {toll.highway}
                              {!toll.isSelectable && " • Outside booking range"}
              
                            </span>
                          </div>
                          <div className="ml-4 text-right">
                            <span className="text-sm font-medium">₹{toll.express_lane_fee}</span>
                            {toll.isSelectable ? (
                              <Badge variant="secondary" className="ml-2 text-xs">Available</Badge>
                            ) : (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                {toll.distance < 5 ? "Too Close" : "Too Far"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableTolls.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Only toll booths within 5-20 km range can be selected for booking.
                  </p>
                )}
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
                      <span>Express Lane Fee:</span>
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
