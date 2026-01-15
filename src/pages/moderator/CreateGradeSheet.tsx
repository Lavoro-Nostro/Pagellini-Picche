import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { devLog } from '@/lib/devLog';
import { validateCustomGrade, validateGradeSheet } from '@/lib/validation';
import { 
  ROLE_CONFIGS, 
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

type SheetType = 'classica' | 'dettagliata';

interface PlayerGrade {
  [key: string]: number | null;
}

interface PlayerComments {
  [key: string]: string;
}

const DEFAULT_ROLE: PlayerRole = 'martello';

const CreateGradeSheet = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { teamId } = useModeratorTeam();
  const [sheetType, setSheetType] = useState<SheetType | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [grades, setGrades] = useState<Record<string, PlayerGrade>>({});
  const [comments, setComments] = useState<PlayerComments>({});
  const [customGradePlayer, setCustomGradePlayer] = useState<string | null>(null);
  const [customGradeCategory, setCustomGradeCategory] = useState<string | null>(null);
  const [customGradeValue, setCustomGradeValue] = useState('');
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
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
            const role = player.role;
            const fields = ROLE_CONFIGS[role]?.fields || [];
            initialGrades[player.name] = {};
            fields.forEach(field => {
              initialGrades[player.name][field] = null;
            });
            initialGrades[player.name].voto_generale = null;
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

  const setGrade = (player: string, category: string, value: number | null) => {
    setGrades(prev => ({
      ...prev,
      [player]: { ...prev[player], [category]: value }
    }));
  };

  const handleCustomGrade = () => {
    if (!customGradePlayer || !customGradeCategory || !customGradeValue) return;
    
    const result = validateCustomGrade(customGradeValue);
    if (result.valid && result.value !== undefined) {
      setGrade(customGradePlayer, customGradeCategory, result.value);
      setCustomGradeValue('');
      setCustomGradePlayer(null);
      setCustomGradeCategory(null);
    } else {
      toast.error(result.error || 'Voto non valido');
    }
  };

  const getPlayerRole = (playerName: string): PlayerRole => {
    const player = players.find(p => p.name === playerName);
    return player?.role || DEFAULT_ROLE;
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
      const role = player.role;
      
      if (playerComment) {
        if (sheetType === 'classica') {
          if (playerGrade?.voto_generale === null || playerGrade?.voto_generale === undefined) {
            toast.error(`${player.name} ha un commento ma nessun voto`);
            return;
          }
        } else {
          const fields = ROLE_CONFIGS[role]?.fields || [];
          const hasAnyGrade = fields.some(f => playerGrade?.[f] !== null && playerGrade?.[f] !== undefined);
          if (!hasAnyGrade) {
            toast.error(`${player.name} ha un commento ma nessun voto`);
            return;
          }
        }
      }
    }

    if (sheetType === 'dettagliata') {
      for (const player of players) {
        const playerGrade = grades[player.name];
        const role = player.role;
        const fields = ROLE_CONFIGS[role]?.fields || [];
        const filledGrades = fields.filter(f => playerGrade?.[f] !== null && playerGrade?.[f] !== undefined).length;
        
        if (filledGrades > 0 && filledGrades < fields.length) {
          toast.error(`A ${player.name} mancano voti`);
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
          sheet_type: sheetType,
          team_id: teamId,
        })
        .select()
        .single();

      if (sheetError) throw sheetError;

      const playerGradesData = players.map(player => {
        const playerGrade = grades[player.name];
        const role = player.role;
        const fields = ROLE_CONFIGS[role]?.fields || [];
        const playerComment = comments[player.name]?.trim() || null;
        
        if (sheetType === 'classica') {
          if (playerGrade?.voto_generale === null || playerGrade?.voto_generale === undefined) return null;
          
          return {
            grade_sheet_id: sheetData.id,
            player_name: player.name,
            player_role: role,
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
        } else {
          const hasGrades = fields.some(f => playerGrade?.[f] !== null && playerGrade?.[f] !== undefined);
          if (!hasGrades) return null;

          const validGrades = fields.map(f => playerGrade?.[f]).filter(v => v !== null && v !== undefined) as number[];
          const votoGenerale = validGrades.length > 0 
            ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length 
            : null;

          return {
            grade_sheet_id: sheetData.id,
            player_name: player.name,
            player_role: role,
            voto_generale: votoGenerale ? Math.round(votoGenerale * 100) / 100 : null,
            ricezione: playerGrade?.ricezione ?? null,
            attacco: playerGrade?.attacco ?? null,
            difesa: playerGrade?.difesa ?? null,
            battuta: playerGrade?.battuta ?? null,
            attacchi: playerGrade?.attacchi ?? null,
            ricezione_difesa: playerGrade?.ricezione_difesa ?? null,
            appoggi_alzate: playerGrade?.appoggi_alzate ?? null,
            muri: playerGrade?.muri ?? null,
            alzate: playerGrade?.alzate ?? null,
            commento: playerComment,
          };
        }
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
            sheetType: sheetType!,
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

  // Sheet type selection
  if (!sheetType) {
    return (
      <div className="min-h-screen gradient-dark p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/moderator')}
              className="text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Tipo Pagellino</h1>
          </div>

          <p className="text-muted-foreground">Scegli il tipo di pagellino da creare:</p>

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
            <Card 
              className={`bg-card border-border cursor-pointer hover:border-primary transition-colors ${players.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => players.length > 0 && setSheetType('classica')}
            >
              <CardHeader>
                <CardTitle className="text-foreground">Classica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Un voto generale per ogni giocatore. Veloce e semplice.
                </p>
              </CardContent>
            </Card>

            <Card 
              className={`bg-card border-border cursor-pointer hover:border-primary transition-colors ${players.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => players.length > 0 && setSheetType('dettagliata')}
            >
              <CardHeader>
                <CardTitle className="text-foreground">Dettagliata</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Voti per ogni campo specifico del ruolo. Più dettagliata.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
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
            onClick={() => setSheetType(null)}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            Crea Pagellino ({sheetType === 'classica' ? 'Classica' : 'Dettagliata'})
          </h1>
        </div>

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
                
                {sheetType === 'classica' ? (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Voto Generale</label>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                        <Button
                          key={num}
                          variant={grades[player.name]?.voto_generale === num ? 'default' : 'outline'}
                          size="sm"
                          className={`w-8 h-8 p-0 text-xs ${
                            grades[player.name]?.voto_generale === num 
                              ? 'gradient-primary text-primary-foreground' 
                              : 'border-border text-foreground hover:bg-muted'
                          }`}
                          onClick={() => setGrade(player.name, 'voto_generale', grades[player.name]?.voto_generale === num ? null : num)}
                        >
                          {num}
                        </Button>
                      ))}
                      <Dialog open={customDialogOpen && customGradePlayer === player.name && customGradeCategory === 'voto_generale'} onOpenChange={(open) => {
                        if (!open) {
                          setCustomDialogOpen(false);
                          setCustomGradeValue('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant={grades[player.name]?.voto_generale && grades[player.name]?.voto_generale! > 20 ? 'default' : 'outline'}
                            size="sm"
                            className={`px-2 h-8 text-xs ${
                              grades[player.name]?.voto_generale && grades[player.name]?.voto_generale! > 20
                                ? 'gradient-primary text-primary-foreground'
                                : 'border-border text-foreground hover:bg-muted'
                            }`}
                            onClick={() => {
                              setCustomGradePlayer(player.name);
                              setCustomGradeCategory('voto_generale');
                              setCustomDialogOpen(true);
                            }}
                          >
                            {grades[player.name]?.voto_generale && grades[player.name]?.voto_generale! > 20 
                              ? grades[player.name]?.voto_generale 
                              : '20+'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">Voto personalizzato</DialogTitle>
                            <DialogDescription className="sr-only">Inserisci un voto personalizzato</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="Inserisci voto"
                              value={customGradeValue}
                              onChange={(e) => setCustomGradeValue(e.target.value)}
                              className="bg-muted border-border text-foreground"
                            />
                            <Button
                              onClick={() => {
                                if (customGradePlayer && customGradeCategory && customGradeValue) {
                                  const result = validateCustomGrade(customGradeValue);
                                  if (result.valid && result.value !== undefined) {
                                    setGrade(customGradePlayer, customGradeCategory, result.value);
                                    setCustomGradeValue('');
                                    setCustomDialogOpen(false);
                                  } else {
                                    toast.error(result.error || 'Voto non valido');
                                  }
                                }
                              }}
                              className="w-full gradient-primary text-primary-foreground"
                            >
                              Conferma
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ) : (
                  (ROLE_CONFIGS[role]?.fields || []).map(field => (
                    <div key={field} className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        {ROLE_CONFIGS[role]?.fieldLabels?.[field] || field}
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                          <Button
                            key={num}
                            variant={grades[player.name]?.[field] === num ? 'default' : 'outline'}
                            size="sm"
                            className={`w-8 h-8 p-0 text-xs ${
                              grades[player.name]?.[field] === num 
                                ? 'gradient-primary text-primary-foreground' 
                                : 'border-border text-foreground hover:bg-muted'
                            }`}
                            onClick={() => setGrade(player.name, field, grades[player.name]?.[field] === num ? null : num)}
                          >
                            {num}
                          </Button>
                        ))}
                        <Dialog open={customDialogOpen && customGradePlayer === player.name && customGradeCategory === field} onOpenChange={(open) => {
                          if (!open) {
                            setCustomDialogOpen(false);
                            setCustomGradeValue('');
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant={grades[player.name]?.[field] && grades[player.name]?.[field]! > 20 ? 'default' : 'outline'}
                              size="sm"
                              className={`px-2 h-8 text-xs ${
                                grades[player.name]?.[field] && grades[player.name]?.[field]! > 20
                                  ? 'gradient-primary text-primary-foreground'
                                  : 'border-border text-foreground hover:bg-muted'
                              }`}
                              onClick={() => {
                                setCustomGradePlayer(player.name);
                                setCustomGradeCategory(field);
                                setCustomDialogOpen(true);
                              }}
                            >
                              {grades[player.name]?.[field] && grades[player.name]?.[field]! > 20 
                                ? grades[player.name]?.[field] 
                                : '20+'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border">
                            <DialogHeader>
                              <DialogTitle className="text-foreground">Voto personalizzato</DialogTitle>
                              <DialogDescription className="sr-only">Inserisci un voto personalizzato</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="Inserisci voto"
                                value={customGradeValue}
                                onChange={(e) => setCustomGradeValue(e.target.value)}
                                className="bg-muted border-border text-foreground"
                              />
                              <Button
                                onClick={() => {
                                  if (customGradePlayer && customGradeCategory && customGradeValue) {
                                    const result = validateCustomGrade(customGradeValue);
                                    if (result.valid && result.value !== undefined) {
                                      setGrade(customGradePlayer, customGradeCategory, result.value);
                                      setCustomGradeValue('');
                                      setCustomDialogOpen(false);
                                    } else {
                                      toast.error(result.error || 'Voto non valido');
                                    }
                                  }
                                }}
                                className="w-full gradient-primary text-primary-foreground"
                              >
                                Conferma
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-14 gradient-primary text-primary-foreground font-semibold text-lg gap-3"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Salvataggio...' : 'Salva Pagellino'}
        </Button>
      </div>
    </div>
  );
};

export default CreateGradeSheet;
