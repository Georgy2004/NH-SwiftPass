import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, Zap, Plus, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToPDF, exportToExcel } from '@/utils/transactionExport';

interface Transaction {
  id: string;
  type: 'booking_payment' | 'account_topup' | 'refund' | 'fine';
  amount: number;
  description: string;
  created_at: string;
  booking_id?: string;
}

const TransactionHistory = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'driver')) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchTransactions();
    }
  }, [user, loading, navigate]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      setLoadingTransactions(true);
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'booking_payment': return <Zap className="h-4 w-4" />;
      case 'account_topup': return <Plus className="h-4 w-4" />;
      case 'refund': return <ArrowLeft className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'booking_payment': return 'bg-blue-100 text-blue-600';
      case 'account_topup': return 'bg-green-100 text-green-600';
      case 'refund': return 'bg-yellow-100 text-yellow-600';
      case 'fine': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'booking_payment':
      case 'fine':
        return 'text-red-600';
      case 'account_topup':
      case 'refund':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getAmountPrefix = (type: string) => {
    switch (type) {
      case 'booking_payment':
      case 'fine':
        return '-';
      case 'account_topup':
      case 'refund':
        return '+';
      default:
        return '';
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-highway-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-highway-blue flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  Express lane bookings and money additions to your account
                </CardDescription>
              </div>
              {transactions.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToPDF(transactions, user.email)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToExcel(transactions, user.email)}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-highway-blue mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{transaction.description}</h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <div className={`font-medium ${getAmountColor(transaction.type)}`}>
                          {getAmountPrefix(transaction.type)}₹{transaction.amount}
                        </div>
                        <Badge variant="default" className="text-xs">
                          {transaction.type.replace('_', ' ').toUpperCase()}
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
