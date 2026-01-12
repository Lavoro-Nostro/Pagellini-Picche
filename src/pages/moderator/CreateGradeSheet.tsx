import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save } from 'lucide-react';
import { format } from 'date-fns';
import { devLog } from '@/lib/devLog';
import { validateCustomGrade, validateGradeSheet } from '@/lib/validation';
import { 
  ALL_PLAYERS, 
  PLAYER_ROLE_MAP, 
  ROLE_CONFIGS, 
  ROLE_DISPLAY_NAMES,
  getPlayersByRole,
  type PlayerRole 
} from '@/lib/playerRoles';
import { downloadGradeSheetAsPng } from '@/lib/gradeSheetImage';

type SheetType = 'classica' | 'dettagliata';

interface PlayerGrade {
  [key: string]: number | null;
}

interface PlayerComments {
  [key: string]: string;
}

const CreateGradeSheet = () => {
  const navigate = useNavigate();
  const [sheetType, setSheetType] = useState<SheetType | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [grades, setGrades] = useState<Record<string, PlayerGrade>>(() => {
    const initial: Record<string, PlayerGrade> = {};
    ALL_PLAYERS.forEach(player => {
      const role = PLAYER_ROLE_MAP[player];
      const fields = ROLE_CONFIGS[role].fields;
      initial[player] = {};
      fields.forEach(field => {
        initial[player][field] = null;
      });
      initial[player].voto_generale = null;
    });
    return initial;
  });
  const [comments, setComments] = useState<PlayerComments>(() => {
    const initial: PlayerComments = {};
    ALL_PLAYERS.forEach(player => {
      initial[player] = '';
    });
    return initial;
  });
  const [customGradePlayer, setCustomGradePlayer] = useState<string | null>(null);
  const [customGradeCategory, setCustomGradeCategory] = useState<string | null>(null);
  const [customGradeValue, setCustomGradeValue] = useState('');
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const gradeSheetRef = useRef<HTMLDivElement>(null);

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

  const handleSave = async () => {
    const validation = validateGradeSheet({ sheet_date: date, note: note || null });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Dati non validi');
      return;
    }

    // Check if any player has a comment but no grade
    for (const player of ALL_PLAYERS) {
      const playerComment = comments[player]?.trim();
      const playerGrade = grades[player];
      const role = PLAYER_ROLE_MAP[player];
      
      if (playerComment) {
        if (sheetType === 'classica') {
          if (playerGrade.voto_generale === null) {
            toast.error(`${player} ha un commento ma nessun voto`);
            return;
          }
        } else {
          const fields = ROLE_CONFIGS[role].fields;
          const hasAnyGrade = fields.some(f => playerGrade[f] !== null);
          if (!hasAnyGrade) {
            toast.error(`${player} ha un commento ma nessun voto`);
            return;
          }
        }
      }
    }

    if (sheetType === 'dettagliata') {
      for (const player of ALL_PLAYERS) {
        const playerGrade = grades[player];
        const role = PLAYER_ROLE_MAP[player];
        const fields = ROLE_CONFIGS[role].fields;
        const filledGrades = fields.filter(f => playerGrade[f] !== null).length;
        
        if (filledGrades > 0 && filledGrades < fields.length) {
          toast.error(`A ${player} mancano voti`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const { data: sheetData, error: sheetError } = await supabase
        .from('grade_sheets')
        .insert({
          sheet_date: date,
          note: note.trim() || null,
          sheet_type: sheetType,
        })
        .select()
        .single();

      if (sheetError) throw sheetError;

      const playerGrades = ALL_PLAYERS.map(player => {
        const playerGrade = grades[player];
        const role = PLAYER_ROLE_MAP[player];
        const fields = ROLE_CONFIGS[role].fields;
        const playerComment = comments[player]?.trim() || null;
        
        if (sheetType === 'classica') {
          if (playerGrade.voto_generale === null) return null;
          
          return {
            grade_sheet_id: sheetData.id,
            player_name: player,
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
          const hasGrades = fields.some(f => playerGrade[f] !== null);
          if (!hasGrades) return null;

          const validGrades = fields.map(f => playerGrade[f]).filter(v => v !== null) as number[];
          const votoGenerale = validGrades.length > 0 
            ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length 
            : null;

          return {
            grade_sheet_id: sheetData.id,
            player_name: player,
            player_role: role,
            voto_generale: votoGenerale ? Math.round(votoGenerale * 100) / 100 : null,
            ricezione: playerGrade.ricezione ?? null,
            attacco: playerGrade.attacco ?? null,
            difesa: playerGrade.difesa ?? null,
            battuta: playerGrade.battuta ?? null,
            attacchi: playerGrade.attacchi ?? null,
            ricezione_difesa: playerGrade.ricezione_difesa ?? null,
            appoggi_alzate: playerGrade.appoggi_alzate ?? null,
            muri: playerGrade.muri ?? null,
            alzate: playerGrade.alzate ?? null,
            commento: playerComment,
          };
        }
      }).filter(Boolean);

      if (playerGrades.length > 0) {
        const { error: gradesError } = await supabase
          .from('player_grades')
          .insert(playerGrades);

        if (gradesError) throw gradesError;
      }

      toast.success('Pagellino salvato! Generazione immagine...');
      
      // Prepare grades data for image generation
      const gradesForImage = playerGrades.map(pg => ({
        player_name: pg.player_name,
        voto_generale: pg.voto_generale,
        commento: pg.commento,
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

  const playersByRole = getPlayersByRole();

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

          <div className="space-y-4">
            <Card 
              className="bg-card border-border cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSheetType('classica')}
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
              className="bg-card border-border cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSheetType('dettagliata')}
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
        {ALL_PLAYERS.map(player => (
          <Card key={player} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground">
                {player} <span className="text-muted-foreground font-normal">({ROLE_DISPLAY_NAMES[PLAYER_ROLE_MAP[player]]})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comment field */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Commento (opzionale)</label>
                <Textarea
                  value={comments[player]}
                  onChange={(e) => setComments(prev => ({ ...prev, [player]: e.target.value }))}
                  placeholder="Aggiungi un commento per questo giocatore..."
                  maxLength={300}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[60px]"
                />
                <p className="text-xs text-muted-foreground">{comments[player].length}/300</p>
              </div>
              
              {sheetType === 'classica' ? (
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Voto Generale</label>
                      <div className="flex flex-wrap gap-1">
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                          <Button
                            key={num}
                            variant={grades[player].voto_generale === num ? 'default' : 'outline'}
                            size="sm"
                            className={`w-8 h-8 p-0 text-xs ${
                              grades[player].voto_generale === num 
                                ? 'gradient-primary text-primary-foreground' 
                                : 'border-border text-foreground hover:bg-muted'
                            }`}
                            onClick={() => setGrade(player, 'voto_generale', grades[player].voto_generale === num ? null : num)}
                          >
                            {num}
                          </Button>
                        ))}
                        <Dialog open={customDialogOpen && customGradePlayer === player && customGradeCategory === 'voto_generale'} onOpenChange={(open) => {
                          if (!open) {
                            setCustomDialogOpen(false);
                            setCustomGradeValue('');
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant={grades[player].voto_generale && grades[player].voto_generale! > 20 ? 'default' : 'outline'}
                              size="sm"
                              className={`px-2 h-8 text-xs ${
                                grades[player].voto_generale && grades[player].voto_generale! > 20
                                  ? 'gradient-primary text-primary-foreground'
                                  : 'border-border text-foreground hover:bg-muted'
                              }`}
                              onClick={() => {
                                setCustomGradePlayer(player);
                                setCustomGradeCategory('voto_generale');
                                setCustomDialogOpen(true);
                              }}
                            >
                              {grades[player].voto_generale && grades[player].voto_generale! > 20 
                                ? grades[player].voto_generale 
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
                    ROLE_CONFIGS[PLAYER_ROLE_MAP[player]].fields.map(field => (
                      <div key={field} className="space-y-2">
                        <label className="text-sm text-muted-foreground">
                          {ROLE_CONFIGS[PLAYER_ROLE_MAP[player]].fieldLabels[field]}
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                            <Button
                              key={num}
                              variant={grades[player][field] === num ? 'default' : 'outline'}
                              size="sm"
                              className={`w-8 h-8 p-0 text-xs ${
                                grades[player][field] === num 
                                  ? 'gradient-primary text-primary-foreground' 
                                  : 'border-border text-foreground hover:bg-muted'
                              }`}
                              onClick={() => setGrade(player, field, grades[player][field] === num ? null : num)}
                            >
                              {num}
                            </Button>
                          ))}
                          <Dialog open={customDialogOpen && customGradePlayer === player && customGradeCategory === field} onOpenChange={(open) => {
                            if (!open) {
                              setCustomDialogOpen(false);
                              setCustomGradeValue('');
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant={grades[player][field] && grades[player][field]! > 20 ? 'default' : 'outline'}
                                size="sm"
                                className={`px-2 h-8 text-xs ${
                                  grades[player][field] && grades[player][field]! > 20
                                    ? 'gradient-primary text-primary-foreground'
                                    : 'border-border text-foreground hover:bg-muted'
                                }`}
                                onClick={() => {
                                  setCustomGradePlayer(player);
                                  setCustomGradeCategory(field);
                                  setCustomDialogOpen(true);
                                }}
                              >
                                {grades[player][field] && grades[player][field]! > 20 
                                  ? grades[player][field] 
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
            ))}

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
