
-- First, let's check if there are any orphaned users in auth without profiles
-- and clean up any incomplete registrations

-- Drop the existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table with proper error handling
  INSERT INTO public.profiles (id, email, role, license_plate, balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'driver'::user_role),
    NEW.raw_user_meta_data->>'license_plate',
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'driver'::user_role) = 'driver' THEN 1000.00
      ELSE 0.00
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and still return NEW to not block user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Clean up any users who don't have corresponding profiles
-- and create profiles for existing auth users
INSERT INTO public.profiles (id, email, role, balance)
SELECT 
  au.id,
  au.email,
  'driver'::user_role as role,
  1000.00 as balance
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
