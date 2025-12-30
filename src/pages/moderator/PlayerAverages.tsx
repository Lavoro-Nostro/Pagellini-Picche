import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import { devLog } from '@/lib/devLog';
import { PLAYER_NAMES } from '@/lib/validation';

interface PlayerStats {
  name: string;
  average: number | null;
  presenze: number;
  assenze: number;
}

const PlayerAverages = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total number of grade sheets
      const { data: sheets, error: sheetsError } = await supabase
        .from('grade_sheets')
        .select('id');

      if (sheetsError) throw sheetsError;

      const totalGames = sheets?.length || 0;

      // Get all player grades
      const { data: grades, error: gradesError } = await supabase
        .from('player_grades')
        .select('player_name, voto_generale');

      if (gradesError) throw gradesError;

      // Calculate stats per player
      const playerMap = new Map<string, { total: number; count: number }>();
      
      PLAYER_NAMES.forEach(player => {
        playerMap.set(player, { total: 0, count: 0 });
      });

      grades?.forEach(grade => {
        if (grade.voto_generale !== null) {
          const current = playerMap.get(grade.player_name) || { total: 0, count: 0 };
          playerMap.set(grade.player_name, {
            total: current.total + Number(grade.voto_generale),
            count: current.count + 1,
          });
        }
      });

      const playerStats: PlayerStats[] = PLAYER_NAMES.map(name => {
        const data = playerMap.get(name) || { total: 0, count: 0 };
        return {
          name,
          average: data.count > 0 ? data.total / data.count : null,
          presenze: data.count,
          assenze: totalGames - data.count,
        };
      });

      setStats(playerStats);
    } catch (error) {
      devLog.error('Error fetching player stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/moderator')}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Medie Giocatori</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
        ) : (
          <div className="space-y-3">
            {stats.map(player => (
              <Card key={player.name} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{player.name}</h3>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>Presenze: {player.presenze}</p>
                        <p>Assenze: {player.assenze}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {player.average !== null ? player.average.toFixed(2) : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">media</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerAverages;
