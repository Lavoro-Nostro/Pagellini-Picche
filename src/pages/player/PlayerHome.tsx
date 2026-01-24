import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, BarChart3, LogOut, CalendarDays, History, TrendingUp } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import NextMatchCard from '@/components/NextMatchCard';
import { useNextMatch } from '@/hooks/useNextMatch';
import { usePlayerTeam } from '@/hooks/usePlayerTeam';

const PlayerHome = () => {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const { nextMatch, isLoading } = useNextMatch();
  const { teamName } = usePlayerTeam();

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
          {teamName && (
            <p className="text-lg font-semibold text-primary">{teamName}</p>
          )}
          <p className="text-muted-foreground">Benvenuto, {profile?.name}!</p>
          <div className="w-16 h-1 mx-auto gradient-primary rounded-full" />
        </div>

        <div className="space-y-4 pt-8">
          <Button
            onClick={() => navigate('/player/latest')}
            className="w-full h-14 gradient-primary text-primary-foreground font-semibold text-lg gap-3"
          >
            <FileText className="w-5 h-5" />
            Ultimo Pagellino
          </Button>

          <Button
            onClick={() => navigate('/player/history')}
            variant="outline"
            className="w-full h-14 border-primary/50 text-foreground font-semibold text-lg gap-3 hover:bg-primary/10"
          >
            <History className="w-5 h-5" />
            Storico Pagellini
          </Button>

          <Button
            onClick={() => navigate('/player/dashboard')}
            variant="outline"
            className="w-full h-14 border-secondary/50 text-foreground font-semibold text-lg gap-3 hover:bg-secondary/10"
          >
            <BarChart3 className="w-5 h-5" />
            La Mia Dashboard
          </Button>

          <Button
            onClick={() => navigate('/player/team-performance')}
            variant="outline"
            className="w-full h-14 border-secondary/50 text-foreground font-semibold text-lg gap-3 hover:bg-secondary/10"
          >
            <TrendingUp className="w-5 h-5" />
            Andamento Squadra
          </Button>
        </div>

        <div className="space-y-3">
          <NextMatchCard match={nextMatch} isLoading={isLoading} />
          <Button
            onClick={() => navigate('/player/matches')}
            variant="outline"
            className="w-full border-border/50 text-muted-foreground hover:text-foreground gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            Vedi Tutte le Partite
          </Button>
        </div>

        <div className="pt-4">
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

export default PlayerHome;
