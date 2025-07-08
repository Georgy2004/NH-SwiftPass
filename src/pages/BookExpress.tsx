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
import { Car, ArrowLeft, MapPin, Clock, CreditCard, AlertTriangle } from 'lucide-react';

const TOLL_BOOTHS = [
  { id: '1', name: 'Mumbai-Pune Expressway - Khopoli', baseFee: 85, expressCharge: 50 },
  { id: '2', name: 'Delhi-Gurgaon - Sirhaul', baseFee: 45, expressCharge: 30 },
  { id: '3', name: 'Chennai-Bangalore - Krishnagiri', baseFee: 95, expressCharge: 60 },
  { id: '4', name: 'Hyderabad-Vijayawada - Panthangi', baseFee: 75, expressCharge: 45 },
  { id: '5', name: 'Ahmedabad-Mumbai - Vadodara', baseFee: 65, expressCharge: 40 },
  { id: '6', name: 'NHAI GIPL Thrissur Paliyekkara Toll Plaza', baseFee: 80, expressCharge: 55 },
];

const BookExpress = () => {
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedToll, setSelectedToll] = useState('');
  const [distance, setDistance] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login');
      return;
    }

    // Check if toll was pre-selected from URL
    const preSelectedToll = searchParams.get('toll');
    if (preSelectedToll) {
      setSelectedToll(preSelectedToll);
    }
  }, [user, navigate, searchParams]);

  useEffect(() => {
    if (distance && parseFloat(distance) > 0) {
      // Calculate time slot based on distance
      const distanceKm = parseFloat(distance);
      const currentTime = new Date();
      const travelTimeMinutes = distanceKm * 2; // 2 minutes per km
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

  const selectedTollData = TOLL_BOOTHS.find(t => t.id === selectedToll);
  const totalAmount = selectedTollData ? selectedTollData.baseFee + selectedTollData.expressCharge : 0;
  const canAfford = user && user.balance && user.balance >= totalAmount;

  const handleBooking = async () => {
    if (!selectedTollData || !distance || !timeSlot || !canAfford) return;

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
        distance: parseFloat(distance),
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

              {/* Toll Selection */}
              <div className="space-y-2">
                <Label htmlFor="tollBooth">Select Toll Booth</Label>
                <Select value={selectedToll} onValueChange={setSelectedToll}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a toll booth" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOLL_BOOTHS.map((toll) => (
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

              {/* Distance Input */}
              <div className="space-y-2">
                <Label htmlFor="distance">Distance from Toll Booth (km)</Label>
                <Input
                  id="distance"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Enter distance (5-10 km)"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                />
                <p className="text-sm text-gray-600">
                  You must be within 5-10 km radius to book express lane
                </p>
              </div>

              {/* Time Slot Display */}
              {timeSlot && (
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
              {selectedTollData && (
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
              {selectedTollData && !canAfford && (
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

              {/* Important Notes */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• You must reach the toll booth within your allocated time slot</li>
                  <li>• Use only the EXPRESS lane marked with AI cameras</li>
                  <li>• Partial refund available if you use regular FASTag lane</li>
                  <li>• Heavy penalties for unauthorized express lane usage</li>
                </ul>
              </div>

              {/* Book Button */}
              <Button
                onClick={handleBooking}
                disabled={!selectedToll || !distance || !timeSlot || !canAfford || loading}
                className="w-full express-gradient text-white py-3 text-lg"
              >
                {loading ? "Processing Booking..." : `Book Express Lane - ₹${totalAmount}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookExpress;
