import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Car, Search, Star, User } from 'lucide-react';

interface VehicleWithOwner {
  id: string;
  license_plate: string;
  vehicle_type: string;
  vehicle_name: string | null;
  is_primary: boolean;
  created_at: string;
  owner_email: string;
  owner_id: string;
}

const VEHICLE_TYPES: Record<string, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  truck: 'Truck',
  bus: 'Bus',
  suv: 'SUV',
  van: 'Van',
};

const AdminVehicleList = () => {
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllVehicles();
  }, []);

  const fetchAllVehicles = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          license_plate,
          vehicle_type,
          vehicle_name,
          is_primary,
          created_at,
          profiles:user_id (
            id,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicles:', error);
        toast({
          title: "Error",
          description: "Failed to load vehicles",
          variant: "destructive",
        });
        return;
      }

      const transformedVehicles: VehicleWithOwner[] = (data || []).map((vehicle: any) => ({
        id: vehicle.id,
        license_plate: vehicle.license_plate,
        vehicle_type: vehicle.vehicle_type,
        vehicle_name: vehicle.vehicle_name,
        is_primary: vehicle.is_primary,
        created_at: vehicle.created_at,
        owner_email: vehicle.profiles?.email || 'Unknown',
        owner_id: vehicle.profiles?.id || '',
      }));

      setVehicles(transformedVehicles);
    } catch (error) {
      console.error('Error in fetchAllVehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.vehicle_name && vehicle.vehicle_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group vehicles by owner
  const groupedVehicles = filteredVehicles.reduce((acc, vehicle) => {
    if (!acc[vehicle.owner_id]) {
      acc[vehicle.owner_id] = {
        email: vehicle.owner_email,
        vehicles: [],
      };
    }
    acc[vehicle.owner_id].vehicles.push(vehicle);
    return acc;
  }, {} as Record<string, { email: string; vehicles: VehicleWithOwner[] }>);

  if (loading) {
    return (
      <Card className="toll-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-highway-blue"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="toll-card">
      <CardHeader>
        <CardTitle className="text-highway-blue flex items-center gap-2">
          <Car className="h-5 w-5" />
          All Registered Vehicles
        </CardTitle>
        <CardDescription>
          View all vehicles registered by drivers
        </CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by license plate, email, or vehicle name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedVehicles).length === 0 ? (
          <div className="text-center py-8">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Vehicles Found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'No vehicles match your search.' : 'No vehicles have been registered yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[500px] overflow-y-auto">
            {Object.entries(groupedVehicles).map(([ownerId, { email, vehicles: ownerVehicles }]) => (
              <div key={ownerId} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                  <User className="h-4 w-4 text-highway-blue" />
                  <span className="font-medium text-highway-blue">{email}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {ownerVehicles.length} vehicle{ownerVehicles.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {ownerVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-highway-blue/10 rounded-full">
                          <Car className="h-4 w-4 text-highway-blue" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{vehicle.license_plate}</span>
                            {vehicle.is_primary && (
                              <Badge className="bg-yellow-500 text-white text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {vehicle.vehicle_name || VEHICLE_TYPES[vehicle.vehicle_type] || 'Vehicle'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <Badge variant="outline">
                          {VEHICLE_TYPES[vehicle.vehicle_type] || vehicle.vehicle_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminVehicleList;
