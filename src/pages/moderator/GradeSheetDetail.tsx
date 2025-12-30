import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Edit, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

interface PlayerGrade {
  id: string;
  player_name: string;
  ricezione: number | null;
  attacco: number | null;
  difesa: number | null;
  battuta: number | null;
  voto_generale: number | null;
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
    } catch (error) {
      console.error(error);
      toast.error('Errore nel caricamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('grade_sheets')
        .update({
          sheet_date: editDate,
          note: editNote || null,
        })
        .eq('id', id);

      if (error) throw error;

      setSheet(prev => prev ? { ...prev, sheet_date: editDate, note: editNote || null } : null);
      setIsEditing(false);
      toast.success('Pagellino aggiornato!');
    } catch (error) {
      console.error(error);
      toast.error('Errore nel salvataggio');
    }
  };

  const handleDelete = async () => {
    try {
      await supabase.from('player_grades').delete().eq('grade_sheet_id', id);
      await supabase.from('grade_sheets').delete().eq('id', id);
      
      toast.success('Pagellino eliminato!');
      navigate('/moderator/history');
    } catch (error) {
      console.error(error);
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
      <div className="max-w-2xl mx-auto space-y-6">
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
            Modifica
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
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Note</label>
                <Textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground gap-2">
                <Save className="w-4 h-4" />
                Salva Modifiche
              </Button>
            </CardContent>
          </Card>
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
          {grades.map(grade => (
            <Card key={grade.id} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground">{grade.player_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ricezione:</span>
                    <span className="text-foreground font-medium">{grade.ricezione ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attacco:</span>
                    <span className="text-foreground font-medium">{grade.attacco ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Difesa:</span>
                    <span className="text-foreground font-medium">{grade.difesa ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Battuta:</span>
                    <span className="text-foreground font-medium">{grade.battuta ?? '-'}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between">
                  <span className="text-muted-foreground font-medium">Voto Generale:</span>
                  <span className="text-primary font-bold text-lg">{grade.voto_generale?.toFixed(2) ?? '-'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GradeSheetDetail;
