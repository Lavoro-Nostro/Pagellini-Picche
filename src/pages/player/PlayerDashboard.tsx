import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, TrendingUp, Calendar, CalendarX, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { devLog } from '@/lib/devLog';
import { getPlayerRole } from '@/lib/playerRoles';
import PlayerPerformanceChart from '@/components/PlayerPerformanceChart';

interface PlayerStats {
  presenze: number;
  assenze: number;
  totalGames: number;
  mediaGenerale: number | null;
  mvpCount: number;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  average: number;
}

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;

    try {
      // Get all grade sheets
      const { data: sheets, error: sheetsError } = await supabase
        .from('grade_sheets')
        .select('id, sheet_date')
        .order('sheet_date', { ascending: true });

      if (sheetsError) throw sheetsError;

      const totalGames = sheets?.length || 0;

      // Get player's grades
      const { data: grades, error: gradesError } = await supabase
        .from('player_grades')
        .select('grade_sheet_id, voto_generale, is_mvp')
        .eq('player_name', profile.name);

      if (gradesError) throw gradesError;

      const presenze = grades?.length || 0;
      const assenze = totalGames - presenze;

      // Calculate overall average
      const validGrades = grades?.map(g => g.voto_generale).filter((v): v is number => v !== null) || [];
      const mediaGenerale = validGrades.length > 0
        ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length
        : null;

      // Count MVP awards
      const mvpCount = grades?.filter(g => g.is_mvp).length || 0;

      // Build chart data - match grades to sheets by date order
      const chartPoints: ChartDataPoint[] = [];
      if (sheets && grades) {
        for (const sheet of sheets) {
          const playerGrade = grades.find(g => g.grade_sheet_id === sheet.id);
          if (playerGrade && playerGrade.voto_generale !== null) {
            chartPoints.push({
              date: sheet.sheet_date,
              displayDate: format(new Date(sheet.sheet_date), 'd MMM', { locale: it }),
              average: playerGrade.voto_generale,
            });
          }
        }
      }

      setStats({
        presenze,
        assenze,
        totalGames,
        mediaGenerale,
        mvpCount,
      });
      setChartData(chartPoints);
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
          <p className="text-sm text-muted-foreground">
            {getPlayerRole(profile?.name || '')}
          </p>
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

        {stats && stats.mvpCount > 0 && (
          <Card className="bg-card border-yellow-500/50 border-2">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="text-foreground font-semibold">Premi MVP</span>
                </div>
                <span className="text-2xl font-bold text-yellow-500">
                  {stats.mvpCount}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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

        <PlayerPerformanceChart data={chartData} title="Il Mio Andamento" />
      </div>
    </div>
  );
};

export default PlayerDashboard;
