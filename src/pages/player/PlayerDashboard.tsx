import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, TrendingUp, Calendar, CalendarX } from 'lucide-react';
import { devLog } from '@/lib/devLog';

interface PlayerStats {
  presenze: number;
  assenze: number;
  totalGames: number;
  mediaRicezione: number | null;
  mediaAttacco: number | null;
  mediaDifesa: number | null;
  mediaBattuta: number | null;
  mediaGenerale: number | null;
}

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;

    try {
      // Get total number of grade sheets
      const { data: sheets, error: sheetsError } = await supabase
        .from('grade_sheets')
        .select('id');

      if (sheetsError) throw sheetsError;

      const totalGames = sheets?.length || 0;

      // Get player's grades
      const { data: grades, error: gradesError } = await supabase
        .from('player_grades')
        .select('*')
        .eq('player_name', profile.name);

      if (gradesError) throw gradesError;

      const presenze = grades?.length || 0;
      const assenze = totalGames - presenze;

      // Calculate averages
      const calcAverage = (values: (number | null)[]) => {
        const valid = values.filter((v): v is number => v !== null);
        return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
      };

      const playerStats: PlayerStats = {
        presenze,
        assenze,
        totalGames,
        mediaRicezione: calcAverage(grades?.map(g => g.ricezione) || []),
        mediaAttacco: calcAverage(grades?.map(g => g.attacco) || []),
        mediaDifesa: calcAverage(grades?.map(g => g.difesa) || []),
        mediaBattuta: calcAverage(grades?.map(g => g.battuta) || []),
        mediaGenerale: calcAverage(grades?.map(g => g.voto_generale) || []),
      };

      setStats(playerStats);
    } catch (error) {
      devLog.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/player')}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">La Mia Dashboard</h1>
        </div>

        <div className="text-center py-4">
          <h2 className="text-xl font-semibold text-foreground">{profile?.name}</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-foreground">{stats?.presenze || 0}</p>
              <p className="text-sm text-muted-foreground">Presenze / {stats?.totalGames || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <CalendarX className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <p className="text-3xl font-bold text-foreground">{stats?.assenze || 0}</p>
              <p className="text-sm text-muted-foreground">Assenze / {stats?.totalGames || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-foreground">Media Voti Ricezione</span>
                <span className="text-xl font-bold text-primary">
                  {stats?.mediaRicezione?.toFixed(2) ?? '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-foreground">Media Voti Attacco</span>
                <span className="text-xl font-bold text-primary">
                  {stats?.mediaAttacco?.toFixed(2) ?? '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-foreground">Media Voti Difesa</span>
                <span className="text-xl font-bold text-primary">
                  {stats?.mediaDifesa?.toFixed(2) ?? '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-foreground">Media Voti Battuta</span>
                <span className="text-xl font-bold text-primary">
                  {stats?.mediaBattuta?.toFixed(2) ?? '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-primary/50 border-2">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-semibold">Media Voti Generali</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {stats?.mediaGenerale?.toFixed(2) ?? '-'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboard;
