import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.jpg';

interface LoadingScreenProps {
  redirectTo: string;
  customMessage?: string;
}

const LoadingScreen = ({ redirectTo, customMessage }: LoadingScreenProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, redirectTo]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-dark p-6">
      <div className="text-center space-y-6 animate-fade-in">
        <img 
          src={logo} 
          alt="ASD Picche" 
          className="w-32 h-32 mx-auto rounded-2xl shadow-2xl"
        />
        <h1 className="text-4xl font-bold text-foreground">
          {customMessage || 'ASD Picche'}
        </h1>
        <div className="w-16 h-1 mx-auto gradient-primary rounded-full" />
        <p className="text-muted-foreground text-sm">{countdown}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
