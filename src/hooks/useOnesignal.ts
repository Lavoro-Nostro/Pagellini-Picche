import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { devLog } from '@/lib/devLog';

declare global {
  interface Window {
    OneSignal?: {
      init: (config: { appId: string; allowLocalhostAsSecureOrigin?: boolean }) => Promise<void>;
      Notifications: {
        requestPermission: () => Promise<string>;
        permission: boolean;
      };
      User: {
        addTag: (key: string, value: string) => void;
        addTags: (tags: Record<string, string>) => void;
      };
      login: (userId: string) => Promise<void>;
    };
  }
}

export const useOneSignal = (appId: string | null) => {
  const { profile } = useAuth();

  useEffect(() => {
    if (!appId || !profile?.id) return;

    const loadOneSignal = async () => {
      try {
        // Check if OneSignal SDK is already loaded
        if (window.OneSignal) {
          await initializeOneSignal();
          return;
        }

        // Load OneSignal SDK dynamically
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.async = true;
        script.defer = true;

        script.onload = async () => {
          await initializeOneSignal();
        };

        document.head.appendChild(script);
      } catch (error) {
        devLog.error('Error loading OneSignal:', error);
      }
    };

    const initializeOneSignal = async () => {
      if (!window.OneSignal || !appId) return;

      try {
        await window.OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
        });

        // Request permission
        await window.OneSignal.Notifications.requestPermission();

        // Login with user ID for targeted notifications
        if (profile?.id) {
          await window.OneSignal.login(profile.id);
          
          // Add user tags for targeting
          window.OneSignal.User.addTags({
            role: 'player',
          });
        }

        devLog.log('OneSignal initialized successfully');
      } catch (error) {
        devLog.error('Error initializing OneSignal:', error);
      }
    };

    loadOneSignal();
  }, [appId, profile?.id]);
};

export const sendPushNotification = async (
  teamId: string,
  title: string,
  message: string
): Promise<boolean> => {
  try {
    // Get OneSignal settings for this team
    const { data: settings, error: settingsError } = await supabase
      .from('moderator_settings')
      .select('onesignal_app_id, onesignal_rest_api_key')
      .eq('team_id', teamId)
      .maybeSingle();

    if (settingsError || !settings?.onesignal_app_id || !settings?.onesignal_rest_api_key) {
      devLog.warn('OneSignal not configured for this team');
      return false;
    }

    // Get all player IDs in this team
    const { data: players, error: playersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('team_id', teamId);

    if (playersError || !players?.length) {
      devLog.warn('No players found for team');
      return false;
    }

    const playerIds = players.map(p => p.id);

    // Send notification via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${settings.onesignal_rest_api_key}`,
      },
      body: JSON.stringify({
        app_id: settings.onesignal_app_id,
        include_external_user_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
      }),
    });

    if (!response.ok) {
      throw new Error(`OneSignal API error: ${response.status}`);
    }

    devLog.log('Push notification sent successfully');
    return true;
  } catch (error) {
    devLog.error('Error sending push notification:', error);
    return false;
  }
};
