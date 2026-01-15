import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Calendar, Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { useModeratorTeam } from '@/hooks/useModeratorTeam';

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

const ManageMatches = () => {
  const navigate = useNavigate();
  const { teamId, teamName } = useModeratorTeam();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    match_date: '',
    match_time: '',
    opponent: '',
    location_name: '',
    location_address: '',
    is_home: false,
    is_cancelled: false,
    notes: ''
  });

  const fetchMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });
    
    setMatches(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const openEditDialog = (match: Match) => {
    setEditingMatch(match);
    setFormData({
      match_date: match.match_date,
      match_time: match.match_time.slice(0, 5),
      opponent: match.opponent,
      location_name: match.location_name,
      location_address: match.location_address,
      is_home: match.is_home,
      is_cancelled: match.is_cancelled,
      notes: match.notes || ''
    });
    setIsCreating(false);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingMatch(null);
    setFormData({
      match_date: '',
      match_time: '',
      opponent: '',
      location_name: '',
      location_address: '',
      is_home: false,
      is_cancelled: false,
      notes: ''
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.match_date || !formData.match_time || !formData.opponent || !formData.location_name || !formData.location_address) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setIsSaving(true);

    try {
      if (isCreating) {
        if (!teamId) {
          toast.error('Team non trovato');
          return;
        }
        const { error } = await supabase
          .from('matches')
          .insert({
            match_date: formData.match_date,
            match_time: formData.match_time,
            opponent: formData.opponent,
            location_name: formData.location_name,
            location_address: formData.location_address,
            is_home: formData.is_home,
            is_cancelled: formData.is_cancelled,
            notes: formData.notes || null,
            team_id: teamId
          });

        if (error) throw error;
        toast.success('Partita creata!');
      } else if (editingMatch) {
        const { error } = await supabase
          .from('matches')
          .update({
            match_date: formData.match_date,
            match_time: formData.match_time,
            opponent: formData.opponent,
            location_name: formData.location_name,
            location_address: formData.location_address,
            is_home: formData.is_home,
            is_cancelled: formData.is_cancelled,
            notes: formData.notes || null
          })
          .eq('id', editingMatch.id);

        if (error) throw error;
        toast.success('Partita aggiornata!');
      }

      setIsDialogOpen(false);
      fetchMatches();
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa partita?')) return;

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;
      toast.success('Partita eliminata!');
      fetchMatches();
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen gradient-dark p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/moderator')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Gestisci Partite</h1>
          </div>
          <Button
            size="icon"
            className="gradient-primary"
            onClick={openCreateDialog}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card/50 rounded-xl p-4 border border-border/50 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-muted rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-card/50 rounded-xl p-6 border border-border/50 text-center">
            <p className="text-muted-foreground">Nessuna partita in programma</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const isPast = match.match_date < today;
              const matchDate = new Date(`${match.match_date}T${match.match_time}`);
              const formattedDate = format(matchDate, "EEEE d MMMM yyyy", { locale: it });
              const formattedTime = match.match_time.slice(0, 5);
              
              const matchTitle = match.is_home 
                ? `${teamName || 'Noi'} vs ${match.opponent}`
                : `${match.opponent} vs ${teamName || 'Noi'}`;

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
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(match)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(match.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Nuova Partita' : 'Modifica Partita'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.match_date}
                  onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ora</Label>
                <Input
                  type="time"
                  value={formData.match_time}
                  onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Avversario</Label>
              <Input
                value={formData.opponent}
                onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                placeholder="Nome squadra avversaria"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Struttura</Label>
              <Input
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                placeholder="Es: SMS Gaio Cecilio"
              />
            </div>
            <div className="space-y-2">
              <Label>Indirizzo</Label>
              <Input
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Es: Via Vestricio Spurrina, 152"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Partita in Casa</Label>
              <Switch
                checked={formData.is_home}
                onCheckedChange={(checked) => setFormData({ ...formData, is_home: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Annullata</Label>
              <Switch
                checked={formData.is_cancelled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_cancelled: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note aggiuntive..."
                rows={2}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full gradient-primary"
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageMatches;
