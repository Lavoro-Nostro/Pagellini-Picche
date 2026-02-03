import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import { devLog } from '@/lib/devLog';
import { useModeratorTeam } from '@/hooks/useModeratorTeam';

interface PlayerStats {
  name: string;
  average: number | null;
  presenze: number;
  assenze: number;
}

const PlayerAverages = () => {
  const navigate = useNavigate();
  const { teamId, isLoading: isTeamLoading } = useModeratorTeam();
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!teamId) return;

    try {
      // Get team players from profiles
      const { data: players, error: playersError } = await supabase
        .from('profiles')
        .select('name')
        .eq('team_id', teamId)
        .order('name');

      if (playersError) throw playersError;

      const playerNames = players?.map(p => p.name) || [];

      // Get total number of grade sheets for this team
      const { data: sheets, error: sheetsError } = await supabase
        .from('grade_sheets')
        .select('id')
        .eq('team_id', teamId);

      if (sheetsError) throw sheetsError;

      const totalGames = sheets?.length || 0;

      // Get all player grades for this team's grade sheets
      const sheetIds = sheets?.map(s => s.id) || [];
      
      let grades: { player_name: string; voto_generale: number | null }[] = [];
      if (sheetIds.length > 0) {
        const { data: gradesData, error: gradesError } = await supabase
          .from('player_grades')
          .select('player_name, voto_generale')
          .in('grade_sheet_id', sheetIds);

        if (gradesError) throw gradesError;
        grades = gradesData || [];
      }

      // Calculate stats per player
      const playerMap = new Map<string, { total: number; count: number }>();
      
      playerNames.forEach(player => {
        playerMap.set(player, { total: 0, count: 0 });
      });

      grades.forEach(grade => {
        if (grade.voto_generale !== null) {
          const current = playerMap.get(grade.player_name) || { total: 0, count: 0 };
          playerMap.set(grade.player_name, {
            total: current.total + Number(grade.voto_generale),
            count: current.count + 1,
          });
        }
      });

      const playerStats: PlayerStats[] = playerNames.map(name => {
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
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      fetchStats();
    }
  }, [teamId, fetchStats]);

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

        {isLoading || isTeamLoading ? (
          <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
        ) : (
          <div className="space-y-3">
            {stats.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessun giocatore nella squadra
              </div>
            ) : (
              stats.map(player => (
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
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerAverages;
