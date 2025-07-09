import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  tollName: string;
  timeSlot: string;
  amount: number;
  status: 'active' | 'completed' | 'expired';
  createdAt: string;
}

const DriverDashboard = () => {
  const { user, logout, updateBalance } = useAuth();
  const navigate = useNavigate();
  const [addAmount, setAddAmount] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showNearbyTolls, setShowNearbyTolls] = useState(false);

  // Function to check and update expired bookings
  const checkAndUpdateExpiredBookings = () => {
    const currentTime = new Date();
    console.log('Checking expired bookings at:', currentTime.toLocaleString());
    
    setBookings(prevBookings => {
      const updatedBookings = prevBookings.map(booking => {
        if (booking.status === 'active' && booking.timeSlot) {
          console.log(`Checking booking ${booking.id}: ${booking.timeSlot}`);
          
          // Parse the creation date of the booking
          const bookingDate = new Date(booking.createdAt);
          
          // Parse time slot (e.g., "10:25pm-10:35pm" or "22:25-22:35")
          const timeSlotEnd = booking.timeSlot.split('-')[1];
          console.log('Time slot end:', timeSlotEnd);
          
          // Create end time using the booking date (not today's date)
          let endTime = new Date(bookingDate);
          
          if (timeSlotEnd.includes('pm') || timeSlotEnd.includes('am')) {
            // 12-hour format with am/pm
            const timeStr = timeSlotEnd.trim();
            const isPM = timeStr.includes('pm');
            const timeWithoutAmPm = timeStr.replace(/[ap]m/i, '');
            const [hours, minutes] = timeWithoutAmPm.split(':').map(Number);
            
            let adjustedHours = hours;
            if (isPM && hours !== 12) {
              adjustedHours = hours + 12;
            } else if (!isPM && hours === 12) {
              adjustedHours = 0;
            }
            
            endTime.setHours(adjustedHours, minutes, 0, 0);
          } else {
            // 24-hour format
            const [hours, minutes] = timeSlotEnd.split(':').map(Number);
            endTime.setHours(hours, minutes, 0, 0);
          }
          
          console.log('Parsed end time:', endTime.toLocaleString());
          console.log('Current time:', currentTime.toLocaleString());
          console.log('Is expired?', currentTime > endTime);
          
          // If current time exceeds the end time, mark as expired
          if (currentTime > endTime) {
            console.log(`Marking booking ${booking.id} as expired`);
            return { ...booking, status: 'expired' as const };
          }
        }
        return booking;
      });
      
      // Check if any bookings were updated
      const hasChanges = updatedBookings.some((booking, index) => 
        booking.status !== prevBookings[index]?.status
      );
      
      if (hasChanges) {
        console.log('Updating localStorage with expired bookings');
        
        // Update localStorage with the new booking status
        const savedBookings = JSON.parse(localStorage.getItem('driver_bookings') || '[]');
        const allBookings = savedBookings.map((savedBooking: any) => {
          const updatedBooking = updatedBookings.find(b => b.id === savedBooking.id);
          return updatedBooking || savedBooking;
        });
        localStorage.setItem('driver_bookings', JSON.stringify(allBookings));
        
        // Also update admin bookings
        const adminBookings = JSON.parse(localStorage.getItem('admin_bookings') || '[]');
        const updatedAdminBookings = adminBookings.map((adminBooking: any) => {
          const updatedBooking = updatedBookings.find(b => b.id === adminBooking.id);
          return updatedBooking ? { ...adminBooking, status: updatedBooking.status } : adminBooking;
        });
        localStorage.setItem('admin_bookings', JSON.stringify(updatedAdminBookings));
      }
      
      return updatedBookings;
    });
  };

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login');
      return;
    }

    // Load bookings from localStorage
    const savedBookings = JSON.parse(localStorage.getItem('driver_bookings') || '[]');
    const userBookings = savedBookings.filter((booking: any) => booking.driverId === user.id);
    setBookings(userBookings);
    
    // Check for expired bookings immediately
    checkAndUpdateExpiredBookings();
    
    // Set up interval to check for expired bookings every 10 seconds (more frequent for testing)
    const interval = setInterval(checkAndUpdateExpiredBookings, 10000);
    
    return () => clearInterval(interval);
  }, [user, navigate]);

  const handleAddBalance = () => {
    const amount = parseFloat(addAmount);
    if (amount && amount > 0) {
      updateBalance(amount);
      setAddAmount('');
      toast({
        title: "Balance Added",
        description: `₹${amount} has been added to your account.`,
      });
    } else {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to add.",
        variant: "destructive",
      });
    }
  };

  const handleSelectToll = (tollId: string) => {
    // Navigate to booking page with pre-selected toll
    navigate(`/book-express?toll=${tollId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
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
                      <span className="font-medium">{user.licensePlate}</span>
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
                <Button variant="outline" className="w-full">
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
                {bookings.length === 0 ? (
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
                            <h4 className="font-medium">{booking.tollName}</h4>
                            <p className="text-sm text-gray-600">{booking.timeSlot}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{booking.amount}</div>
                          <Badge variant={booking.status === 'active' ? 'default' : 'secondary'}>
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
