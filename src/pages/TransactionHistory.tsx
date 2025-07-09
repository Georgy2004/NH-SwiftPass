
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, Zap, Plus } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'booking' | 'balance_add';
  tollName?: string;
  amount: number;
  status: 'completed' | 'refunded' | 'pending';
  date: string;
  timeSlot?: string;
  description: string;
}

const TransactionHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login');
      return;
    }

    // Load transactions from localStorage (bookings + balance additions)
    const bookings = JSON.parse(localStorage.getItem('driver_bookings') || '[]');
    const userBookings = bookings.filter((booking: any) => booking.driverId === user.id);
    
    // Create transaction list from bookings
    const bookingTransactions: Transaction[] = userBookings.map((booking: any) => ({
      id: booking.id,
      type: 'booking',
      tollName: booking.tollName,
      amount: booking.amount,
      status: booking.status === 'completed' ? 'completed' : 
              booking.status === 'expired' ? 'completed' : 'pending',
      date: booking.createdAt,
      timeSlot: booking.timeSlot,
      description: `Express lane booking for ${booking.tollName}`
    }));

    // Add mock balance addition transactions (in real app, these would come from backend)
    const balanceTransactions: Transaction[] = [
      {
        id: 'bal_1',
        type: 'balance_add',
        amount: 500,
        status: 'completed',
        date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        description: 'Money added to account'
      },
      {
        id: 'bal_2',
        type: 'balance_add',
        amount: 1000,
        status: 'completed',
        date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        description: 'Money added to account'
      }
    ];

    // Combine and sort by date (newest first)
    const allTransactions = [...bookingTransactions, ...balanceTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setTransactions(allTransactions);
  }, [user, navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'refunded': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getTransactionIcon = (type: string) => {
    return type === 'booking' ? <Zap className="h-4 w-4" /> : <Plus className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="highway-gradient text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              className="bg-white text-highway-blue hover:bg-gray-100"
              onClick={() => navigate('/driver')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Transaction History</h1>
              <p className="text-blue-100">All your bookings and account activities</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card className="toll-card">
          <CardHeader>
            <CardTitle className="text-highway-blue flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Express lane bookings and money additions to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Transactions Yet</h3>
                <p className="text-gray-500 mb-4">
                  Your booking and payment history will appear here.
                </p>
                <Button 
                  className="express-gradient text-white"
                  onClick={() => navigate('/book-express')}
                >
                  Make Your First Booking
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'booking' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{transaction.description}</h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(transaction.date)}
                          {transaction.timeSlot && ` • ${transaction.timeSlot}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <div className={`font-medium ${transaction.type === 'booking' ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.type === 'booking' ? '-' : '+'}₹{transaction.amount}
                        </div>
                        <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {transaction.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionHistory;
