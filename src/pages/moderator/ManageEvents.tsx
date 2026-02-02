import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Calendar, Clock, MapPin, Users, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModeratorTeam } from "@/hooks/useModeratorTeam";
import { sendPushNotification } from "@/hooks/useOnesignal";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type EventType = 'allenamento' | 'partita' | 'evento';

interface Event {
  id: string;
  event_type: EventType;
  details: string | null;
  event_date: string;
  event_time: string;
  location_name: string | null;
  location_address: string | null;
  is_active: boolean;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  profiles: { name: string } | null;
}

const PRESET_LOCATIONS = [
  { name: 'SMS Gaio Cecilio', address: 'Via Vestricio Spurinna, 152' },
  { name: 'Don Michele Rua', address: 'Via Giuseppe Belloni, 30' },
  { name: 'Argan', address: 'Via Giuseppe Belloni, 32' },
];

const ManageEvents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { teamId } = useModeratorTeam();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [eventType, setEventType] = useState<EventType>('allenamento');
  const [details, setDetails] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', teamId)
        .order('event_date', { ascending: false });
      
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!teamId
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['all-attendance', teamId],
    queryFn: async () => {
      if (!teamId || !events) return {};
      
      const eventIds = events.map(e => e.id);
      if (eventIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('event_attendance')
        .select(`
          id,
          event_id,
          user_id,
          status,
          profiles:user_id (name)
        `)
        .in('event_id', eventIds);
      
      if (error) throw error;
      
      const grouped: Record<string, AttendanceRecord[]> = {};
      (data || []).forEach((att) => {
        const record = att as unknown as AttendanceRecord;
        if (!grouped[record.event_id]) grouped[record.event_id] = [];
        grouped[record.event_id].push(record);
      });
      
      return grouped;
    },
    enabled: !!teamId && !!events
  });

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error('Team non trovato');
      
      const { error } = await supabase
        .from('events')
        .insert({
          team_id: teamId,
          event_type: eventType,
          details: details || null,
          event_date: eventDate,
          event_time: eventTime,
          location_name: locationName || null,
          location_address: locationAddress || null
        });
      
      if (error) throw error;

      // Send push notification
      const eventTypeLabel = eventType === 'allenamento' ? 'Allenamento' : eventType === 'partita' ? 'Partita' : 'Evento';
      const formattedDate = format(new Date(eventDate), 'd MMMM', { locale: it });
      await sendPushNotification(
        teamId,
        'Nuovo Sondaggio Presenze',
        `${eventTypeLabel} - ${formattedDate} alle ${eventTime.slice(0, 5)}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: "Evento creato con successo" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Errore", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: "Evento eliminato" });
    },
    onError: (error) => {
      toast({ 
        title: "Errore", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setEventType('allenamento');
    setDetails('');
    setEventDate('');
    setEventTime('');
    setSelectedPreset('');
    setLocationName('');
    setLocationAddress('');
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value === 'custom') {
      setLocationName('');
      setLocationAddress('');
    } else {
      const preset = PRESET_LOCATIONS.find(p => p.name === value);
      if (preset) {
        setLocationName(preset.name);
        setLocationAddress(preset.address);
      }
    }
  };

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const getEventTypeLabel = (type: EventType) => {
    switch (type) {
      case 'allenamento': return 'Allenamento';
      case 'partita': return 'Partita';
      case 'evento': return 'Evento';
    }
  };

  const getEventTypeBadgeVariant = (type: EventType) => {
    switch (type) {
      case 'allenamento': return 'default';
      case 'partita': return 'destructive';
      case 'evento': return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/moderator')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Gestione Eventi</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Sondaggio Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crea Sondaggio Evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Tipo Evento</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allenamento">Allenamento</SelectItem>
                    <SelectItem value="partita">Partita</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dettagli (opzionale)</Label>
                <Textarea 
                  placeholder="Aggiungi dettagli sull'evento..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input 
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Orario</Label>
                  <Input 
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Struttura</Label>
                <Select value={selectedPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona struttura..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_LOCATIONS.map((loc) => (
                      <SelectItem key={loc.name} value={loc.name}>
                        {loc.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Altra struttura...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPreset === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Nome Struttura</Label>
                    <Input 
                      placeholder="Nome struttura..."
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Indirizzo</Label>
                    <Input 
                      placeholder="Via/Indirizzo..."
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                    />
                  </div>
                </>
              )}

              {selectedPreset && selectedPreset !== 'custom' && (
                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  {locationAddress}
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={() => createEventMutation.mutate()}
                disabled={!eventDate || !eventTime || createEventMutation.isPending}
              >
                {createEventMutation.isPending ? 'Creazione...' : 'Crea Evento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Caricamento...</div>
        ) : events?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nessun evento creato
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events?.map((event) => {
              const attendance = attendanceData?.[event.id] || [];
              const presenti = attendance.filter(a => a.status === 'presente');
              const assenti = attendance.filter(a => a.status === 'assente');
              const isExpanded = expandedEvents[event.id];
              
              return (
                <Card key={event.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                            {getEventTypeLabel(event.event_type)}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">
                          {format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: it })}
                        </CardTitle>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{event.event_time.slice(0, 5)}</span>
                    </div>
                    
                    {event.location_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location_name}</span>
                        {event.location_address && <span>- {event.location_address}</span>}
                      </div>
                    )}
                    
                    {event.details && (
                      <p className="text-sm text-muted-foreground">{event.details}</p>
                    )}
                    
                    {/* Attendance Summary with Collapsible */}
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(event.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between mt-2 border border-border">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium text-green-500">{presenti.length} Presenti</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-red-500" />
                              <span className="text-sm font-medium text-red-500">{assenti.length} Assenti</span>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-2">
                        {presenti.length > 0 && (
                          <div className="text-xs text-muted-foreground bg-green-500/10 p-2 rounded">
                            <span className="font-medium text-green-500">Presenti: </span>
                            {presenti.map(p => p.profiles?.name).filter(Boolean).join(', ')}
                          </div>
                        )}
                        {assenti.length > 0 && (
                          <div className="text-xs text-muted-foreground bg-red-500/10 p-2 rounded">
                            <span className="font-medium text-red-500">Assenti: </span>
                            {assenti.map(p => p.profiles?.name).filter(Boolean).join(', ')}
                          </div>
                        )}
                        {presenti.length === 0 && assenti.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            Nessuna risposta ancora
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageEvents;
