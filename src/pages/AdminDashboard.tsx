import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, CreditCard, TrendingUp, Clock, LogOut, Search, Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Driver {
  id: string;
  email: string;
  license_plate: string;
  balance: number;
}

interface Booking {
  id: string;
  user_id: string;
  tollName: string;
  timeSlot: string;
  amount: number;
  status: string;
  createdAt: string;
  licensePlate: string;
  bookingDate: string;
}

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }

    loadData();
    setupRealtimeUpdates();
  }, [user, navigate]);
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

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load drivers from Supabase
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, license_plate, balance')
        .eq('role', 'driver');

      if (profilesError) {
        console.error('Error loading drivers:', profilesError);
        toast({
          title: "Error",
          description: "Failed to load drivers data",
          variant: "destructive",
        });
      } else {
        setDrivers(profilesData || []);
      }

      // Load bookings from Supabase with toll booth and profile information
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          time_slot,
          amount,
          status,
          created_at,
          booking_date,
          toll_booths:toll_booth_id (
            name
          ),
          profiles:user_id (
            license_plate
          )
        `)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
        toast({
          title: "Error",
          description: "Failed to load bookings data",
          variant: "destructive",
        });
      } else {
        // Transform the data to match the expected format
        const transformedBookings: Booking[] = (bookingsData || []).map((booking: any) => ({
          id: booking.id,
          user_id: booking.user_id,
          tollName: booking.toll_booths?.name || 'Unknown Toll',
          timeSlot: booking.time_slot,
          amount: booking.amount,
          status: booking.status,
          createdAt: booking.created_at,
          licensePlate: booking.profiles?.license_plate || 'N/A',
          bookingDate: booking.booking_date
        }));
        setBookings(transformedBookings);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredDrivers = drivers.filter(driver => 
    driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (driver.license_plate && driver.license_plate.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredBookings = bookings.filter(booking =>
    booking.tollName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      case 'refunded': return 'bg-yellow-500 text-white';
      case 'expired': return 'bg-gray-500 text-white';
      default: return '';
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

  const stats = {
    totalDrivers: drivers.length,
    activeBookings: bookings.filter(b => b.status === 'confirmed').length,
    totalRevenue: bookings.reduce((sum, b) => sum + Number(b.amount), 0),
    completedBookings: bookings.filter(b => b.status === 'completed').length,
    expiredBookings: bookings.filter(b => b.status === 'expired').length,
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-highway-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="highway-gradient text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Car className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-blue-100">Highway Express Management Portal</p>
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
        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card className="toll-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Drivers</p>
                  <p className="text-2xl font-bold text-highway-blue">{stats.totalDrivers}</p>
                </div>
                <Users className="h-8 w-8 text-highway-blue" />
              </div>
            </CardContent>
          </Card>

          <Card className="toll-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Bookings</p>
                  <p className="text-2xl font-bold text-highway-green">{stats.activeBookings}</p>
                </div>
                <Clock className="h-8 w-8 text-highway-green" />
              </div>
            </CardContent>
          </Card>

          <Card className="toll-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-highway-orange">₹{stats.totalRevenue}</p>
                </div>
                <CreditCard className="h-8 w-8 text-highway-orange" />
              </div>
            </CardContent>
          </Card>

          <Card className="toll-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-700">{stats.completedBookings}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-gray-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="toll-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expired</p>
                  <p className="text-2xl font-bold text-gray-500">{stats.expiredBookings}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search drivers or bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Registered Drivers */}
          <Card className="toll-card">
            <CardHeader>
              <CardTitle className="text-highway-blue">Registered Drivers</CardTitle>
              <CardDescription>All registered driver accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No drivers found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredDrivers.map((driver) => (
                    <div 
                      key={driver.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h4 className="font-medium">{driver.email}</h4>
                        <p className="text-sm text-gray-600">{driver.license_plate || 'No license plate'}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">₹{Number(driver.balance || 0).toFixed(2)}</div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card className="toll-card">
            <CardHeader>
              <CardTitle className="text-highway-blue">Recent Bookings</CardTitle>
              <CardDescription>Latest express lane bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No bookings found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredBookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{booking.tollName}</h4>
                        <Badge 
                          className={getStatusColor(booking.status)}
                        >
                          {getStatusText(booking.status)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">License:</span> {booking.licensePlate}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> ₹{booking.amount}
                        </div>
                        <div>
                          <span className="font-medium">Time Slot:</span> {booking.timeSlot}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(booking.bookingDate).toLocaleDateString()}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Booked:</span> {new Date(booking.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="toll-card mt-8">
          <CardHeader>
            <CardTitle className="text-highway-blue">System Status</CardTitle>
            <CardDescription>Real-time system monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <h4 className="font-medium">AI Camera System</h4>
                <p className="text-sm text-green-600">Online</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <h4 className="font-medium">Payment Gateway</h4>
                <p className="text-sm text-green-600">Active</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <h4 className="font-medium">Express Lanes</h4>
                <p className="text-sm text-green-600">Operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
