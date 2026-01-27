import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Car, CreditCard, Clock, MapPin, Plus, LogOut, Zap, Tag } from 'lucide-react';
import NearbyTolls from '@/components/NearbyTolls';
import dayjs from 'dayjs';

interface Booking {
  id: string;
  toll_booth_id: string;
  toll_name: string;
  time_slot: string;
  amount: number;
  status: 'confirmed' | 'completed' | 'cancelled' | 'refunded' | 'refund' | 'FastTag' | 'fined';
  created_at: string;
  booking_date: string;
}

const DriverDashboard = () => {
  const { user, logout, updateBalance, loading } = useAuth();
  const navigate = useNavigate();
  const [addAmount, setAddAmount] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showNearbyTolls, setShowNearbyTolls] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'driver')) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchBookings();
    }
  }, [user, loading, navigate]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      setLoadingBookings(true);

      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`*, toll_booths ( name )`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        toast({
          title: "Error",
          description: "Failed to load bookings",
          variant: "destructive",
        });
        return;
      }

      const currentDateTime = dayjs();

      const formattedBookings = await Promise.all(
        (bookingsData || []).map(async booking => {
          const endTime = booking.time_slot?.split('-')[1]?.trim();
          const bookingDate = dayjs(booking.booking_date);
          const bookingDateTime = dayjs(`${bookingDate.format('YYYY-MM-DD')} ${endTime}`, 'YYYY-MM-DD hh:mma');

          const isExpired = currentDateTime.isAfter(bookingDateTime);

          if (isExpired && booking.status === 'confirmed') {
            await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
            booking.status = 'completed';
          }

          return {
            id: booking.id,
            toll_booth_id: booking.toll_booth_id,
            toll_name: booking.toll_booths?.name || 'Unknown Toll',
            time_slot: booking.time_slot,
            amount: booking.amount,
            status: booking.status,
            created_at: booking.created_at,
            booking_date: booking.booking_date
          };
        })
      );

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error in fetchBookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleAddBalance = async () => {
    const amount = parseFloat(addAmount);
    if (amount && amount > 0 && user) {
      try {
        const { data: result, error } = await supabase
          .rpc('update_user_balance', {
            user_uuid: user.id,
            amount_change: amount,
            transaction_description: 'Account top-up'
          });

        if (error || !result) {
          toast({
            title: "Error",
            description: "Failed to add balance. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Refresh user profile to show updated balance
        updateBalance(0);
        setAddAmount('');
        toast({
          title: "Balance Added",
          description: `₹${amount} has been added to your account.`,
        });
      } catch (error) {
        console.error('Error adding balance:', error);
        toast({
          title: "Error",
          description: "Failed to add balance. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to add.",
        variant: "destructive",
      });
    }
  };

  const handleSelectToll = (tollId: string) => {
    navigate(`/book-express?toll=${tollId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBookFasTag = async () => {
    if (!user) return;

    // Check if user has sufficient balance
    const balance = user.balance || 0;
    if (balance < 100) {
      toast({
        title: "Insufficient Balance",
        description: "You need at least ₹100 to book a FasTag lane.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get user's current location
      const getCurrentLocation = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser.'));
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });
      };

      let userLocation;
      try {
        const position = await getCurrentLocation();
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch (locationError) {
        toast({
          title: "Location Error",
          description: "Unable to get your location. Please enable location access.",
          variant: "destructive",
        });
        return;
      }

      // Fetch all toll booths
      const { data: tollBooths, error: tollError } = await supabase
        .from('toll_booths')
        .select('id, name, latitude, longitude');

      if (tollError || !tollBooths || tollBooths.length === 0) {
        toast({
          title: "Error",
          description: "Unable to get toll booth information.",
          variant: "destructive",
        });
        return;
      }

      // Calculate distances to all toll booths
      const destinations = tollBooths.map(booth => ({
        lat: parseFloat(booth.latitude.toString()),
        lng: parseFloat(booth.longitude.toString()),
        id: booth.id
      }));

      const { calculateAccurateDistance } = await import('@/utils/distanceCalculator');
      const distanceResults = await calculateAccurateDistance(
        userLocation.lat,
        userLocation.lng,
        destinations
      );

      // Find the nearest toll booth
      let nearestTollBooth = tollBooths[0];
      let minDistance = distanceResults[tollBooths[0].id]?.distance || Infinity;

      tollBooths.forEach(booth => {
        const distance = distanceResults[booth.id]?.distance || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          nearestTollBooth = booth;
        }
      });

      const tollBooth = nearestTollBooth;

      // Create FasTag booking
      const { error: bookingError } = await supabase.from('bookings').insert({
        user_id: user.id,
        toll_booth_id: tollBooth.id,
        time_slot: 'FasTag Lane - No Time Limit',
        booking_date: new Date().toISOString().split('T')[0],
        amount: 100,
        status: 'FastTag',
        distance_from_toll: 0
      });

      if (bookingError) {
        console.error('Error creating FasTag booking:', bookingError);
        toast({
          title: "Error",
          description: "Failed to book FasTag lane. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Deduct 100Rs from user's balance
      const { data: result, error: balanceError } = await supabase
        .rpc('update_user_balance', {
          user_uuid: user.id,
          amount_change: -100,
          transaction_description: 'FasTag lane booking'
        });

      if (balanceError || !result) {
        toast({
          title: "Error",
          description: "Failed to process payment. Please contact support.",
          variant: "destructive",
        });
        return;
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
                tollName: tollBooth.name,
                timeSlot: 'FasTag Lane - No Time Limit',
                bookingDate: new Date().toISOString().split('T')[0],
                amount: 100,
                bookingType: 'fasttag',
              },
            }),
          }
        );
        
        if (emailResponse.ok) {
          console.log('FasTag booking confirmation email sent');
        } else {
          console.error('Failed to send FasTag confirmation email');
        }
      } catch (emailError) {
        console.error('Error sending FasTag confirmation email:', emailError);
      }

      // Update user balance and refresh bookings
      updateBalance(0);
      fetchBookings();

      toast({
        title: "FasTag Lane Booked",
        description: `₹100 deducted. Confirmation email sent to ${user.email}`,
      });
    } catch (error) {
      console.error('Error booking FasTag:', error);
      toast({
        title: "Error",
        description: "Failed to book FasTag lane. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'refunded': return 'bg-yellow-500';
      case 'refund': return 'bg-yellow-500';
      case 'FastTag': return 'bg-purple-500';
      case 'fined': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-highway-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="highway-gradient text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Car className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Driver Dashboard</h1>
                <p className="text-blue-100">Welcome back, {user.email}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="bg-white text-highway-blue hover:bg-gray-100"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Account Info */}
          <div className="lg:col-span-1">
            <Card className="toll-card mb-6">
              <CardHeader className="text-center">
                <CardTitle className="text-highway-blue">Account Balance</CardTitle>
                <div className="text-3xl font-bold text-green-600">
                  ₹{user.balance?.toFixed(2) || '0.00'}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="addAmount">Add Money</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="addAmount"
                      type="number"
                      placeholder="Enter amount"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                    />
                    <Button onClick={handleAddBalance} className="highway-gradient">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>License Plate:</span>
                      <span className="font-medium">{user.licensePlate || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Account Type:</span>
                      <Badge variant="secondary">Driver</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="toll-card">
              <CardHeader>
                <CardTitle className="text-highway-blue">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full express-gradient text-white"
                  onClick={() => navigate('/book-express')}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Book Express Lane
                </Button>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleBookFasTag}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Book FasTag Lane
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowNearbyTolls(true)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Find Nearby Tolls
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/transaction-history')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Transaction History
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Bookings */}
          <div className="lg:col-span-2">
            <Card className="toll-card">
              <CardHeader>
                <CardTitle className="text-highway-blue">My Bookings</CardTitle>
                <CardDescription>
                  Recent express lane bookings and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-highway-blue mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading bookings...</p>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No Bookings Yet</h3>
                    <p className="text-gray-500 mb-4">
                      Start by booking your first express lane to save time!
                    </p>
                    <Button 
                      className="express-gradient text-white"
                      onClick={() => navigate('/book-express')}
                    >
                      Book Express Lane
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(booking.status)}`}></div>
                          <div>
                            <h4 className="font-medium">{booking.toll_name}</h4>
                            <p className="text-sm text-gray-600">{booking.time_slot}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{booking.amount}</div>
                          <Badge 
                            variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                            className={
                              booking.status === 'completed' ? 'bg-green-500 text-white' :
                              booking.status === 'refund' ? 'bg-yellow-500 text-white' :
                              booking.status === 'FastTag' ? 'bg-purple-500 text-white' :
                              booking.status === 'fined' ? 'bg-red-600 text-white' : ''
                            }
                          >
                            {booking.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="toll-card mt-6">
              <CardHeader>
                <CardTitle className="text-highway-blue">How to Use Express Lanes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Before Booking:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Ensure sufficient account balance</li>
                      <li>• Be within 5-10km of toll booth</li>
                      <li>• Check your license plate is correct</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">After Booking:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Reach toll within allocated time</li>
                      <li>• Use EXPRESS lane only</li>
                      <li>• AI will verify your license plate</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Nearby Tolls Modal */}
      {showNearbyTolls && (
        <NearbyTolls 
          onClose={() => setShowNearbyTolls(false)}
          onSelectToll={handleSelectToll}
        />
      )}
    </div>
  );
};

export default DriverDashboard;
