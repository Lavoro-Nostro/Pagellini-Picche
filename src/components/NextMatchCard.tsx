import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface Match {
  id: string;
  match_date: string;
  match_time: string;
  opponent: string;
  location_name: string;
  location_address: string;
  is_home: boolean;
  is_cancelled: boolean;
}

interface NextMatchCardProps {
  match: Match | null;
  isLoading: boolean;
}

const NextMatchCard = ({ match, isLoading }: NextMatchCardProps) => {
  if (isLoading) {
    return (
      <div className="bg-card/50 rounded-xl p-4 border border-border/50 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
        <div className="h-6 bg-muted rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="bg-card/50 rounded-xl p-4 border border-border/50 text-center">
        <p className="text-muted-foreground">Nessuna partita in programma</p>
      </div>
    );
  }

  const matchDate = new Date(`${match.match_date}T${match.match_time}`);
  const formattedDate = format(matchDate, "EEEE d MMMM yyyy", { locale: it });
  const formattedTime = match.match_time.slice(0, 5);
  
  const matchTitle = match.is_home 
    ? `New Picche vs ${match.opponent}`
    : `${match.opponent} vs New Picche`;

  return (
    <div className={`bg-card/50 rounded-xl p-4 border ${match.is_cancelled ? 'border-destructive/50' : 'border-primary/30'}`}>
      <p className="text-xs text-primary font-medium uppercase tracking-wide mb-2">
        {match.is_cancelled ? '❌ Annullata' : '🏐 Prossima Partita'}
      </p>
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
      </div>
    </div>
  );
};

export default NextMatchCard;
