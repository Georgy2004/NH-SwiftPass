
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'driver');

-- Create enum for booking status
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'completed', 'cancelled', 'refunded');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('booking_payment', 'account_topup', 'refund', 'fine');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'driver',
  license_plate TEXT,
  balance DECIMAL(10,2) DEFAULT 1000.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create toll_booths table
CREATE TABLE public.toll_booths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  highway TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  express_lane_fee DECIMAL(8,2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  toll_booth_id UUID REFERENCES public.toll_booths(id) ON DELETE CASCADE NOT NULL,
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  distance_from_toll DECIMAL(5,2) NOT NULL,
  amount DECIMAL(8,2) NOT NULL,
  status booking_status DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toll_booths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for toll_booths table
CREATE POLICY "Anyone can view toll booths" ON public.toll_booths
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify toll booths" ON public.toll_booths
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for bookings table
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own bookings" ON public.bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for transactions table
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own transactions" ON public.transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, license_plate, balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')::user_role,
    NEW.raw_user_meta_data->>'license_plate',
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'driver') = 'driver' THEN 1000.00
      ELSE 0.00
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample toll booths data
INSERT INTO public.toll_booths (name, highway, latitude, longitude, express_lane_fee) VALUES
('Mangalore Toll Plaza', 'NH66', 12.9141, 74.8560, 45.00),
('Udupi Toll Plaza', 'NH66', 13.3409, 74.7421, 50.00),
('Kundapur Toll Plaza', 'NH66', 13.6360, 74.6890, 55.00),
('Bhatkal Toll Plaza', 'NH66', 13.9857, 74.5641, 60.00),
('Karwar Toll Plaza', 'NH66', 14.8136, 74.1294, 65.00);

-- Create function to update profile balance
CREATE OR REPLACE FUNCTION public.update_user_balance(
  user_uuid UUID,
  amount_change DECIMAL(10,2),
  transaction_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL(10,2);
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance 
  FROM public.profiles 
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if sufficient funds for negative transactions
  IF amount_change < 0 AND current_balance + amount_change < 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Update balance
  UPDATE public.profiles 
  SET balance = balance + amount_change,
      updated_at = NOW()
  WHERE id = user_uuid;
  
  -- Record transaction
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (
    user_uuid,
    CASE 
      WHEN amount_change > 0 THEN 'account_topup'::transaction_type
      ELSE 'booking_payment'::transaction_type
    END,
    ABS(amount_change),
    COALESCE(transaction_description, 
      CASE 
        WHEN amount_change > 0 THEN 'Account top-up'
        ELSE 'Express lane booking payment'
      END
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
