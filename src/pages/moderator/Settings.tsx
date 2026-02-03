import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Loader2, Bell } from 'lucide-react';
import { useModeratorTeam } from '@/hooks/useModeratorTeam';
import { devLog } from '@/lib/devLog';

const Settings = () => {
  const navigate = useNavigate();
  const { teamId } = useModeratorTeam();
  const [onesignalAppId, setOnesignalAppId] = useState('');
  const [onesignalRestApiKey, setOnesignalRestApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) fetchSettings();
  }, [teamId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('moderator_settings')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setOnesignalAppId(data.onesignal_app_id || '');
        setOnesignalRestApiKey(data.onesignal_rest_api_key || '');
      }
    } catch (error) {
      devLog.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!teamId) {
      toast.error('Team non trovato');
      return;
    }

    setIsSaving(true);
    try {
      if (settingsId) {
        // Update existing settings
        const { error } = await supabase
          .from('moderator_settings')
          .update({
            onesignal_app_id: onesignalAppId.trim() || null,
            onesignal_rest_api_key: onesignalRestApiKey.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('moderator_settings')
          .insert({
            team_id: teamId,
            onesignal_app_id: onesignalAppId.trim() || null,
            onesignal_rest_api_key: onesignalRestApiKey.trim() || null,
          })
          .select()
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }

      toast.success('Impostazioni salvate!');
    } catch (error) {
      devLog.error('Error saving settings:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/moderator')}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Impostazioni</h1>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              OneSignal Push Notifications
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configura OneSignal per inviare notifiche push ai giocatori quando pubblichi un pagellino.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appId" className="text-foreground">App ID</Label>
              <Input
                id="appId"
                type="text"
                value={onesignalAppId}
                onChange={(e) => setOnesignalAppId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restApiKey" className="text-foreground">REST API Key</Label>
              <Input
                id="restApiKey"
                type="password"
                value={onesignalRestApiKey}
                onChange={(e) => setOnesignalRestApiKey(e.target.value)}
                placeholder="••••••••••••••••"
                className="bg-muted border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Puoi trovare queste chiavi nella dashboard di OneSignal → Settings → Keys & IDs
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full gradient-primary text-primary-foreground"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salva Impostazioni
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
