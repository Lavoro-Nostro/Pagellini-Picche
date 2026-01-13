import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useModeratorTeam = () => {
  const { session } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: team, error } = await supabase
          .from('teams')
          .select('id, name')
          .eq('moderator_id', session.user.id)
          .single();

        if (!error && team) {
          setTeamId(team.id);
          setTeamName(team.name);
        }
      } catch (error) {
        console.error('Error fetching moderator team:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeam();
  }, [session?.user?.id]);

  return { teamId, teamName, isLoading };
};
