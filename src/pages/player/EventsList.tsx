import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, XCircle, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlayerTeam } from "@/hooks/usePlayerTeam";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type EventType = 'allenamento' | 'partita' | 'evento';
type AttendanceStatus = 'presente' | 'assente';

interface Event {
  id: string;
  event_type: EventType;
  details: string | null;
  event_date: string;
  event_time: string;
  location_name: string | null;
  location_address: string | null;
  is_active: boolean;
}

interface AttendanceRecord {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  profiles: { name: string } | null;
}

const EventsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { teamId } = usePlayerTeam();
  const { user } = useAuth();
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const { data: events, isLoading } = useQuery({
    queryKey: ['player-events', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!teamId
  });

  const { data: myAttendance } = useQuery({
    queryKey: ['my-attendance', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const { data, error } = await supabase
        .from('event_attendance')
        .select('id, event_id, user_id, status')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const attendanceMap: Record<string, AttendanceStatus> = {};
      (data || []).forEach((att) => {
        attendanceMap[att.event_id] = att.status as AttendanceStatus;
      });
      
      return attendanceMap;
    },
    enabled: !!user?.id
  });

  const { data: allAttendance } = useQuery({
    queryKey: ['all-event-attendance', teamId],
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

  const voteMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: AttendanceStatus }) => {
      if (!user?.id) throw new Error('Utente non autenticato');
      
      const { data: existing } = await supabase
        .from('event_attendance')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('event_attendance')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_attendance')
          .insert({
            event_id: eventId,
            user_id: user.id,
            status
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['all-event-attendance'] });
      toast({ title: "Risposta registrata" });
    },
    onError: (error) => {
      toast({ 
        title: "Errore", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

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
          <Button variant="ghost" size="icon" onClick={() => navigate('/player')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Sondaggi Presenze</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Caricamento...</div>
        ) : events?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nessun evento in programma
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events?.map((event) => {
              const currentStatus = myAttendance?.[event.id];
              const attendance = allAttendance?.[event.id] || [];
              const presenti = attendance.filter(a => a.status === 'presente');
              const assenti = attendance.filter(a => a.status === 'assente');
              const isExpanded = expandedEvents[event.id];
              
              return (
                <Card key={event.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                        {getEventTypeLabel(event.event_type)}
                      </Badge>
                      {currentStatus && (
                        <Badge 
                          variant={currentStatus === 'presente' ? 'default' : 'secondary'}
                          className={currentStatus === 'presente' ? 'bg-green-500' : 'bg-red-500'}
                        >
                          {currentStatus === 'presente' ? 'Presente' : 'Assente'}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">
                      {format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: it })}
                    </CardTitle>
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
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant={currentStatus === 'presente' ? 'default' : 'outline'}
                        className={currentStatus === 'presente' ? 'bg-green-500 hover:bg-green-600' : ''}
                        onClick={() => voteMutation.mutate({ eventId: event.id, status: 'presente' })}
                        disabled={voteMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Presente
                      </Button>
                      <Button
                        variant={currentStatus === 'assente' ? 'default' : 'outline'}
                        className={currentStatus === 'assente' ? 'bg-red-500 hover:bg-red-600' : ''}
                        onClick={() => voteMutation.mutate({ eventId: event.id, status: 'assente' })}
                        disabled={voteMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Assente
                      </Button>
                    </div>

                    {/* Attendance Summary */}
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(event.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between mt-2 border border-border">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium text-green-500">{presenti.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-red-500" />
                              <span className="text-sm font-medium text-red-500">{assenti.length}</span>
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

export default EventsList;
