
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
  login: (email: string, password: string) => Promise<boolean>;
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
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

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
          // Fetch user profile data
          const userProfile = await fetchUserProfile(session.user.id);
          setUser(userProfile);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setUser(userProfile);
        setSession(session);
      }
      setLoading(false);
    };

    getInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
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
        return false;
      }

      if (data.user) {
        const userProfile = await fetchUserProfile(data.user.id);
        setUser(userProfile);
        setSession(data.session);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
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
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      if (data.user) {
        // The trigger will create the profile automatically
        // Wait a moment then fetch the profile
        setTimeout(async () => {
          const userProfile = await fetchUserProfile(data.user!.id);
          setUser(userProfile);
        }, 1000);
        
        toast({
          title: "Registration Successful",
          description: "Welcome to Highway Express! Please check your email to confirm your account.",
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateBalance = async (amount: number) => {
    if (!user || user.role !== 'driver') return;

    try {
      const { data, error } = await supabase.rpc('update_user_balance', {
        user_uuid: user.id,
        amount_change: amount,
        transaction_description: 'Money added to account'
      });

      if (error) {
        console.error('Balance update error:', error);
        toast({
          title: "Error",
          description: "Failed to update balance. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        // Refresh user profile
        const updatedProfile = await fetchUserProfile(user.id);
        if (updatedProfile) {
          setUser(updatedProfile);
        }
      }
    } catch (error) {
      console.error('Balance update error:', error);
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
