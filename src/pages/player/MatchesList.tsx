import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { usePlayerTeam } from '@/hooks/usePlayerTeam';

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
  team_id: string;
}

interface TeamInfo {
  id: string;
  name: string;
}

const MatchesList = () => {
  const navigate = useNavigate();
  const { teamId, teamName, isLoading: isTeamLoading } = usePlayerTeam();
  const [matches, setMatches] = useState<Match[]>([]);
  const [otherTeamMatches, setOtherTeamMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!teamId) return;

      // Fetch all teams for name lookup
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name');

      const teamsMap: Record<string, string> = {};
      teamsData?.forEach(t => {
        teamsMap[t.id] = t.name;
      });
      setTeams(teamsMap);

      // Fetch own team matches
      const { data: ownMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('team_id', teamId)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true });

      setMatches(ownMatches || []);

      // Fetch other teams' future matches for spectating
      const today = new Date().toISOString().split('T')[0];
      const { data: otherMatches } = await supabase
        .from('matches')
        .select('*')
        .neq('team_id', teamId)
        .gte('match_date', today)
        .eq('is_cancelled', false)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true });

      setOtherTeamMatches(otherMatches || []);
      setIsLoading(false);
    };

    if (teamId) {
      fetchData();
    }
  }, [teamId]);

  const today = new Date().toISOString().split('T')[0];

  if (isTeamLoading || isLoading) {
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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card/50 rounded-xl p-4 border border-border/50 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-muted rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

        {/* Own Team Matches */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Le tue partite</h2>
          {matches.length === 0 ? (
            <div className="bg-card/50 rounded-xl p-6 border border-border/50 text-center">
              <p className="text-muted-foreground">Nessuna partita in programma</p>
            </div>
          ) : (
            matches.map((match) => {
              const isPast = match.match_date < today;
              const matchDate = new Date(`${match.match_date}T${match.match_time}`);
              const formattedDate = format(matchDate, "EEEE d MMMM yyyy", { locale: it });
              const formattedTime = match.match_time.slice(0, 5);
              
              const displayTeamName = teamName || 'Noi';
              const matchTitle = match.is_home 
                ? `${displayTeamName} vs ${match.opponent}`
                : `${match.opponent} vs ${displayTeamName}`;

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
            })
          )}
        </div>

        {/* Other Teams' Matches - Spectator Section */}
        {otherTeamMatches.length > 0 && (
          <Card className="bg-card/30 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                Partite delle altre squadre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground mb-3">
                Vuoi fare il tifo? Ecco le prossime partite delle altre squadre ASD Picche:
              </p>
              {otherTeamMatches.map((match) => {
                const matchDate = new Date(`${match.match_date}T${match.match_time}`);
                const formattedDate = format(matchDate, "EEE d MMM", { locale: it });
                const formattedTime = match.match_time.slice(0, 5);
                const otherTeamName = teams[match.team_id] || 'Squadra';
                
                const matchTitle = match.is_home 
                  ? `${otherTeamName} vs ${match.opponent}`
                  : `${match.opponent} vs ${otherTeamName}`;

                return (
                  <div 
                    key={match.id} 
                    className="bg-background/50 rounded-lg p-3 border border-border/30 text-sm"
                  >
                    <p className="font-medium text-foreground">{matchTitle}</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span className="capitalize">{formattedDate}</span>
                        <Clock className="w-3 h-3 ml-2" />
                        <span>{formattedTime}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 mt-0.5" />
                        <span>{match.location_name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MatchesList;