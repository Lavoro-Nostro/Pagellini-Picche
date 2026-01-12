import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export const useNextMatch = () => {
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNextMatch = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('matches')
        .select('*')
        .gte('match_date', today)
        .eq('is_cancelled', false)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })
        .limit(1)
        .single();
      
      setNextMatch(data);
      setIsLoading(false);
    };

    fetchNextMatch();
  }, []);

  return { nextMatch, isLoading };
};
