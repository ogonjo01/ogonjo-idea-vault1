// src/hooks/useAuth.ts
import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Define the shape of your AuthContext values
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<Error | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession ? currentSession.user : null);
        setLoading(false);
      }
    );

    // Initial check for session on mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession ? initialSession.user : null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setUser(data.user);
    setSession(data.session);
    setLoading(false);
    return { user: data.user, error: error };
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setUser(data.user); // User might be null until email confirmed
    setSession(data.session);
    setLoading(false);
    // For signup, if successful, you might want to trigger profile creation immediately
    if (data.user) {
        // This is a good place to create the initial user profile with default role 'user'
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: data.user.id, // Supabase user ID
                email: data.user.email,
                full_name: data.user.email?.split('@')[0] || 'New User', // Default name
                role: 'user' // Default role
            });
        if (profileError) {
            console.error("Error creating user profile:", profileError.message);
        }
    }
    return { user: data.user, error: error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
    return error;
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};