
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Car, Camera, Clock, Shield, MapPin, Zap } from 'lucide-react';

const LearnMore = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="highway-gradient text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              className="bg-white text-highway-blue hover:bg-gray-100"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-2xl font-bold">About Highway Express</h1>
              <p className="text-blue-100">Smart Toll Express Booking System</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main Content */}
          <Card className="toll-card">
            <CardHeader>
              <CardTitle className="text-highway-blue text-2xl">The Problem We Solve</CardTitle>
              <CardDescription className="text-lg">
                Understanding the challenges of highway toll congestion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-700 text-lg leading-relaxed">
                Toll plazas on highways like NH66 often face heavy congestion, leading to time delays even with FASTag systems in place. To solve this, we propose a Smart Toll Express Booking System that allows users to pre-book access to a dedicated Express Lane within 5–20 km of the toll booth.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                The express lane will be monitored by AI cameras to detect unregistered vehicles, with fines for violations. Users who book but use the regular lane will receive a partial refund. This system aims to reduce waiting time, ensure faster traffic flow, and improve toll booth efficiency.
              </p>
            </CardContent>
          </Card>

          {/* Key Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="toll-card">
              <CardHeader>
                <MapPin className="h-8 w-8 text-highway-blue mb-2" />
                <CardTitle className="text-highway-blue">Smart Distance Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Book express lanes when you're within 5-20km radius of toll booths. 
                  Our system automatically detects your location and calculates optimal time slots.
                </p>
              </CardContent>
            </Card>

            <Card className="toll-card">
              <CardHeader>
                <Camera className="h-8 w-8 text-highway-green mb-2" />
                <CardTitle className="text-highway-green">AI Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Advanced AI cameras monitor express lanes to detect unauthorized vehicles 
                  and ensure only pre-booked users access the dedicated lanes.
                </p>
              </CardContent>
            </Card>

            <Card className="toll-card">
              <CardHeader>
                <Shield className="h-8 w-8 text-highway-orange mb-2" />
                <CardTitle className="text-highway-orange">Fair Refund System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  If you book express access but end up using regular lanes, 
                  you'll receive a partial refund ensuring fair pricing for all users.
                </p>
              </CardContent>
            </Card>

            <Card className="toll-card">
              <CardHeader>
                <Clock className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle className="text-blue-600">Time Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Save valuable time with pre-allocated time slots and skip the regular 
                  toll queue, making your highway journey faster and more predictable.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <Card className="toll-card bg-gradient-to-r from-blue-50 to-green-50">
            <CardContent className="text-center py-8">
              <Car className="h-16 w-16 text-highway-blue mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Ready to Skip the Queue?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Join thousands of drivers who are already saving time and reducing stress 
                on Indian highways with our smart toll booking system.
              </p>
              <div className="space-x-4">
                <Button 
                  size="lg" 
                  className="highway-gradient text-white px-8 py-3"
                  onClick={() => navigate('/register')}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Get Started Now
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-highway-blue text-highway-blue px-8 py-3"
                  onClick={() => navigate('/')}
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LearnMore;
