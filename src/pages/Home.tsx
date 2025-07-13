import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, MapPin, Clock, Shield, Zap, Users } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header - Updated with responsive buttons */}
      <header className="highway-gradient text-white py-4 md:py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <Car className="h-6 w-6 md:h-8 md:w-8" />
              <h1 className="text-xl md:text-2xl font-bold">NH SwiftPass</h1>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-4 w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="bg-white text-highway-blue hover:bg-gray-100 py-1 md:py-2 text-sm md:text-base"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button 
                variant="outline" 
                className="bg-white text-highway-blue hover:bg-gray-100 py-1 md:py-2 text-sm md:text-base"
                onClick={() => navigate('/register')}
              >
                Register
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4 md:mb-6 animate-fade-in">
            Skip the <span className="text-highway-blue">Toll Queue</span>
          </h2>
          <p className="text-base md:text-xl text-gray-600 mb-6 md:mb-8 max-w-3xl mx-auto">
            Book your express lane passage in advance and save valuable time on Indian highways. 
            Smart booking system with AI-powered verification ensures fast and secure toll collection.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Button 
              size="lg" 
              className="highway-gradient text-white px-6 py-3 md:px-8 md:py-4 text-base md:text-lg"
              onClick={() => navigate('/register')}
            >
              Get Started Today
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-6 py-3 md:px-8 md:py-4 text-base md:text-lg border-highway-blue text-highway-blue"
              onClick={() => navigate('/learn-more')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-8 md:mb-12">
            Why Choose Highway Express?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="toll-card hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <Clock className="h-10 w-10 md:h-12 md:w-12 text-highway-blue mx-auto mb-3 md:mb-4" />
                <CardTitle className="text-highway-blue">Time Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm md:text-base">
                  Book express lanes within 5-10km radius and save up to 30 minutes per toll booth.
                  Smart time slot allocation based on your distance.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="toll-card hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <Shield className="h-10 w-10 md:h-12 md:w-12 text-highway-green mx-auto mb-3 md:mb-4" />
                <CardTitle className="text-highway-green">AI Security</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm md:text-base">
                  Advanced AI camera systems verify license plates and prevent unauthorized 
                  access to express lanes with real-time monitoring.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="toll-card hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <Zap className="h-10 w-10 md:h-12 md:w-12 text-highway-orange mx-auto mb-3 md:mb-4" />
                <CardTitle className="text-highway-orange">Smart Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm md:text-base">
                  Dynamic pricing with refund options. Get partial refunds if you use 
                  regular lanes after booking express access.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-8 md:mb-12">
            How It Works
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 highway-gradient rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="text-white text-lg md:text-xl font-bold">1</span>
              </div>
              <h4 className="font-semibold text-sm md:text-base text-gray-800 mb-1 md:mb-2">Register Account</h4>
              <p className="text-xs md:text-sm text-gray-600">Create account with license plate and add balance</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 highway-gradient rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="text-white text-lg md:text-xl font-bold">2</span>
              </div>
              <h4 className="font-semibold text-sm md:text-base text-gray-800 mb-1 md:mb-2">Book Express Lane</h4>
              <p className="text-xs md:text-sm text-gray-600">Select toll booth and get time slot within radius</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 highway-gradient rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="text-white text-lg md:text-xl font-bold">3</span>
              </div>
              <h4 className="font-semibold text-sm md:text-base text-gray-800 mb-1 md:mb-2">Drive to Toll</h4>
              <p className="text-xs md:text-sm text-gray-600">Reach toll booth within allocated time window</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 highway-gradient rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="text-white text-lg md:text-xl font-bold">4</span>
              </div>
              <h4 className="font-semibold text-sm md:text-base text-gray-800 mb-1 md:mb-2">Express Pass</h4>
              <p className="text-xs md:text-sm text-gray-600">AI verifies and lets you pass through express lane</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16 highway-gradient text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
            <div>
              <div className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">10,000+</div>
              <div className="text-xs md:text-sm text-blue-100">Happy Drivers</div>
            </div>
            <div>
              <div className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">500+</div>
              <div className="text-xs md:text-sm text-blue-100">Toll Booths</div>
            </div>
            <div>
              <div className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">30 min</div>
              <div className="text-xs md:text-sm text-blue-100">Average Time Saved</div>
            </div>
            <div>
              <div className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">99.9%</div>
              <div className="text-xs md:text-sm text-blue-100">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 md:py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 md:space-x-3 mb-3 md:mb-4">
            <Car className="h-5 w-5 md:h-6 md:w-6" />
            <span className="text-lg md:text-xl font-bold">NH SwiftPass</span>
          </div>
          <p className="text-xs md:text-sm text-gray-400">
            Making Indian highways smarter, one toll at a time.
          </p>
          <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">
            B.Tech Final Year Project - NH-SwiftPass
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
