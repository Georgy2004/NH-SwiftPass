
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Car, ArrowLeft } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'driver'>('driver');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false); // Track login success
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user && !loginSuccess) {
    navigate(user.role === 'admin' ? '/admin' : '/driver');
    return null;
  }

  useEffect(() => {
    if (loginSuccess && user) {
      toast({
        title: "Login Successful",
        description: `Welcome back! Redirecting to ${user.role} dashboard.`,
      });
      navigate(user.role === 'admin' ? '/admin' : '/driver');
      setLoginSuccess(false); // Reset for next login
    }
  }, [loginSuccess, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return; // Prevent double submission
    
    setLoading(true);

    try {
      console.log('Login form submitted for:', email, 'as', role);
      const success = await login(email, password); // Remove role argument
      
      if (success) {
        setLoginSuccess(true); // Trigger useEffect for navigation and toast
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid email, password, or role. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login form error:', error);
      toast({
        title: "Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="toll-card">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Car className="h-8 w-8 text-highway-blue" />
              <span className="text-2xl font-bold text-highway-blue">Highway Express</span>
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to manage toll bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Login As</Label>
                <Select value={role} onValueChange={(value: 'admin' | 'driver') => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full highway-gradient text-white"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-highway-blue hover:underline font-medium">
                  Register here
                </Link>
              </p>
            </div>

            {/* Demo Accounts */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Demo Accounts:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Admin: admin@highway.com / admin123</div>
                <div>Driver: driver@highway.com / driver123</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
