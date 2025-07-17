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
import dayjs from 'dayjs';

// Declare google as a global object
declare const google: any;

interface TollBoothWithDistance {
  id: string;
  name: string;
  highway: string;
  latitude: number;
  longitude: number;
  express_lane_fee: number;
  distance?: number; // Distance in kilometers (driving)
  duration?: number; // Duration in seconds
  isSelectable: boolean;
}

const BookExpress = () => {
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedToll, setSelectedToll] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [availableTolls, setAvailableTolls] = useState<TollBoothWithDistance[]>([]);
  const [isApiLoaded, setIsApiLoaded] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login');
      return;
    }

    // Check if Google Maps API is loaded
    const checkGoogleMaps = () => {
      if (typeof google !== 'undefined' && google.maps && google.maps.DistanceMatrixService) {
        setIsApiLoaded(true);
      } else {
        setTimeout(checkGoogleMaps, 500); // Retry after 500ms
      }
    };
    checkGoogleMaps();
  }, [user, navigate]);

  useEffect(() => {
    if (isApiLoaded) {
      getCurrentLocation();
    }
  }, [isApiLoaded]);


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
        
        // Fetch toll booths after getting location
        fetchTollBooths(latitude, longitude);
        
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

      const tollBoothsFromDB = data || [];

      if (!google.maps || !google.maps.DistanceMatrixService) {
        toast({
          title: "Google Maps Error",
          description: "Google Maps API not loaded. Cannot calculate precise distances.",
          variant: "destructive",
        });
        setLocationLoading(false);
        // Fallback to Haversine if API not loaded, or simply disable selection
        setAvailableTolls(tollBoothsFromDB.map(toll => ({
          ...toll,
          distance: undefined,
          duration: undefined,
          isSelectable: false // Cannot accurately determine range without API
        })));
        return;
      }

      const service = new google.maps.DistanceMatrixService();
      const origins = [{ lat: userLat, lng: userLng }];
      const destinations = tollBoothsFromDB.map(toll => ({
        lat: toll.latitude,
        lng: toll.longitude
      }));

      service.getDistanceMatrix(
        {
          origins: origins,
          destinations: destinations,
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false,
        },
        (response: any, status: any) => {
          if (status !== 'OK') {
            console.error('Error with Distance Matrix API:', status, response);
            toast({
              title: "Error",
              description: `Failed to fetch toll distances: ${status}`,
              variant: "destructive",
            });
            setLocationLoading(false);
            return;
          }

          if (response.rows[0] && response.rows[0].elements) {
            const tollsWithDistance: TollBoothWithDistance[] = tollBoothsFromDB.map((toll, index) => {
              const element = response.rows[0].elements[index];
              if (element.status === 'OK') {
                const calculatedDistance = element.distance.value / 1000; // meters to km
                const calculatedDuration = element.duration.value; // seconds
                return {
                  ...toll,
                  distance: parseFloat(calculatedDistance.toFixed(1)),
                  duration: calculatedDuration,
                  isSelectable: calculatedDistance >= 5 && calculatedDistance <= 20
                };
              }
              return { ...toll, distance: undefined, duration: undefined, isSelectable: false };
            });

            const sortedTolls = tollsWithDistance
              .filter(toll => typeof toll.distance === 'number') // Only include tolls for which distance was calculated
              .sort((a, b) => a.distance! - b.distance!)
              .slice(0, 5); // Take only the nearest 5

            setAvailableTolls(sortedTolls);
            setLocationLoading(false);

            const selectableTolls = sortedTolls.filter(toll => toll.isSelectable);
            toast({
              title: "Toll Booths Found",
              description: `Found ${sortedTolls.length} nearest toll booths. ${selectableTolls.length} are within booking range (5-20km driving distance).`,
            });
          } else {
            toast({
              title: "Error",
              description: "No valid routes found to toll booths.",
              variant: "destructive",
            });
            setLocationLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error in fetchTollBooths:', error);
      setLocationLoading(false);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching tolls.",
        variant: "destructive",
      });
    }
  };

  // Effect to update distance and time slot when a toll is selected or user location changes
  useEffect(() => {
    const updateSelectedTollDetails = async () => {
      if (selectedToll && userLocation && availableTolls.length > 0 && isApiLoaded) {
        const currentSelectedTollData = availableTolls.find(t => t.id === selectedToll);
        if (currentSelectedTollData) {
          const service = new google.maps.DistanceMatrixService();
          service.getDistanceMatrix(
            {
              origins: [{ lat: userLocation.lat, lng: userLocation.lng }],
              destinations: [{ lat: currentSelectedTollData.latitude, lng: currentSelectedTollData.longitude }],
              travelMode: google.maps.TravelMode.DRIVING,
              unitSystem: google.maps.UnitSystem.METRIC,
              avoidHighways: false,
              avoidTolls: false,
            },
            (response: any, status: any) => {
              if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                const element = response.rows[0].elements[0];
                const calculatedDistance = element.distance.value / 1000; // meters to km
                const calculatedDurationSeconds = element.duration.value; // seconds

                setDistance(parseFloat(calculatedDistance.toFixed(2)));

                // Calculate time slot based on accurate duration
                const currentTime = dayjs();
                const arrivalTime = currentTime.add(calculatedDurationSeconds, 'second');
                const endTime = arrivalTime.add(10, 'minute'); // 10 minute window
                
                const startTimeStr = arrivalTime.format('hh:mm A');
                const endTimeStr = endTime.format('hh:mm A');
                
                setTimeSlot(`${startTimeStr} - ${endTimeStr}`);
              } else {
                console.error('Error fetching single toll distance:', status, response);
                setDistance(undefined);
                setTimeSlot('');
                toast({
                  title: "Distance Error",
                  description: "Could not calculate precise distance for selected toll.",
                  variant: "destructive",
                });
              }
            }
          );
        }
      } else {
        setDistance(undefined);
        setTimeSlot('');
      }
    };

    updateSelectedTollDetails();
  }, [selectedToll, userLocation, availableTolls, isApiLoaded]);

  const selectedTollData = availableTolls.find(t => t.id === selectedToll);
  const totalAmount = selectedTollData ? 75 + selectedTollData.express_lane_fee : 0;
  const canAfford = user && user.balance && user.balance >= totalAmount;
  const isInRange = selectedTollData ? (distance !== undefined && distance >= 5 && distance <= 20) : false; // Use `distance` state for range check

  const handleBooking = async () => {
    if (!selectedTollData || distance === undefined || !timeSlot || !canAfford || !isInRange || !user) return;

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
                      Location found! Showing 5 nearest toll booths (driving distance)
                    </span>
                  </div>
                </div>
              )}

              {/* Toll Selection */}
              <div className="space-y-2">
                <Label htmlFor="tollBooth">Select Toll Booth (5 Nearest - Driving Distance Order)</Label>
                <Select value={selectedToll} onValueChange={setSelectedToll} disabled={availableTolls.length === 0 || !isApiLoaded || locationLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      locationLoading ? "Finding nearest toll booths..." :
                      availableTolls.length === 0 ? "No toll booths found or API not loaded" :
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
                              {toll.distance !== undefined ? `${toll.distance.toFixed(1)} km away` : 'N/A km'} • {toll.highway}
                              {!toll.isSelectable && " • Outside booking range"}
                            </span>
                          </div>
                          <div className="ml-4 text-right">
                            <span className="text-sm font-medium">₹{75 + toll.express_lane_fee}</span>
                            {toll.isSelectable ? (
                              <Badge variant="secondary" className="ml-2 text-xs">Available</Badge>
                            ) : (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                {toll.distance !== undefined && toll.distance < 5 ? "Too Close" : "Too Far"}
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
                    Only toll booths within 5-20 km driving distance can be selected for booking.
                  </p>
                )}
              </div>

              {/* Auto-calculated Distance Display */}
              {selectedToll && distance !== undefined && (
                <div className="space-y-2">
                  <Label>Driving Distance from Toll Booth</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700">{distance.toFixed(2)} km</span>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      Automatically calculated from your current location (via driving route)
                    </p>
                    {!isInRange && (
                      <p className="text-sm text-red-600 mt-1">
                        You must be within 5-20 km driving distance to book express lane
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
              {selectedToll && distance !== undefined && !isInRange && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-700 font-medium">
                      {distance < 5 ? "Too Close" : "Too Far"}
                    </span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    You must be within 5-20 km driving distance to book express lane. Current distance: {distance.toFixed(2)} km
                  </p>
                </div>
              )}

              {/* Important Notes */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Ensure sufficient account balance</li>
                  <li>• You must be within 5-20 km driving distance to book express lane</li>
                  <li>• You must reach the toll booth within your allocated time slot</li>
                  <li>• Use only the EXPRESS lane marked with AI cameras</li>
                  <li>• Partial refund available if you use regular FASTag lane</li>
                  <li>• Heavy penalties for unauthorized express lane usage</li>
                </ul>
              </div>

              {/* Book Button */}
              <Button
                onClick={handleBooking}
                disabled={!selectedToll || distance === undefined || !timeSlot || !canAfford || loading || !isInRange || !userLocation || !isApiLoaded}
                className="w-full express-gradient text-white py-3 text-lg"
              >
                {loading ? "Processing Booking..." : 
                 !isApiLoaded ? "Loading Maps API..." :
                 !userLocation ? "Getting Location..." :
                 distance === undefined ? "Calculating Distance..." :
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
