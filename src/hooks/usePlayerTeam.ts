import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePlayerTeam = () => {
  const { session } = useAuth();
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile?.team_id) {
          setIsLoading(false);
          return;
        }

        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('name')
          .eq('id', profile.team_id)
          .single();

        if (!teamError && team) {
          setTeamName(team.name);
        }
      } catch (error) {
        console.error('Error fetching team:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeam();
  }, [session?.user?.id]);

  return { teamName, isLoading };
};
