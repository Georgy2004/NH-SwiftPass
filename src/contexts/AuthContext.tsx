
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'driver';
  licensePlate?: string;
  balance?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string, selectedRole?: 'admin' | 'driver') => Promise<boolean>;
  register: (email: string, password: string, role: 'admin' | 'driver', licensePlate?: string) => Promise<boolean>;
  logout: () => void;
  updateBalance: (amount: number) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<AuthUser | null> => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      console.log('Profile fetched successfully:', profile);
      return {
        id: profile.id,
        email: profile.email,
        role: profile.role as 'admin' | 'driver',
        licensePlate: profile.license_plate,
        balance: profile.balance
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          // Use a small delay to ensure database consistency
          setTimeout(async () => {
            const userProfile = await fetchUserProfile(session.user.id);
            setUser(userProfile);
            setLoading(false);
          }, 100);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id);
          setUser(userProfile);
          setSession(session);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string, selectedRole?: 'admin' | 'driver'): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      if (data.user && data.session) {
        console.log('Login successful, user:', data.user.id);
        
        // Wait for the profile to be fetched before resolving
        const userProfile = await fetchUserProfile(data.user.id);
        if (userProfile) {
          if (selectedRole && userProfile.role !== selectedRole) {
            toast({
              title: "Login Failed",
              description: `Role mismatch: You tried to login as '${selectedRole}' but your account is '${userProfile.role}'.`,
              variant: "destructive",
            });
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setLoading(false);
            return false;
          }
          setUser(userProfile);
          setSession(data.session);
          setLoading(false);
          return true;
        } else {
          console.error('Failed to fetch user profile after login');
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setLoading(false);
          return false;
        }
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred during login.",
        variant: "destructive",
      });
      setLoading(false);
      return false;
    }
  };

  const register = async (email: string, password: string, role: 'admin' | 'driver', licensePlate?: string): Promise<boolean> => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role,
            license_plate: licensePlate,
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        
        // Handle specific error cases
        if (error.message.includes('User already registered')) {
          toast({
            title: "Registration Failed",
            description: "An account with this email already exists. Please try logging in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return false;
      }

      if (data.user) {
        toast({
          title: "Registration Successful",
          description: "Welcome to Highway Express! Your account has been created successfully.",
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Error",
        description: "An unexpected error occurred during registration.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Starting logout process');
      setLoading(true);
      
      // Clear state immediately
      setUser(null);
      setSession(null);
      
      // Perform logout
      await supabase.auth.signOut();
      
      // Clear any cached data
      localStorage.removeItem('supabase.auth.token');
      
      console.log('Logout completed');
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async (amount: number) => {
    if (!user || user.role !== 'driver') return;

    // Only refresh user profile - transactions are handled by individual operations
    try {
      const updatedProfile = await fetchUserProfile(user.id);
      if (updatedProfile) {
        setUser(updatedProfile);
      }
    } catch (error) {
      console.error('Balance refresh error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      login, 
      register, 
      logout, 
      updateBalance, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
