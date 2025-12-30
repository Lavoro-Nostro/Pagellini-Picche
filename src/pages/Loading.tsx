import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import { Navigate } from 'react-router-dom';

const Loading = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const redirectTo = user.role === 'moderator' ? '/moderator' : '/player';
  const customMessage = user.role === 'player' ? `Ciao ${user.name}!` : 'ASD Picche';

  return <LoadingScreen redirectTo={redirectTo} customMessage={customMessage} />;
};

export default Loading;
