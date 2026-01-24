import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { devLog } from '@/lib/devLog';
import { validateGradeSheet } from '@/lib/validation';
import { 
  ROLE_DISPLAY_NAMES,
  type PlayerRole 
} from '@/lib/playerRoles';
import { downloadGradeSheetAsPng } from '@/lib/gradeSheetImage';
import { useModeratorTeam } from '@/hooks/useModeratorTeam';
import { useAuth } from '@/contexts/AuthContext';

interface TeamPlayer {
  id: string;
  name: string;
  role: PlayerRole;
}

interface PlayerGrade {
  voto_generale: number | null;
}

interface PlayerComments {
  [key: string]: string;
}

const DEFAULT_ROLE: PlayerRole = 'martello';

const CreateGradeSheet = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { teamId } = useModeratorTeam();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [grades, setGrades] = useState<Record<string, PlayerGrade>>({});
  const [comments, setComments] = useState<PlayerComments>({});
  const [isSaving, setIsSaving] = useState(false);
  const gradeSheetRef = useRef<HTMLDivElement>(null);

  // Fetch players from database
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!session?.user?.id) return;

      try {
        // Get moderator's team
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id')
          .eq('moderator_id', session.user.id)
          .single();

        if (teamError) {
          devLog.error('Error fetching team:', teamError);
          setIsLoadingPlayers(false);
          return;
        }

        // Get all profiles in this team (excluding the moderator themselves)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, player_role')
          .eq('team_id', teamData.id)
          .neq('id', session.user.id)
          .order('name');

        if (profilesError) {
          devLog.error('Error fetching players:', profilesError);
          setPlayers([]);
        } else {
          const teamPlayers: TeamPlayer[] = (profilesData || []).map(p => ({
            id: p.id,
            name: p.name,
            role: (p.player_role as PlayerRole) || DEFAULT_ROLE
          }));
          setPlayers(teamPlayers);

          // Initialize grades and comments for these players
          const initialGrades: Record<string, PlayerGrade> = {};
          const initialComments: PlayerComments = {};
          
          teamPlayers.forEach(player => {
            initialGrades[player.name] = { voto_generale: null };
            initialComments[player.name] = '';
          });
          
          setGrades(initialGrades);
          setComments(initialComments);
        }
      } catch (error) {
        devLog.error('Error:', error);
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    fetchPlayers();
  }, [session]);

  const setGrade = (player: string, value: number | null) => {
    setGrades(prev => ({
      ...prev,
      [player]: { voto_generale: value }
    }));
  };

  const handleSave = async () => {
    const validation = validateGradeSheet({ sheet_date: date, note: note || null });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Dati non validi');
      return;
    }

    // Check if any player has a comment but no grade
    for (const player of players) {
      const playerComment = comments[player.name]?.trim();
      const playerGrade = grades[player.name];
      
      if (playerComment) {
        if (playerGrade?.voto_generale === null || playerGrade?.voto_generale === undefined) {
          toast.error(`${player.name} ha un commento ma nessun voto`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      if (!teamId) {
        toast.error('Team non trovato');
        setIsSaving(false);
        return;
      }

      const { data: sheetData, error: sheetError } = await supabase
        .from('grade_sheets')
        .insert({
          sheet_date: date,
          note: note.trim() || null,
          sheet_type: 'classica',
          team_id: teamId,
        })
        .select()
        .single();

      if (sheetError) throw sheetError;

      const playerGradesData = players.map(player => {
        const playerGrade = grades[player.name];
        const playerComment = comments[player.name]?.trim() || null;
        
        if (playerGrade?.voto_generale === null || playerGrade?.voto_generale === undefined) return null;
        
        return {
          grade_sheet_id: sheetData.id,
          player_name: player.name,
          player_role: player.role,
          voto_generale: playerGrade.voto_generale as number,
          ricezione: null,
          attacco: null,
          difesa: null,
          battuta: null,
          attacchi: null,
          ricezione_difesa: null,
          appoggi_alzate: null,
          muri: null,
          alzate: null,
          commento: playerComment,
        };
      }).filter(Boolean);

      if (playerGradesData.length > 0) {
        const { error: gradesError } = await supabase
          .from('player_grades')
          .insert(playerGradesData);

        if (gradesError) throw gradesError;
      }

      toast.success('Pagellino salvato! Generazione immagine...');
      
      // Prepare grades data for image generation
      const gradesForImage = playerGradesData.map(pg => ({
        player_name: pg!.player_name,
        voto_generale: pg!.voto_generale,
        commento: pg!.commento,
      }));
      
      // Generate and download PNG
      setTimeout(async () => {
        const success = await downloadGradeSheetAsPng(
          {
            date,
            sheetType: 'classica',
            grades: gradesForImage,
            note: note.trim() || null,
          },
          `pagellino_${date}`
        );
        if (success) {
          toast.success('Immagine scaricata!');
        }
        navigate('/moderator');
      }, 500);
      
    } catch (error) {
      devLog.error('Error saving grade sheet:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoadingPlayers) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6" id="grade-sheet-content" ref={gradeSheetRef}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/moderator')}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Crea Pagellino</h1>
        </div>

        {players.length === 0 && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="pt-4">
              <p className="text-destructive">
                Nessun giocatore nella squadra. Aggiungi giocatori prima di creare un pagellino.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Data</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min="2020-01-01"
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Note (opzionale, max 500 caratteri)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Aggiungi una nota..."
              maxLength={500}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">{note.length}/500</p>
          </div>
        </div>

        {/* Players in alphabetical order */}
        {players.map(player => {
          const role = player.role;
          return (
            <Card key={player.id} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground">
                  {player.name} <span className="text-muted-foreground font-normal">({ROLE_DISPLAY_NAMES[role] || role})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Comment field */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Commento (opzionale)</label>
                  <Textarea
                    value={comments[player.name] || ''}
                    onChange={(e) => setComments(prev => ({ ...prev, [player.name]: e.target.value }))}
                    placeholder="Aggiungi un commento per questo giocatore..."
                    maxLength={300}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[60px]"
                  />
                  <p className="text-xs text-muted-foreground">{(comments[player.name] || '').length}/300</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Voto Generale (1-10)</label>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                      <Button
                        key={num}
                        variant={grades[player.name]?.voto_generale === num ? 'default' : 'outline'}
                        size="sm"
                        className={`w-10 h-10 p-0 text-sm ${
                          grades[player.name]?.voto_generale === num 
                            ? 'gradient-primary text-primary-foreground' 
                            : 'border-border text-foreground hover:bg-muted'
                        }`}
                        onClick={() => setGrade(player.name, grades[player.name]?.voto_generale === num ? null : num)}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Button
          onClick={handleSave}
          disabled={isSaving || players.length === 0}
          className="w-full h-14 gradient-primary text-primary-foreground font-semibold text-lg gap-3"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salva Pagellino
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateGradeSheet;
