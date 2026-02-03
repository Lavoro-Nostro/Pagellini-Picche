import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { devLog } from '@/lib/devLog';
import { PLAYER_ROLE_MAP, ROLE_DISPLAY_NAMES, type PlayerRole } from '@/lib/playerRoles';

interface PlayerGrade {
  id: string;
  player_name: string;
  player_role: string | null;
  voto_generale: number | null;
  commento: string | null;
}

interface GradeSheet {
  id: string;
  sheet_date: string;
  note: string | null;
}

const LatestGradeSheet = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [grades, setGrades] = useState<PlayerGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLatestSheet();
  }, []);

  const fetchLatestSheet = async () => {
    try {
      const { data: sheetData, error: sheetError } = await supabase
        .from('grade_sheets')
        .select('id, sheet_date, note')
        .order('sheet_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sheetError) throw sheetError;

      if (!sheetData) {
        setIsLoading(false);
        return;
      }

      setSheet(sheetData);

      const { data: gradesData, error: gradesError } = await supabase
        .from('player_grades')
        .select('id, player_name, player_role, voto_generale, commento')
        .eq('grade_sheet_id', sheetData.id)
        .order('player_name');

      if (gradesError) throw gradesError;
      setGrades(gradesData || []);
    } catch (error) {
      devLog.error('Error fetching grade sheet:', error);
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

  if (!sheet) {
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
            <h1 className="text-2xl font-bold text-foreground">Ultimo Pagellino</h1>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            Nessun pagellino disponibile
          </div>
        </div>
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
          <h1 className="text-xl font-bold text-foreground">
            Pagellino del {format(new Date(sheet.sheet_date), 'd MMMM yyyy', { locale: it })}
          </h1>
        </div>

        {sheet.note && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Note:</p>
              <p className="text-foreground">{sheet.note}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {grades.map(grade => {
            const isCurrentPlayer = grade.player_name === profile?.name;
            const role = (grade.player_role as PlayerRole) || PLAYER_ROLE_MAP[grade.player_name];

            return (
              <Card 
                key={grade.id} 
                className={`bg-card border-border ${isCurrentPlayer ? 'ring-2 ring-primary' : ''}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className={`text-lg ${isCurrentPlayer ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {grade.player_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {role ? ROLE_DISPLAY_NAMES[role] : 'N/A'}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Voto Generale:</span>
                    <span className="text-primary font-bold text-lg">{grade.voto_generale ?? '-'}</span>
                  </div>
                  {grade.commento && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-1">Commento:</p>
                      <p className="text-foreground text-sm italic">{grade.commento}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LatestGradeSheet;
