import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Match {
  id: string;
  match_date: string;
  match_time: string;
  opponent: string;
  location_name: string;
  location_address: string;
  is_home: boolean;
  is_cancelled: boolean;
  notes: string | null;
}

const MatchesList = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true });
      
      setMatches(data || []);
      setIsLoading(false);
    };

    fetchMatches();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen gradient-dark p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/player')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Calendario Partite</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card/50 rounded-xl p-4 border border-border/50 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-muted rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-card/50 rounded-xl p-6 border border-border/50 text-center">
            <p className="text-muted-foreground">Nessuna partita in programma</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const isPast = match.match_date < today;
              const matchDate = new Date(`${match.match_date}T${match.match_time}`);
              const formattedDate = format(matchDate, "EEEE d MMMM yyyy", { locale: it });
              const formattedTime = match.match_time.slice(0, 5);
              
              const matchTitle = match.is_home 
                ? `New Picche vs ${match.opponent}`
                : `${match.opponent} vs New Picche`;

              return (
                <div 
                  key={match.id} 
                  className={`bg-card/50 rounded-xl p-4 border ${
                    match.is_cancelled 
                      ? 'border-destructive/50 opacity-60' 
                      : isPast 
                        ? 'border-border/30 opacity-50' 
                        : 'border-primary/30'
                  }`}
                >
                  {match.is_cancelled && (
                    <p className="text-xs text-destructive font-medium uppercase tracking-wide mb-2">
                      ❌ Annullata
                    </p>
                  )}
                  {isPast && !match.is_cancelled && (
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      Partita passata
                    </p>
                  )}
                  <p className={`font-bold text-lg ${match.is_cancelled ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {matchTitle}
                  </p>
                  <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="capitalize">{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>Ore {formattedTime}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary mt-0.5" />
                      <span>{match.location_name} – {match.location_address}</span>
                    </div>
                    {match.notes && (
                      <p className="text-xs italic mt-2 text-yellow-500">{match.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchesList;
