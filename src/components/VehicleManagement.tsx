import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Car, Plus, Trash2, Star, Edit2 } from 'lucide-react';

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_type: string;
  vehicle_name: string | null;
  is_primary: boolean;
  created_at: string;
}

const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'truck', label: 'Truck' },
  { value: 'bus', label: 'Bus' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
];

const VehicleManagement = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  // Form state
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [vehicleName, setVehicleName] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const fetchVehicles = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
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

      setVehicles(data || []);
    } catch (error) {
      console.error('Error in fetchVehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLicensePlate('');
    setVehicleType('car');
    setVehicleName('');
    setIsPrimary(false);
  };

  const handleAddVehicle = async () => {
    if (!user || !licensePlate.trim()) {
      toast({
        title: "Error",
        description: "License plate is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // If this is the first vehicle or marked as primary, update other vehicles
      if (isPrimary || vehicles.length === 0) {
        await supabase
          .from('vehicles')
          .update({ is_primary: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase.from('vehicles').insert({
        user_id: user.id,
        license_plate: licensePlate.trim().toUpperCase(),
        vehicle_type: vehicleType,
        vehicle_name: vehicleName.trim() || null,
        is_primary: isPrimary || vehicles.length === 0,
      });

      if (error) {
        console.error('Error adding vehicle:', error);
        toast({
          title: "Error",
          description: "Failed to add vehicle",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Vehicle Added",
        description: `${licensePlate.toUpperCase()} has been added to your account.`,
      });

      resetForm();
      setIsAddDialogOpen(false);
      fetchVehicles();
    } catch (error) {
      console.error('Error in handleAddVehicle:', error);
    }
  };

  const handleEditVehicle = async () => {
    if (!user || !editingVehicle || !licensePlate.trim()) {
      toast({
        title: "Error",
        description: "License plate is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // If marking as primary, update other vehicles
      if (isPrimary && !editingVehicle.is_primary) {
        await supabase
          .from('vehicles')
          .update({ is_primary: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('vehicles')
        .update({
          license_plate: licensePlate.trim().toUpperCase(),
          vehicle_type: vehicleType,
          vehicle_name: vehicleName.trim() || null,
          is_primary: isPrimary,
        })
        .eq('id', editingVehicle.id);

      if (error) {
        console.error('Error updating vehicle:', error);
        toast({
          title: "Error",
          description: "Failed to update vehicle",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Vehicle Updated",
        description: `${licensePlate.toUpperCase()} has been updated.`,
      });

      resetForm();
      setEditingVehicle(null);
      setIsEditDialogOpen(false);
      fetchVehicles();
    } catch (error) {
      console.error('Error in handleEditVehicle:', error);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) {
        console.error('Error deleting vehicle:', error);
        toast({
          title: "Error",
          description: "Failed to delete vehicle",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Vehicle Removed",
        description: "Vehicle has been removed from your account.",
      });

      fetchVehicles();
    } catch (error) {
      console.error('Error in handleDeleteVehicle:', error);
    }
  };

  const handleSetPrimary = async (vehicleId: string) => {
    if (!user) return;

    try {
      // First, unset all vehicles as primary
      await supabase
        .from('vehicles')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Then set the selected vehicle as primary
      const { error } = await supabase
        .from('vehicles')
        .update({ is_primary: true })
        .eq('id', vehicleId);

      if (error) {
        console.error('Error setting primary vehicle:', error);
        toast({
          title: "Error",
          description: "Failed to set primary vehicle",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Primary Vehicle Set",
        description: "Primary vehicle has been updated.",
      });

      fetchVehicles();
    } catch (error) {
      console.error('Error in handleSetPrimary:', error);
    }
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setLicensePlate(vehicle.license_plate);
    setVehicleType(vehicle.vehicle_type);
    setVehicleName(vehicle.vehicle_name || '');
    setIsPrimary(vehicle.is_primary);
    setIsEditDialogOpen(true);
  };

  const getVehicleIcon = (type: string) => {
    return <Car className="h-5 w-5" />;
  };

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-highway-blue flex items-center gap-2">
              <Car className="h-5 w-5" />
              My Vehicles
            </CardTitle>
            <CardDescription>
              Manage multiple vehicles under your account
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="highway-gradient" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">License Plate *</Label>
                  <Input
                    id="licensePlate"
                    placeholder="e.g., MH01AB1234"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleName">Vehicle Name (Optional)</Label>
                  <Input
                    id="vehicleName"
                    placeholder="e.g., My Honda City"
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isPrimary">Set as primary vehicle</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setIsAddDialogOpen(false); }}>
                  Cancel
                </Button>
                <Button className="highway-gradient" onClick={handleAddVehicle}>
                  Add Vehicle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {vehicles.length === 0 ? (
          <div className="text-center py-8">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Vehicles Added</h3>
            <p className="text-gray-500 mb-4">
              Add your first vehicle to start booking express lanes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-highway-blue/10 rounded-full">
                    {getVehicleIcon(vehicle.vehicle_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{vehicle.license_plate}</h4>
                      {vehicle.is_primary && (
                        <Badge className="bg-yellow-500 text-white text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {vehicle.vehicle_name || VEHICLE_TYPES.find(t => t.value === vehicle.vehicle_type)?.label || 'Vehicle'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!vehicle.is_primary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetPrimary(vehicle.id)}
                      title="Set as primary"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(vehicle)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vehicle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editLicensePlate">License Plate *</Label>
                <Input
                  id="editLicensePlate"
                  placeholder="e.g., MH01AB1234"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVehicleType">Vehicle Type</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVehicleName">Vehicle Name (Optional)</Label>
                <Input
                  id="editVehicleName"
                  placeholder="e.g., My Honda City"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editIsPrimary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="editIsPrimary">Set as primary vehicle</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setEditingVehicle(null); setIsEditDialogOpen(false); }}>
                Cancel
              </Button>
              <Button className="highway-gradient" onClick={handleEditVehicle}>
                Update Vehicle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default VehicleManagement;
