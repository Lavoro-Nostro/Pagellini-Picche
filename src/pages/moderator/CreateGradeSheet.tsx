import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const PLAYERS = [
  'Alessio Livi', 'Alessio Pecci', 'Alex', 'Elisa', 'Fabio', 'Filippo',
  'Francesco', 'Gaetano', 'Giorgia', 'Giulia', 'Greta', 'Laura',
  'Martina', 'Matteo', 'Nisia', 'Tobias'
];

const CATEGORIES = ['ricezione', 'attacco', 'difesa', 'battuta'] as const;

type CategoryType = typeof CATEGORIES[number];

interface PlayerGrade {
  ricezione: number | null;
  attacco: number | null;
  difesa: number | null;
  battuta: number | null;
}

const CreateGradeSheet = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [grades, setGrades] = useState<Record<string, PlayerGrade>>(() => {
    const initial: Record<string, PlayerGrade> = {};
    PLAYERS.forEach(player => {
      initial[player] = { ricezione: null, attacco: null, difesa: null, battuta: null };
    });
    return initial;
  });
  const [customGradePlayer, setCustomGradePlayer] = useState<string | null>(null);
  const [customGradeCategory, setCustomGradeCategory] = useState<CategoryType | null>(null);
  const [customGradeValue, setCustomGradeValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const setGrade = (player: string, category: CategoryType, value: number | null) => {
    setGrades(prev => ({
      ...prev,
      [player]: { ...prev[player], [category]: value }
    }));
  };

  const handleCustomGrade = () => {
    if (customGradePlayer && customGradeCategory && customGradeValue) {
      const value = parseFloat(customGradeValue);
      if (value > 10) {
        setGrade(customGradePlayer, customGradeCategory, value);
        setCustomGradeValue('');
        setCustomGradePlayer(null);
        setCustomGradeCategory(null);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Create grade sheet
      const { data: sheetData, error: sheetError } = await supabase
        .from('grade_sheets')
        .insert({
          sheet_date: date,
          note: note || null,
        })
        .select()
        .single();

      if (sheetError) throw sheetError;

      // Create player grades
      const playerGrades = PLAYERS.map(player => {
        const playerGrade = grades[player];
        const hasGrades = Object.values(playerGrade).some(v => v !== null);
        
        if (!hasGrades) return null;

        const validGrades = Object.values(playerGrade).filter(v => v !== null) as number[];
        const votoGenerale = validGrades.length > 0 
          ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length 
          : null;

        return {
          grade_sheet_id: sheetData.id,
          player_name: player,
          ricezione: playerGrade.ricezione,
          attacco: playerGrade.attacco,
          difesa: playerGrade.difesa,
          battuta: playerGrade.battuta,
          voto_generale: votoGenerale ? Math.round(votoGenerale * 100) / 100 : null,
        };
      }).filter(Boolean);

      if (playerGrades.length > 0) {
        const { error: gradesError } = await supabase
          .from('player_grades')
          .insert(playerGrades);

        if (gradesError) throw gradesError;
      }

      toast.success('Pagellino salvato con successo!');
      navigate('/moderator');
    } catch (error) {
      console.error(error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6">
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

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Data</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Note (opzionale)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Aggiungi una nota..."
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-4">
          {PLAYERS.map(player => (
            <Card key={player} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground">{player}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {CATEGORIES.map(category => (
                  <div key={category} className="space-y-2">
                    <label className="text-sm text-muted-foreground capitalize">{category}</label>
                    <div className="flex flex-wrap gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <Button
                          key={num}
                          variant={grades[player][category] === num ? 'default' : 'outline'}
                          size="sm"
                          className={`w-8 h-8 p-0 text-xs ${
                            grades[player][category] === num 
                              ? 'gradient-primary text-primary-foreground' 
                              : 'border-border text-foreground hover:bg-muted'
                          }`}
                          onClick={() => setGrade(player, category, grades[player][category] === num ? null : num)}
                        >
                          {num}
                        </Button>
                      ))}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant={grades[player][category] && grades[player][category]! > 10 ? 'default' : 'outline'}
                            size="sm"
                            className={`px-2 h-8 text-xs ${
                              grades[player][category] && grades[player][category]! > 10
                                ? 'gradient-primary text-primary-foreground'
                                : 'border-border text-foreground hover:bg-muted'
                            }`}
                            onClick={() => {
                              setCustomGradePlayer(player);
                              setCustomGradeCategory(category);
                            }}
                          >
                            {grades[player][category] && grades[player][category]! > 10 
                              ? grades[player][category] 
                              : '10+'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">Voto personalizzato</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              type="number"
                              min="11"
                              step="0.5"
                              placeholder="Inserisci voto (>10)"
                              value={customGradeValue}
                              onChange={(e) => setCustomGradeValue(e.target.value)}
                              className="bg-muted border-border text-foreground"
                            />
                            <Button
                              onClick={() => {
                                if (customGradePlayer && customGradeCategory && customGradeValue) {
                                  const value = parseFloat(customGradeValue);
                                  if (value > 10) {
                                    setGrade(customGradePlayer, customGradeCategory, value);
                                  }
                                }
                                setCustomGradeValue('');
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
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

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
