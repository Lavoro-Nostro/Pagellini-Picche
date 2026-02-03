import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface GradeSheet {
  id: string;
  sheet_date: string;
  note: string | null;
  created_at: string;
}

const GradeSheetHistory = () => {
  const navigate = useNavigate();
  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ['player-grade-sheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grade_sheets')
        .select('id, sheet_date, note, created_at')
        .order('sheet_date', { ascending: false });

      if (error) throw error;
      return (data || []) as GradeSheet[];
    },
    staleTime: 60_000,
  });

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
          <h1 className="text-2xl font-bold text-foreground">Storico Pagellini</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
        ) : sheets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nessun pagellino trovato
          </div>
        ) : (
          <div className="space-y-3">
            {sheets.map(sheet => (
              <Card 
                key={sheet.id} 
                className="bg-card border-border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/player/sheet/${sheet.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <Calendar className="w-4 h-4 text-primary" />
                        Pagellino del {format(new Date(sheet.sheet_date), 'd MMMM yyyy', { locale: it })}
                      </div>
                      {sheet.note && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4 mt-0.5" />
                          <span className="line-clamp-2">{sheet.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GradeSheetHistory;
