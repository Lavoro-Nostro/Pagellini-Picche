import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ROLE_DISPLAY_NAMES, type PlayerRole } from '@/lib/playerRoles';

interface Player {
  id: string;
  username: string;
  name: string;
  player_role: PlayerRole | null;
}

const PLAYER_ROLES: PlayerRole[] = ['martello', 'opposto', 'libero', 'centrale', 'palleggio'];

const ManagePlayers = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<PlayerRole | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmPlayer, setDeleteConfirmPlayer] = useState<Player | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | PlayerRole>('all');
  
  const [newPlayer, setNewPlayer] = useState({
    username: '',
    password: '',
    name: '',
    player_role: 'martello' as PlayerRole
  });

  const fetchPlayers = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Get moderator's team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('moderator_id', session.user.id)
        .single();

      if (teamError) {
        console.error('Error fetching team:', teamError);
        setIsLoading(false);
        return;
      }

      setTeamName(teamData.name);

      // Get all profiles in this team (excluding the moderator themselves)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, name, player_role')
        .eq('team_id', teamData.id)
        .neq('id', session.user.id)
        .order('name');

      if (profilesError) {
        console.error('Error fetching players:', profilesError);
        setPlayers([]);
      } else {
        setPlayers((profilesData || []) as Player[]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleCreatePlayer = async () => {
    if (!newPlayer.username || !newPlayer.password || !newPlayer.name) {
      toast.error('Compila tutti i campi');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          username: newPlayer.username,
          password: newPlayer.password,
          name: newPlayer.name,
          role: 'player',
          player_role: newPlayer.player_role
        }
      });

      if (error) {
        console.error('Error creating player:', error);
        toast.error('Errore nella creazione del giocatore');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Giocatore creato con successo!');
      setNewPlayer({ username: '', password: '', name: '', player_role: 'martello' });
      setIsDialogOpen(false);
      fetchPlayers();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Errore nella creazione del giocatore');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditRole = (player: Player) => {
    setEditingPlayer(player);
    setEditRole(player.player_role);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingPlayer) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ player_role: editRole })
        .eq('id', editingPlayer.id);

      if (error) {
        console.error('Error updating role:', error);
        toast.error('Errore nell\'aggiornamento del ruolo');
        return;
      }

      toast.success('Ruolo aggiornato!');
      setIsEditDialogOpen(false);
      setEditingPlayer(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Errore nell\'aggiornamento del ruolo');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (player: Player) => {
    setDeleteConfirmPlayer(player);
    setIsDeleteDialogOpen(true);
  };

  const handleDeletePlayer = async () => {
    if (!deleteConfirmPlayer) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: deleteConfirmPlayer.id }
      });

      if (error) {
        console.error('Error deleting player:', error);
        toast.error('Errore nell\'eliminazione del giocatore');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Giocatore eliminato!');
      setIsDeleteDialogOpen(false);
      setDeleteConfirmPlayer(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Errore nell\'eliminazione del giocatore');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.name.toLowerCase().includes(searchText.toLowerCase()) ||
      player.username.toLowerCase().includes(searchText.toLowerCase());
    const matchesRole = roleFilter === 'all' || player.player_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen gradient-dark p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/moderator')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestisci Giocatori</h1>
            <p className="text-muted-foreground">{teamName}</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gradient-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              Aggiungi Giocatore
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Nuovo Giocatore</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  placeholder="Mario Rossi"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newPlayer.username}
                  onChange={(e) => setNewPlayer({ ...newPlayer, username: e.target.value })}
                  placeholder="mario.rossi"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newPlayer.password}
                  onChange={(e) => setNewPlayer({ ...newPlayer, password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Ruolo</Label>
                <Select
                  value={newPlayer.player_role}
                  onValueChange={(value) => setNewPlayer({ ...newPlayer, player_role: value as PlayerRole })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_DISPLAY_NAMES[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreatePlayer}
                disabled={isCreating}
                className="w-full gradient-primary text-primary-foreground"
              >
                {isCreating ? 'Creazione...' : 'Crea Giocatore'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Cerca</Label>
              <Input
                id="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Nome o username"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Filtro ruolo</Label>
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as 'all' | PlayerRole)}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Tutti i ruoli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  {PLAYER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_DISPLAY_NAMES[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Modifica Ruolo - {editingPlayer?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Ruolo</Label>
                <Select
                  value={editRole || undefined}
                  onValueChange={(value) => setEditRole(value as PlayerRole)}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_DISPLAY_NAMES[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleUpdateRole}
                disabled={isUpdating}
                className="w-full gradient-primary text-primary-foreground"
              >
                {isUpdating ? 'Aggiornamento...' : 'Salva'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Elimina Giocatore</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-muted-foreground">
                Sei sicuro di voler eliminare <strong className="text-foreground">{deleteConfirmPlayer?.name}</strong>? 
                Questa azione non può essere annullata.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeletePlayer}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? 'Eliminazione...' : 'Elimina'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Giocatori ({filteredPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Caricamento...</p>
            ) : filteredPlayers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nessun giocatore trovato
              </p>
            ) : (
              <div className="space-y-2">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">{player.name}</p>
                      <p className="text-sm text-muted-foreground">
                        @{player.username} • {player.player_role ? ROLE_DISPLAY_NAMES[player.player_role] : 'Nessun ruolo'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditRole(player)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(player)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagePlayers;
