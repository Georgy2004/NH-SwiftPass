
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, CreditCard, TrendingUp, Clock, LogOut, Search, Car } from 'lucide-react';

interface Driver {
  id: string;
  email: string;
  licensePlate: string;
  balance: number;
}

interface Booking {
  id: string;
  driverId: string;
  tollName: string;
  timeSlot: string;
  amount: number;
  status: string;
  createdAt: string;
  licensePlate: string;
}

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Function to check and update expired bookings
  const checkAndUpdateExpiredBookings = () => {
    const currentTime = new Date();
    const currentTimeString = currentTime.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Load all bookings from localStorage
    const savedDriverBookings = JSON.parse(localStorage.getItem('driver_bookings') || '[]');
    const savedAdminBookings = JSON.parse(localStorage.getItem('admin_bookings') || '[]');
    
    let hasUpdates = false;

    // Update driver bookings
    const updatedDriverBookings = savedDriverBookings.map((booking: any) => {
      if (booking.status === 'active' && booking.timeSlot) {
        const endTime = booking.timeSlot.split('-')[1];
        if (endTime && currentTimeString > endTime) {
          hasUpdates = true;
          return { ...booking, status: 'expired' };
        }
      }
      return booking;
    });

    // Update admin bookings
    const updatedAdminBookings = savedAdminBookings.map((booking: any) => {
      if (booking.status === 'active' && booking.timeSlot) {
        const endTime = booking.timeSlot.split('-')[1];
        if (endTime && currentTimeString > endTime) {
          hasUpdates = true;
          return { ...booking, status: 'expired' };
        }
      }
      return booking;
    });

    // Save updated bookings if there were changes
    if (hasUpdates) {
      localStorage.setItem('driver_bookings', JSON.stringify(updatedDriverBookings));
      localStorage.setItem('admin_bookings', JSON.stringify(updatedAdminBookings));
      
      // Update local state
      setBookings(updatedAdminBookings);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }

    // Load drivers and bookings
    const allUsers = JSON.parse(localStorage.getItem('toll_users') || '[]');
    const driverUsers = allUsers.filter((u: any) => u.role === 'driver');
    setDrivers(driverUsers);

    // Initial load and status check
    checkAndUpdateExpiredBookings();

    // Set up interval to check for expired bookings every 30 seconds
    const interval = setInterval(checkAndUpdateExpiredBookings, 30000);

    return () => clearInterval(interval);
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredDrivers = drivers.filter(driver => 
    driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBookings = bookings.filter(booking =>
    booking.tollName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalDrivers: drivers.length,
    activeBookings: bookings.filter(b => b.status === 'active').length,
    totalRevenue: bookings.reduce((sum, b) => sum + b.amount, 0),
    completedBookings: bookings.filter(b => b.status === 'completed').length,
  };

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
        <div className="grid md:grid-cols-4 gap-6 mb-8">
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
                        <p className="text-sm text-gray-600">{driver.licensePlate}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">₹{driver.balance?.toFixed(2)}</div>
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
                          variant={booking.status === 'active' ? 'default' : 'secondary'}
                        >
                          {booking.status.toUpperCase()}
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
                          <span className="font-medium">Booked:</span> {new Date(booking.createdAt).toLocaleDateString()}
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
