import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerTeam } from './usePlayerTeam';
import { devLog } from '@/lib/devLog';

export const usePlayerSettings = () => {
  const { teamId } = usePlayerTeam();
  const [onesignalAppId, setOnesignalAppId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('moderator_settings')
          .select('onesignal_app_id')
          .eq('team_id', teamId)
          .maybeSingle();

        if (error) throw error;
        setOnesignalAppId(data?.onesignal_app_id || null);
      } catch (error) {
        devLog.error('Error fetching player settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [teamId]);

  return { onesignalAppId, isLoading };
};
