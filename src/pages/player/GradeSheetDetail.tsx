import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Dumbbell, Swords, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { devLog } from '@/lib/devLog';
import { PLAYER_ROLE_MAP, ROLE_DISPLAY_NAMES, type PlayerRole } from '@/lib/playerRoles';
import MvpVoting from '@/components/MvpVoting';
import { useQuery } from '@tanstack/react-query';

interface PlayerGrade {
  id: string;
  player_id: string | null;
  player_name: string;
  player_role: string | null;
  voto_generale: number | null;
  commento: string | null;
}

interface SetScore {
  home: number;
  away: number;
}

interface GradeSheet {
  id: string;
  sheet_date: string;
  note: string | null;
  sheet_category: string;
  gym_location: string | null;
  match_result: string | null;
  set_scores: SetScore[] | null;
}

const GradeSheetDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile } = useAuth();
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [grades, setGrades] = useState<PlayerGrade[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['player-grade-sheet-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing grade sheet id');
      const { data: sheetData, error: sheetError } = await supabase
        .from('grade_sheets')
        .select('id, sheet_date, note, sheet_category, gym_location, match_result, set_scores')
        .eq('id', id)
        .single();

      if (sheetError) throw sheetError;

      const parsedSheet = {
        ...sheetData,
        set_scores: typeof sheetData.set_scores === 'string'
          ? JSON.parse(sheetData.set_scores)
          : sheetData.set_scores,
      } as GradeSheet;

      const { data: gradesData, error: gradesError } = await supabase
        .from('player_grades')
        .select('id, player_id, player_name, player_role, voto_generale, commento')
        .eq('grade_sheet_id', id)
        .order('player_name');

      if (gradesError) throw gradesError;

      return { sheet: parsedSheet, grades: (gradesData || []) as PlayerGrade[] };
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!data) return;
    setSheet(data.sheet);
    setGrades(data.grades);
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-foreground font-semibold">Errore nel caricamento</p>
          <p className="text-sm text-muted-foreground">
            {(error as Error).message || 'Errore sconosciuto'}
          </p>
        </div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <p className="text-muted-foreground">Pagellino non trovato</p>
      </div>
    );
  }

  const isMatch = sheet.sheet_category === 'partita';

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/player/history')}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isMatch ? (
                <Swords className="w-5 h-5 text-primary" />
              ) : (
                <Dumbbell className="w-5 h-5 text-secondary" />
              )}
              <h1 className="text-xl font-bold text-foreground">
                {isMatch ? 'Partita' : 'Allenamento'} del {format(new Date(sheet.sheet_date), 'd MMMM yyyy', { locale: it })}
              </h1>
            </div>
          </div>
        </div>

        {/* Match/Training Info Card */}
        {(sheet.gym_location || sheet.match_result || sheet.set_scores) && (
          <Card className="bg-card border-primary/30">
            <CardContent className="p-4 space-y-3">
              {sheet.gym_location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{sheet.gym_location}</span>
                </div>
              )}
              {sheet.match_result && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Risultato Finale</p>
                  <p className="text-3xl font-bold text-primary">{sheet.match_result}</p>
                </div>
              )}
              {sheet.set_scores && sheet.set_scores.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Parziali</p>
                  <div className="flex flex-wrap gap-2">
                    {sheet.set_scores.map((set, index) => (
                      <Badge key={index} variant="outline" className="text-foreground">
                        Set {index + 1}: {set.home}-{set.away}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* MVP Voting Section - Only for matches */}
        {isMatch && (
          <MvpVoting gradeSheetId={sheet.id} grades={grades} />
        )}

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
            const isCurrentPlayer = grade.player_id ? grade.player_id === profile?.id : grade.player_name === profile?.name;
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

export default GradeSheetDetail;
