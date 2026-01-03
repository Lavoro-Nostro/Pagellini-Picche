import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Edit, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { devLog } from '@/lib/devLog';
import { validateGradeSheet, validateCustomGrade } from '@/lib/validation';
import { PLAYER_ROLE_MAP, ROLE_CONFIGS, ROLE_DISPLAY_NAMES, type PlayerRole } from '@/lib/playerRoles';
import { downloadGradeSheetAsPng } from '@/lib/gradeSheetImage';

interface PlayerGrade {
  id: string;
  player_name: string;
  player_role: string | null;
  ricezione: number | null;
  attacco: number | null;
  difesa: number | null;
  battuta: number | null;
  attacchi: number | null;
  ricezione_difesa: number | null;
  appoggi_alzate: number | null;
  muri: number | null;
  alzate: number | null;
  voto_generale: number | null;
}

interface GradeSheet {
  id: string;
  sheet_date: string;
  note: string | null;
  sheet_type: string;
}

const GradeSheetDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [grades, setGrades] = useState<PlayerGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editGrades, setEditGrades] = useState<Record<string, Record<string, number | null>>>({});
  const [customGradePlayer, setCustomGradePlayer] = useState<string | null>(null);
  const [customGradeCategory, setCustomGradeCategory] = useState<string | null>(null);
  const [customGradeValue, setCustomGradeValue] = useState('');
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const gradeSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) fetchSheet();
  }, [id]);

  const fetchSheet = async () => {
    try {
      const { data: sheetData, error: sheetError } = await supabase
        .from('grade_sheets')
        .select('*')
        .eq('id', id)
        .single();

      if (sheetError) throw sheetError;
      setSheet(sheetData);
      setEditNote(sheetData.note || '');
      setEditDate(sheetData.sheet_date);

      const { data: gradesData, error: gradesError } = await supabase
        .from('player_grades')
        .select('*')
        .eq('grade_sheet_id', id)
        .order('player_name');

      if (gradesError) throw gradesError;
      setGrades(gradesData || []);

      // Initialize edit grades
      const initialEditGrades: Record<string, Record<string, number | null>> = {};
      (gradesData || []).forEach((g: PlayerGrade) => {
        initialEditGrades[g.player_name] = {
          ricezione: g.ricezione,
          attacco: g.attacco,
          difesa: g.difesa,
          battuta: g.battuta,
          attacchi: g.attacchi,
          ricezione_difesa: g.ricezione_difesa,
          appoggi_alzate: g.appoggi_alzate,
          muri: g.muri,
          alzate: g.alzate,
          voto_generale: g.voto_generale,
        };
      });
      setEditGrades(initialEditGrades);
    } catch (error) {
      devLog.error('Error fetching sheet:', error);
      toast.error('Errore nel caricamento');
    } finally {
      setIsLoading(false);
    }
  };

  const setGrade = (player: string, field: string, value: number | null) => {
    setEditGrades(prev => ({
      ...prev,
      [player]: { ...prev[player], [field]: value }
    }));
  };

  const handleSave = async () => {
    const validation = validateGradeSheet({ sheet_date: editDate, note: editNote || null });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Dati non validi');
      return;
    }

    setIsSaving(true);
    try {
      // Update grade sheet
      const { error: sheetError } = await supabase
        .from('grade_sheets')
        .update({
          sheet_date: editDate,
          note: editNote.trim() || null,
        })
        .eq('id', id);

      if (sheetError) throw sheetError;

      // Update player grades
      for (const grade of grades) {
        const playerGrade = editGrades[grade.player_name];
        if (!playerGrade) continue;

        const role = (grade.player_role as PlayerRole) || PLAYER_ROLE_MAP[grade.player_name];
        const isClassica = sheet?.sheet_type === 'classica';
        
        let votoGenerale = playerGrade.voto_generale;
        
        if (!isClassica && role) {
          const fields = ROLE_CONFIGS[role]?.fields || [];
          const validGrades = fields.map(f => playerGrade[f]).filter(v => v !== null) as number[];
          votoGenerale = validGrades.length > 0 
            ? Math.round((validGrades.reduce((a, b) => a + b, 0) / validGrades.length) * 100) / 100
            : null;
        }

        const { error: gradeError } = await supabase
          .from('player_grades')
          .update({
            ricezione: playerGrade.ricezione,
            attacco: playerGrade.attacco,
            difesa: playerGrade.difesa,
            battuta: playerGrade.battuta,
            attacchi: playerGrade.attacchi,
            ricezione_difesa: playerGrade.ricezione_difesa,
            appoggi_alzate: playerGrade.appoggi_alzate,
            muri: playerGrade.muri,
            alzate: playerGrade.alzate,
            voto_generale: votoGenerale,
          })
          .eq('id', grade.id);

        if (gradeError) throw gradeError;
      }

      toast.success('Pagellino aggiornato! Generazione immagine...');
      
      // Generate and download PNG
      setTimeout(async () => {
        const success = await downloadGradeSheetAsPng('grade-sheet-detail-content', `pagellino_${editDate}`);
        if (success) {
          toast.success('Immagine scaricata!');
        }
        await fetchSheet();
        setIsEditing(false);
      }, 500);

    } catch (error) {
      devLog.error('Error saving sheet:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await supabase.from('player_grades').delete().eq('grade_sheet_id', id);
      await supabase.from('grade_sheets').delete().eq('id', id);
      
      toast.success('Pagellino eliminato!');
      navigate('/moderator/history');
    } catch (error) {
      devLog.error('Error deleting sheet:', error);
      toast.error('Errore nella cancellazione');
    }
  };

  const getPlayerFields = (playerName: string): string[] => {
    const role = PLAYER_ROLE_MAP[playerName] as PlayerRole;
    if (!role) return [];
    return ROLE_CONFIGS[role]?.fields || [];
  };

  const getFieldLabel = (playerName: string, field: string): string => {
    const role = PLAYER_ROLE_MAP[playerName] as PlayerRole;
    if (!role) return field;
    return ROLE_CONFIGS[role]?.fieldLabels[field] || field;
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
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <p className="text-muted-foreground">Pagellino non trovato</p>
      </div>
    );
  }

  const isClassica = sheet.sheet_type === 'classica';

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6" id="grade-sheet-detail-content" ref={gradeSheetRef}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/moderator/history')}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground flex-1">
            Pagellino del {format(new Date(sheet.sheet_date), 'd MMMM yyyy', { locale: it })}
          </h1>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="gap-2 border-border text-foreground"
          >
            <Edit className="w-4 h-4" />
            {isEditing ? 'Annulla' : 'Modifica'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Elimina
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Sei sicuro?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Questa azione non può essere annullata. Il pagellino verrà eliminato permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border text-foreground">Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {isEditing && (
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Data</label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  min="2020-01-01"
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Note (max 500 caratteri)</label>
                <Textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  maxLength={500}
                  className="bg-muted border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">{editNote.length}/500</p>
              </div>
            </CardContent>
          </Card>
        )}

        {sheet.note && !isEditing && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Note:</p>
              <p className="text-foreground">{sheet.note}</p>
            </CardContent>
          </Card>
        )}

        <p className="text-sm text-muted-foreground">
          Tipo: {isClassica ? 'Classica' : 'Dettagliata'}
        </p>

        <div className="space-y-3">
          {grades.map(grade => {
            const playerFields = getPlayerFields(grade.player_name);
            const playerEditGrades = editGrades[grade.player_name] || {};

            return (
              <Card key={grade.id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground">{grade.player_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_DISPLAY_NAMES[PLAYER_ROLE_MAP[grade.player_name] as PlayerRole] || 'N/A'}
                  </p>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-3">
                      {isClassica ? (
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Voto Generale</label>
                          <div className="flex flex-wrap gap-1">
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                              <Button
                                key={num}
                                variant={playerEditGrades.voto_generale === num ? 'default' : 'outline'}
                                size="sm"
                                className={`w-8 h-8 p-0 text-xs ${
                                  playerEditGrades.voto_generale === num 
                                    ? 'gradient-primary text-primary-foreground' 
                                    : 'border-border text-foreground hover:bg-muted'
                                }`}
                                onClick={() => setGrade(grade.player_name, 'voto_generale', playerEditGrades.voto_generale === num ? null : num)}
                              >
                                {num}
                              </Button>
                            ))}
                            <Dialog open={customDialogOpen && customGradePlayer === grade.player_name && customGradeCategory === 'voto_generale'} onOpenChange={(open) => {
                              if (!open) {
                                setCustomDialogOpen(false);
                                setCustomGradeValue('');
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant={playerEditGrades.voto_generale && playerEditGrades.voto_generale > 20 ? 'default' : 'outline'}
                                  size="sm"
                                  className={`px-2 h-8 text-xs ${
                                    playerEditGrades.voto_generale && playerEditGrades.voto_generale > 20
                                      ? 'gradient-primary text-primary-foreground'
                                      : 'border-border text-foreground hover:bg-muted'
                                  }`}
                                  onClick={() => {
                                    setCustomGradePlayer(grade.player_name);
                                    setCustomGradeCategory('voto_generale');
                                    setCustomDialogOpen(true);
                                  }}
                                >
                                  {playerEditGrades.voto_generale && playerEditGrades.voto_generale > 20 
                                    ? playerEditGrades.voto_generale 
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
                        playerFields.map(field => (
                          <div key={field} className="space-y-2">
                            <label className="text-sm text-muted-foreground">
                              {getFieldLabel(grade.player_name, field)}
                            </label>
                            <div className="flex flex-wrap gap-1">
                              {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                <Button
                                  key={num}
                                  variant={playerEditGrades[field] === num ? 'default' : 'outline'}
                                  size="sm"
                                  className={`w-8 h-8 p-0 text-xs ${
                                    playerEditGrades[field] === num 
                                      ? 'gradient-primary text-primary-foreground' 
                                      : 'border-border text-foreground hover:bg-muted'
                                  }`}
                                  onClick={() => setGrade(grade.player_name, field, playerEditGrades[field] === num ? null : num)}
                                >
                                  {num}
                                </Button>
                              ))}
                              <Dialog open={customDialogOpen && customGradePlayer === grade.player_name && customGradeCategory === field} onOpenChange={(open) => {
                                if (!open) {
                                  setCustomDialogOpen(false);
                                  setCustomGradeValue('');
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant={playerEditGrades[field] && playerEditGrades[field]! > 20 ? 'default' : 'outline'}
                                    size="sm"
                                    className={`px-2 h-8 text-xs ${
                                      playerEditGrades[field] && playerEditGrades[field]! > 20
                                        ? 'gradient-primary text-primary-foreground'
                                        : 'border-border text-foreground hover:bg-muted'
                                    }`}
                                    onClick={() => {
                                      setCustomGradePlayer(grade.player_name);
                                      setCustomGradeCategory(field);
                                      setCustomDialogOpen(true);
                                    }}
                                  >
                                    {playerEditGrades[field] && playerEditGrades[field]! > 20 
                                      ? playerEditGrades[field] 
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
                    </div>
                  ) : (
                    <>
                      {isClassica ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">Voto Generale:</span>
                          <span className="text-primary font-bold text-lg">{grade.voto_generale?.toFixed(2) ?? '-'}</span>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            {playerFields.map(field => (
                              <div key={field} className="flex justify-between">
                                <span className="text-muted-foreground">{getFieldLabel(grade.player_name, field)}:</span>
                                <span className="text-foreground font-medium">
                                  {grade[field as keyof PlayerGrade] as number ?? '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-border flex justify-between">
                            <span className="text-muted-foreground font-medium">Voto Generale:</span>
                            <span className="text-primary font-bold text-lg">{grade.voto_generale?.toFixed(2) ?? '-'}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {isEditing && (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-14 gradient-primary text-primary-foreground font-semibold text-lg gap-3"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default GradeSheetDetail;
