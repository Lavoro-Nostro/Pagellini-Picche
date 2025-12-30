import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, History, BarChart3, LogOut } from 'lucide-react';
import logo from '@/assets/logo.jpg';

const ModeratorHome = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen gradient-dark p-6">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4 pt-8">
          <img 
            src={logo} 
            alt="ASD Picche" 
            className="w-24 h-24 mx-auto rounded-xl shadow-lg"
          />
          <h1 className="text-3xl font-bold text-foreground">ASD Picche</h1>
          <div className="w-16 h-1 mx-auto gradient-primary rounded-full" />
        </div>

        <div className="space-y-4 pt-8">
          <Button
            onClick={() => navigate('/moderator/create')}
            className="w-full h-14 gradient-primary text-primary-foreground font-semibold text-lg gap-3"
          >
            <Plus className="w-5 h-5" />
            Crea Pagellino
          </Button>

          <Button
            onClick={() => navigate('/moderator/history')}
            variant="outline"
            className="w-full h-14 border-primary/50 text-foreground font-semibold text-lg gap-3 hover:bg-primary/10"
          >
            <History className="w-5 h-5" />
            Vedi Storico Pagellini Passati
          </Button>

          <Button
            onClick={() => navigate('/moderator/averages')}
            variant="outline"
            className="w-full h-14 border-secondary/50 text-foreground font-semibold text-lg gap-3 hover:bg-secondary/10"
          >
            <BarChart3 className="w-5 h-5" />
            Vedi Medie Giocatori
          </Button>
        </div>

        <div className="pt-8">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground gap-2"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModeratorHome;
