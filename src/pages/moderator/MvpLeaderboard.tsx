import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useModeratorTeam } from '@/hooks/useModeratorTeam';
import { ArrowLeft, Trophy, Medal } from 'lucide-react';
import { devLog } from '@/lib/devLog';

interface MvpCount {
  player_name: string;
  mvp_count: number;
}

const MvpLeaderboard = () => {
  const navigate = useNavigate();
  const { teamId } = useModeratorTeam();
  const [mvpCounts, setMvpCounts] = useState<MvpCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      fetchMvpCounts();
    }
  }, [teamId]);

  const fetchMvpCounts = async () => {
    try {
      // Get all grade sheets for this team that are matches
      const { data: sheets, error: sheetsError } = await supabase
        .from('grade_sheets')
        .select('id')
        .eq('team_id', teamId)
        .eq('sheet_category', 'partita');

      if (sheetsError) throw sheetsError;

      if (!sheets || sheets.length === 0) {
        setMvpCounts([]);
        setIsLoading(false);
        return;
      }

      const sheetIds = sheets.map(s => s.id);

      // Get MVP grades
      const { data: mvpGrades, error: gradesError } = await supabase
        .from('player_grades')
        .select('player_name')
        .in('grade_sheet_id', sheetIds)
        .eq('is_mvp', true);

      if (gradesError) throw gradesError;

      // Count MVPs per player
      const countMap: Record<string, number> = {};
      (mvpGrades || []).forEach(grade => {
        countMap[grade.player_name] = (countMap[grade.player_name] || 0) + 1;
      });

      // Convert to array and sort
      const counts: MvpCount[] = Object.entries(countMap)
        .map(([player_name, mvp_count]) => ({ player_name, mvp_count }))
        .sort((a, b) => b.mvp_count - a.mvp_count);

      setMvpCounts(counts);
    } catch (error) {
      devLog.error('Error fetching MVP counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-700" />;
    return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{index + 1}</span>;
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
            onClick={() => navigate('/moderator')}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Classifica MVP</h1>
        </div>

        {mvpCounts.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessun MVP votato ancora</p>
              <p className="text-sm text-muted-foreground mt-2">
                Puoi votare l'MVP di una partita dalla pagina di dettaglio del pagellino
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mvpCounts.map((item, index) => (
              <Card 
                key={item.player_name} 
                className={`bg-card border-border ${index === 0 ? 'border-yellow-500/50 border-2' : ''}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {getMedalIcon(index)}
                  <div className="flex-1">
                    <p className="text-foreground font-semibold">{item.player_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{item.mvp_count}</p>
                    <p className="text-xs text-muted-foreground">MVP</p>
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

export default MvpLeaderboard;
