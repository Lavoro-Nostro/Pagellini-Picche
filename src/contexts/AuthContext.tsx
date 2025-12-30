import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'moderator' | 'player';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('pagellini_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (error) {
        return { success: false, error: 'Errore di connessione' };
      }

      if (!data) {
        return { success: false, error: 'Credenziali non valide' };
      }

      const userData: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role as 'moderator' | 'player',
      };

      setUser(userData);
      localStorage.setItem('pagellini_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Errore imprevisto' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pagellini_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
