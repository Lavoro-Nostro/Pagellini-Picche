import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import { Navigate } from 'react-router-dom';

const Loading = () => {
  const { user, profile } = useAuth();

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  const redirectTo = profile.role === 'moderator' ? '/moderator' : '/player';
  const customMessage = profile.role === 'player' ? `Ciao ${profile.name}!` : 'ASD Picche';

  return <LoadingScreen redirectTo={redirectTo} customMessage={customMessage} />;
};

export default Loading;
