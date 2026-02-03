import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { devLog } from '@/lib/devLog';

interface MvpVote {
  id: string;
  voter_id: string;
  voted_player_id: string | null;
  voted_player_name: string;
}

interface PlayerGrade {
  id: string;
  player_id: string | null;
  player_name: string;
}

interface MvpVotingProps {
  gradeSheetId: string;
  grades: PlayerGrade[];
}

const MvpVoting = ({ gradeSheetId, grades }: MvpVotingProps) => {
  const { profile } = useAuth();
  const [votes, setVotes] = useState<MvpVote[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

  const fetchVotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mvp_votes')
        .select('*')
        .eq('grade_sheet_id', gradeSheetId);

      if (error) throw error;

      const typedVotes = (data || []) as unknown as MvpVote[];
      setVotes(typedVotes);

      // Find current user's vote
      const userVote = typedVotes.find(v => v.voter_id === profile?.id);
      setMyVote(userVote?.voted_player_id || null);
    } catch (error) {
      devLog.error('Error fetching MVP votes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [gradeSheetId, profile?.id]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  const handleVote = async (playerId: string | null, playerName: string) => {
    if (!profile?.id) return;

    // Can't vote for yourself
    if (playerId && playerId === profile.id) {
      toast.error('Non puoi votare te stesso!');
      return;
    }

    setIsVoting(true);
    try {
      if (myVote === playerId) {
        // Remove vote
        const { error } = await supabase
          .from('mvp_votes')
          .delete()
          .eq('grade_sheet_id', gradeSheetId)
          .eq('voter_id', profile.id);

        if (error) throw error;
        setMyVote(null);
        setVotes(prev => prev.filter(v => v.voter_id !== profile.id));
        toast.success('Voto rimosso');
      } else if (myVote) {
        // Update existing vote
        const { error } = await supabase
          .from('mvp_votes')
          .update({ voted_player_id: playerId, voted_player_name: playerName })
          .eq('grade_sheet_id', gradeSheetId)
          .eq('voter_id', profile.id);

        if (error) throw error;
        setMyVote(playerId);
        setVotes(prev => prev.map(v => 
          v.voter_id === profile.id ? { ...v, voted_player_id: playerId, voted_player_name: playerName } : v
        ));
        toast.success(`Hai votato ${playerName} come MVP!`);
      } else {
        // Insert new vote
        const { data, error } = await supabase
          .from('mvp_votes')
          .insert({
            grade_sheet_id: gradeSheetId,
            voter_id: profile.id,
            voted_player_id: playerId,
            voted_player_name: playerName,
          })
          .select()
          .single();

        if (error) throw error;
        setMyVote(playerId);
        setVotes(prev => [...prev, data as unknown as MvpVote]);
        toast.success(`Hai votato ${playerName} come MVP!`);
      }
    } catch (error) {
      devLog.error('Error voting MVP:', error);
      toast.error('Errore nel voto');
    } finally {
      setIsVoting(false);
    }
  };

  // Calculate vote counts
  const voteCounts = grades.reduce((acc, grade) => {
    if (grade.player_id) {
      acc[grade.player_id] = votes.filter(v => v.voted_player_id === grade.player_id).length;
    }
    return acc;
  }, {} as Record<string, number>);

  // Find MVP(s) - players with most votes
  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const mvpPlayers = maxVotes > 0 
    ? Object.entries(voteCounts)
        .filter(([, count]) => count === maxVotes)
        .map(([playerId]) => playerId)
    : [];

  if (isLoading) {
    return (
      <Card className="bg-card border-yellow-500/30 animate-pulse">
        <CardContent className="p-4 h-24" />
      </Card>
    );
  }

  return (
    <Card className="bg-card border-yellow-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Vota MVP
          <span className="text-sm font-normal text-muted-foreground">
            ({votes.length} vot{votes.length === 1 ? 'o' : 'i'})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Hai diritto a 1 voto. Clicca su un giocatore per votarlo MVP.
        </p>
        <div className="flex flex-wrap gap-2">
        {grades.map(grade => {
            const isMyVote = !!grade.player_id && myVote === grade.player_id;
            const isMvp = !!grade.player_id && mvpPlayers.includes(grade.player_id);
            const voteCount = grade.player_id ? voteCounts[grade.player_id] || 0 : 0;
            const isMe = !!grade.player_id && grade.player_id === profile?.id;

            return (
              <Button
                key={grade.id}
                variant={isMyVote ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVote(grade.player_id, grade.player_name)}
                disabled={isVoting || isMe || !grade.player_id}
                className={`relative ${
                  isMyVote 
                    ? 'bg-yellow-500 text-black hover:bg-yellow-600' 
                    : isMvp
                      ? 'border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10'
                      : 'border-border text-foreground hover:bg-muted'
                } ${isMe ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {grade.player_name}
                {voteCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={`ml-1 text-xs px-1.5 ${
                      isMvp ? 'bg-yellow-500/20 text-yellow-500' : ''
                    }`}
                  >
                    {voteCount}
                  </Badge>
                )}
                {isMyVote && <Check className="w-3 h-3 ml-1" />}
                {isMvp && !isMyVote && <Trophy className="w-3 h-3 ml-1 text-yellow-500" />}
              </Button>
            );
          })}
        </div>
        {mvpPlayers.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-foreground">
              <span className="text-yellow-500 font-semibold">MVP: </span>
              {mvpPlayers
                .map((playerId) => grades.find((g) => g.player_id === playerId)?.player_name)
                .filter(Boolean)
                .join(', ')} 
              <span className="text-muted-foreground"> ({maxVotes} vot{maxVotes === 1 ? 'o' : 'i'})</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MvpVoting;
