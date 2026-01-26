import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useModeratorTeam } from './useModeratorTeam';
import { devLog } from '@/lib/devLog';

interface ModeratorSettings {
  onesignal_app_id: string | null;
  onesignal_rest_api_key: string | null;
}

export const useModeratorSettings = () => {
  const { teamId } = useModeratorTeam();
  const [settings, setSettings] = useState<ModeratorSettings | null>(null);
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
          .select('onesignal_app_id, onesignal_rest_api_key')
          .eq('team_id', teamId)
          .maybeSingle();

        if (error) throw error;
        setSettings(data);
      } catch (error) {
        devLog.error('Error fetching moderator settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [teamId]);

  return { settings, isLoading, teamId };
};
