import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { devLog } from '@/lib/devLog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

interface SheetAverage {
  date: string;
  displayDate: string;
  average: number;
}

const TeamPerformance = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<SheetAverage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAverage, setCurrentAverage] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get all grade sheets ordered by date
      const { data: sheets, error: sheetsError } = await supabase
        .from('grade_sheets')
        .select('id, sheet_date')
        .order('sheet_date', { ascending: true });

      if (sheetsError) throw sheetsError;

      if (!sheets || sheets.length === 0) {
        setIsLoading(false);
        return;
      }

      // Get all player grades
      const { data: grades, error: gradesError } = await supabase
        .from('player_grades')
        .select('grade_sheet_id, voto_generale');

      if (gradesError) throw gradesError;

      // Calculate average for each sheet
      const sheetAverages: SheetAverage[] = sheets.map(sheet => {
        const sheetGrades = grades?.filter(g => g.grade_sheet_id === sheet.id) || [];
        const validGrades = sheetGrades
          .map(g => g.voto_generale)
          .filter((v): v is number => v !== null);
        
        const average = validGrades.length > 0
          ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length
          : 0;

        return {
          date: sheet.sheet_date,
          displayDate: format(new Date(sheet.sheet_date), 'd MMM', { locale: it }),
          average: Math.round(average * 100) / 100,
        };
      });

      setData(sheetAverages);
      
      if (sheetAverages.length > 0) {
        setCurrentAverage(sheetAverages[sheetAverages.length - 1].average);
      }
    } catch (error) {
      devLog.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    average: {
      label: 'Media Squadra',
      color: 'hsl(var(--primary))',
    },
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
          <h1 className="text-2xl font-bold text-foreground">Andamento Squadra</h1>
        </div>

        {currentAverage !== null && (
          <Card className="bg-card border-primary/50 border-2">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-semibold">Media Attuale</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {currentAverage.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nessun dato disponibile
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">Media Generale nel Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 6, 8, 10]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {data.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">Dettaglio per Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...data].reverse().map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">
                      {format(new Date(item.date), 'd MMMM yyyy', { locale: it })}
                    </span>
                    <span className="text-primary font-semibold">{item.average.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamPerformance;
