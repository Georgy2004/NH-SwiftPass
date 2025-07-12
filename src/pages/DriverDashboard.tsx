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
import { Car, CreditCard, Clock, MapPin, Plus, LogOut, Zap } from 'lucide-react';
import NearbyTolls from '@/components/NearbyTolls';

interface Booking {
  id: string;
  toll_booth_id: string;
  toll_name: string;
  time_slot: string;
  amount: number;
  status: 'confirmed' | 'completed' | 'cancelled' | 'refunded' | 'expired';
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
  // In DriverDashboard.tsx
  const [prevBookings, setPrevBookings] = useState<Booking[]>([]);
  
  useEffect(() => {
    if (bookings.length > 0 && prevBookings.length > 0) {
      const expiredBookings = bookings.filter(
        b => b.status === 'expired' && 
        !prevBookings.some(pb => pb.id === b.id && pb.status === 'expired')
      );
      
      if (expiredBookings.length > 0) {
        toast({
          title: "Booking Expired",
          description: `${expiredBookings.length} booking(s) have expired.`,
          variant: "default",
        });
      }
    }
  
  setPrevBookings(bookings);
}, [bookings]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'driver')) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchBookings();
      setupRealtimeUpdates();
    }
  }, [user, loading, navigate]);
  // In both AdminDashboard and DriverDashboard
  useEffect(() => {
    if (!user) return;
  
    const interval = setInterval(() => {
      fetchBookings();
    }, 30000); // Refresh every 30 seconds
  
    return () => clearInterval(interval);
  }, [user]);

  // In both AdminDashboard and DriverDashboard
const setupRealtimeUpdates = () => {
  const channel = supabase
    .channel('booking-status-updates')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all changes
        schema: 'public',
        table: 'bookings',
        filter: user?.role === 'admin' ? undefined : `user_id=eq.${user?.id}`
      },
      (payload) => {
        console.log('Booking change:', payload);
        if (payload.eventType === 'UPDATE' && payload.new.status === 'expired') {
          // Force refresh of bookings data
          fetchBookings();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

  const fetchBookings = async () => {
    if (!user) return;

    try {
      setLoadingBookings(true);
      console.log('Fetching bookings for user:', user.id);

      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          toll_booths (
            name
          )
        `)
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

      console.log('Fetched bookings data:', bookingsData);

      const formattedBookings = bookingsData?.map(booking => ({
        id: booking.id,
        toll_booth_id: booking.toll_booth_id,
        toll_name: booking.toll_booths?.name || 'Unknown Toll',
        time_slot: booking.time_slot,
        amount: booking.amount,
        status: booking.status,
        created_at: booking.created_at,
        booking_date: booking.booking_date
      })) || [];

      console.log('Formatted bookings:', formattedBookings);
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
        // Update balance using Supabase function
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

        // Update local balance
        updateBalance(amount);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'refunded': return 'bg-yellow-500';
      case 'expired': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'ACTIVE';
      case 'completed': return 'COMPLETED';
      case 'cancelled': return 'CANCELLED';
      case 'refunded': return 'REFUNDED';
      case 'expired': return 'EXPIRED';
      default: return status.toUpperCase();
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
                            className={booking.status === 'expired' ? 'bg-gray-500 text-white' : ''}
                          >
                            {getStatusText(booking.status)}
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
