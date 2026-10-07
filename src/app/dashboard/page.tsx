'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, BookOpen, AlertCircle, TrendingUp, Sparkles, Plus, Loader2, Trash2 } from 'lucide-react';

type Event = {
  id: string;
  title: string;
  date: string;
  type: 'exam' | 'deadline' | 'holiday';
};

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTimeStart, setNewEventTimeStart] = useState('');
  const [newEventTimeEnd, setNewEventTimeEnd] = useState('');
  const [newEventType, setNewEventType] = useState<'exam' | 'deadline' | 'holiday'>('exam');
  
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) setUserRole(profile.role);
      }

      const { data: eventData } = await supabase.from('calendar_events').select('*').order('date', { ascending: true });
      if (eventData) setEvents(eventData as Event[]);
      
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let finalTitle = newEventTitle;
    if (newEventTimeStart && newEventTimeEnd) {
      finalTitle = `${newEventTitle} ||| ${newEventTimeStart} - ${newEventTimeEnd}`;
    } else if (newEventTimeStart) {
      finalTitle = `${newEventTitle} ||| ${newEventTimeStart}`;
    }

    const newEvent = { title: finalTitle, date: newEventDate, type: newEventType, author_id: user.id };
    
    const { data, error } = await supabase.from('calendar_events').insert(newEvent).select().single();
    if (data) {
      setEvents(prev => [...prev, data as Event].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setShowAddEvent(false);
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventTimeStart('');
      setNewEventTimeEnd('');
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Delete this event?')) return;
    await supabase.from('calendar_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const isModerator = userRole === 'admin' || userRole === 'delegate' || userRole === 'sub-delegate';
  
  // Get upcoming events (future or today)
  const today = new Date();
  today.setHours(0,0,0,0);
  const upcomingEvents = events.filter(e => new Date(e.date) >= today);

  const calculateDaysLeft = (dateString: string) => {
    const eventDate = new Date(dateString);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-fuchsia-400 flex items-center gap-3">
          <Sparkles className="text-indigo-400" /> Resumen SMIX
        </h1>
        <p className="mt-2 text-slate-400 text-lg">Mantente actualizado con el horario de tu clase y actividades recientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Calendar & Deadlines */}
        <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-fuchsia-400" /> Próximos Eventos
            </h2>
            {isModerator && (
              <button onClick={() => setShowAddEvent(!showAddEvent)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-all">
                <Plus size={20} />
              </button>
            )}
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            {showAddEvent && isModerator && (
              <form onSubmit={handleAddEvent} className="mb-6 p-4 bg-black/30 border border-white/5 rounded-2xl space-y-4">
                <input type="text" placeholder="Título del Evento" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-2 px-3 outline-none" />
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-2 px-3 outline-none" />
                    <select value={newEventType} onChange={e => setNewEventType(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-2 px-3 outline-none">
                      <option value="exam">Examen</option>
                      <option value="deadline">Entrega</option>
                      <option value="holiday">Festivo</option>
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <span className="absolute -top-2 left-3 bg-[#111827] text-[10px] px-1 text-slate-400 font-bold uppercase tracking-wider rounded">Inicio (Opc.)</span>
                      <input type="time" value={newEventTimeStart} onChange={e => setNewEventTimeStart(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-2 px-3 outline-none mt-1" />
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute -top-2 left-3 bg-[#111827] text-[10px] px-1 text-slate-400 font-bold uppercase tracking-wider rounded">Fin (Opc.)</span>
                      <input type="time" value={newEventTimeEnd} onChange={e => setNewEventTimeEnd(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-2 px-3 outline-none mt-1" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-fuchsia-500 hover:bg-fuchsia-400 text-white rounded-xl font-bold transition-all">Añadir Evento</button>
              </form>
            )}

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-500" /></div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Calendar size={48} className="mx-auto mb-4 opacity-50 text-fuchsia-500" />
                ¡No hay próximos eventos! ¡Estás libre!
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map(event => {
                  const daysLeft = calculateDaysLeft(event.date);
                  const parts = event.title.split('|||');
                  const mainTitle = parts[0].trim();
                  const timeRange = parts[1] ? parts[1].trim() : null;

                  return (
                    <div key={event.id} className="relative group bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shrink-0 ${
                          event.type === 'exam' ? 'bg-rose-500/20 text-rose-400' :
                          event.type === 'deadline' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {new Date(event.date).getDate()}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg leading-tight">{mainTitle}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">
                              {event.type}
                            </p>
                            {timeRange && (
                              <span className="bg-black/30 border border-white/5 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 flex items-center gap-1 shadow-inner">
                                <Clock size={10} className="text-indigo-400" /> {timeRange}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`text-right ${daysLeft <= 3 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                          {daysLeft === 0 ? '¡Hoy!' : daysLeft === 1 ? 'Mañana' : `En ${daysLeft} días`}
                        </div>
                        {isModerator && (
                          <button onClick={() => handleDelete(event.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 transition-all bg-black/20 rounded-xl">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Motivational / Tips Widget */}
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-indigo-400" /> Motivación Diaria
            </h2>
            <p className="text-slate-300 text-lg italic leading-relaxed">
              "El éxito es la suma de pequeños esfuerzos repetidos día tras día. ¡Sigue esforzándote para conseguir tus metas en SMIX!"
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="text-amber-400" /> Actividad Reciente
            </h2>
            <p className="text-slate-400">
              Revisa la <a href="/dashboard/gallery" className="text-indigo-400 font-bold hover:underline">Galería de Tareas</a> para ver las últimas subidas de tus compañeros, y revisa los <a href="/dashboard/chat" className="text-indigo-400 font-bold hover:underline">Anuncios</a> para nueva información de los delegados.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
