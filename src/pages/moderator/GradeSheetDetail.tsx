import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Edit, Trash2, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { devLog } from '@/lib/devLog';
import { validateGradeSheet } from '@/lib/validation';
import { PLAYER_ROLE_MAP, ROLE_DISPLAY_NAMES, type PlayerRole } from '@/lib/playerRoles';
import { downloadGradeSheetAsPng } from '@/lib/gradeSheetImage';

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

const GradeSheetDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [grades, setGrades] = useState<PlayerGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editGrades, setEditGrades] = useState<Record<string, number | null>>({});
  const [editComments, setEditComments] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const gradeSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) fetchSheet();
  }, [id]);

  const fetchSheet = async () => {
    try {
      const { data: sheetData, error: sheetError } = await supabase
        .from('grade_sheets')
        .select('id, sheet_date, note')
        .eq('id', id)
        .single();

      if (sheetError) throw sheetError;
      setSheet(sheetData);
      setEditNote(sheetData.note || '');
      setEditDate(sheetData.sheet_date);

      const { data: gradesData, error: gradesError } = await supabase
        .from('player_grades')
        .select('id, player_name, player_role, voto_generale, commento')
        .eq('grade_sheet_id', id)
        .order('player_name');

      if (gradesError) throw gradesError;
      setGrades(gradesData || []);

      // Initialize edit grades and comments
      const initialEditGrades: Record<string, number | null> = {};
      const initialEditComments: Record<string, string> = {};
      (gradesData || []).forEach((g: PlayerGrade) => {
        initialEditGrades[g.player_name] = g.voto_generale;
        initialEditComments[g.player_name] = g.commento || '';
      });
      setEditGrades(initialEditGrades);
      setEditComments(initialEditComments);
    } catch (error) {
      devLog.error('Error fetching sheet:', error);
      toast.error('Errore nel caricamento');
    } finally {
      setIsLoading(false);
    }
  };

  const setGrade = (player: string, value: number | null) => {
    setEditGrades(prev => ({ ...prev, [player]: value }));
  };

  const handleSave = async () => {
    const validation = validateGradeSheet({ sheet_date: editDate, note: editNote || null });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || 'Dati non validi');
      return;
    }

    // Check if any player has a comment but no grade
    for (const grade of grades) {
      const playerComment = editComments[grade.player_name]?.trim();
      const playerGradeValue = editGrades[grade.player_name];
      
      if (playerComment && playerGradeValue === null) {
        toast.error(`${grade.player_name} ha un commento ma nessun voto`);
        return;
      }
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
        const votoGenerale = editGrades[grade.player_name];
        const playerComment = editComments[grade.player_name]?.trim() || null;
        
        const { error: gradeError } = await supabase
          .from('player_grades')
          .update({
            voto_generale: votoGenerale,
            commento: playerComment,
          })
          .eq('id', grade.id);

        if (gradeError) throw gradeError;
      }

      toast.success('Pagellino aggiornato! Generazione immagine...');
      
      // Prepare grades data for image generation
      const gradesForImage = grades.map(g => ({
        player_name: g.player_name,
        voto_generale: editGrades[g.player_name] ?? g.voto_generale,
        commento: editComments[g.player_name]?.trim() || null,
      }));
      
      // Generate and download PNG
      setTimeout(async () => {
        const success = await downloadGradeSheetAsPng(
          {
            date: editDate,
            sheetType: 'classica',
            grades: gradesForImage,
            note: editNote.trim() || null,
          },
          `pagellino_${editDate}`
        );
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

        <div className="space-y-3">
          {grades.map(grade => {
            const role = (grade.player_role as PlayerRole) || PLAYER_ROLE_MAP[grade.player_name];

            return (
              <Card key={grade.id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground">
                    {grade.player_name} <span className="text-muted-foreground font-normal">({role ? ROLE_DISPLAY_NAMES[role] : 'N/A'})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      {/* Comment field */}
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Commento (opzionale)</label>
                        <Textarea
                          value={editComments[grade.player_name] || ''}
                          onChange={(e) => setEditComments(prev => ({ ...prev, [grade.player_name]: e.target.value }))}
                          placeholder="Aggiungi un commento per questo giocatore..."
                          maxLength={300}
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[60px]"
                        />
                        <p className="text-xs text-muted-foreground">{(editComments[grade.player_name] || '').length}/300</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Voto Generale (1-10)</label>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                            <Button
                              key={num}
                              variant={editGrades[grade.player_name] === num ? 'default' : 'outline'}
                              size="sm"
                              className={`w-10 h-10 p-0 text-sm ${
                                editGrades[grade.player_name] === num 
                                  ? 'gradient-primary text-primary-foreground' 
                                  : 'border-border text-foreground hover:bg-muted'
                              }`}
                              onClick={() => setGrade(grade.player_name, editGrades[grade.player_name] === num ? null : num)}
                            >
                              {num}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
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
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salva Modifiche
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default GradeSheetDetail;
