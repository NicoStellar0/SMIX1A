'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Trash2, Megaphone, Hash, Crown, Shield, GraduationCap, Loader2, User, BarChart2 } from 'lucide-react';

type Role = 'admin' | 'delegate' | 'sub-delegate' | 'student';

type Profile = {
  id: string;
  full_name: string;
  role: Role;
};

type Message = {
  id: string;
  content: string;
  channel: string;
  created_at: string;
  author_id: string;
  type?: string;
  metadata?: any;
  profiles: Profile;
};

type ChannelSetting = {
  channel: string;
  is_locked: boolean;
};

export default function ChatPage() {
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pollVotes, setPollVotes] = useState<Record<string, { id: string, message_id: string, option_index: number, user_id: string }[]>>({});
  
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profilesRef = useRef<Profile[]>([]);

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  useEffect(() => {
    // 1. Fetch current user profile and all profiles for DMs
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser(data);
      }
      const { data: allProfiles } = await supabase.from('profiles').select('*').order('full_name');
      if (allProfiles) setProfiles(allProfiles as Profile[]);
    };

    fetchUser();
  }, [supabase]);

  useEffect(() => {
    // 2. Fetch messages and channel settings
    const fetchData = async () => {
      setMessages([]); 
      setLoading(true);
      
      const { data: msgs, error: msgError } = await supabase
        .from('messages')
        .select('*, profiles(id, full_name, role)')
        .eq('channel', activeChannel)
        .order('created_at', { ascending: true });
        
      if (!msgError && msgs) {
        setMessages(msgs as unknown as Message[]);
        
        // Fetch votes for polls
        const pollIds = msgs.filter(m => m.type === 'poll').map(m => m.id);
        if (pollIds.length > 0) {
          const { data: votes } = await supabase.from('poll_votes').select('*').in('message_id', pollIds);
          if (votes) {
            const votesMap: any = {};
            votes.forEach(v => {
              if (!votesMap[v.message_id]) votesMap[v.message_id] = [];
              votesMap[v.message_id].push(v);
            });
            setPollVotes(votesMap);
          }
        }
      }

      const { data: settings } = await supabase
        .from('channel_settings')
        .select('is_locked')
        .eq('channel', activeChannel)
        .single();
        
      if (settings) setIsLocked(settings.is_locked);
      else setIsLocked(false);

      setLoading(false);
      scrollToBottom();
    };

    fetchData();

    // 3. Set up Realtime Subscription
    const channel = supabase.channel(`chat_${activeChannel}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel=eq.${activeChannel}` },
        async (payload) => {
          // Buscamos el perfil de forma síncrona en memoria para renderizado INMEDIATO (0ms delay)
          const authorProfile = profilesRef.current.find(p => p.id === payload.new.author_id) || { id: payload.new.author_id, full_name: 'Usuario', role: 'student' as Role };

          const newMessage = { ...payload.new, profiles: authorProfile } as Message;
          
          setMessages((prev) => {
            // Evitamos duplicados si el mensaje ya está por Optimistic UI
            const isOptimistic = prev.some(m => m.id.startsWith('temp_') && m.content === payload.new.content && m.author_id === payload.new.author_id);
            if (isOptimistic) {
              return prev.map(m => (m.id.startsWith('temp_') && m.content === payload.new.content && m.author_id === payload.new.author_id) ? newMessage : m);
            }
            return [...prev, newMessage];
          });
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `channel=eq.${activeChannel}` },
        (payload) => {
          setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'channel_settings', filter: `channel=eq.${activeChannel}` },
        (payload) => {
          setIsLocked(payload.new.is_locked);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_votes' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setPollVotes(prev => {
              const msgId = payload.new.message_id;
              const currentVotes = prev[msgId] || [];
              
              // Skip if we already have this vote from optimistic UI
              const alreadyExists = currentVotes.some(v => v.id === payload.new.id || (v.user_id === payload.new.user_id && v.option_index === payload.new.option_index));
              if(alreadyExists) return prev;

              return { 
                ...prev, 
                [msgId]: [...currentVotes.filter(v => v.user_id !== payload.new.user_id), payload.new] 
              };
            });
          } else if (payload.eventType === 'DELETE') {
            setPollVotes(prev => {
              const msgId = payload.old.message_id;
              const currentVotes = prev[msgId] || [];
              return { 
                ...prev, 
                [msgId]: currentVotes.filter(v => v.id !== payload.old.id) 
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannel, supabase]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser) return;

    const content = input.trim();
    setInput('');
    const isModerator = currentUser.role === 'admin' || currentUser.role === 'delegate' || currentUser.role === 'sub-delegate';

    // Slash Commands for Moderators
    if (content.startsWith('/') && isModerator) {
      if (content === '/clear') {
        if (confirm('¿Estás seguro de que quieres borrar TODOS los mensajes de este canal?')) {
          await supabase.from('messages').delete().eq('channel', activeChannel);
          setMessages([]); // Clear locally to be faster
        }
        return;
      }
      if (content === '/lock') {
        await supabase.from('channel_settings').update({ is_locked: true }).eq('channel', activeChannel);
        return;
      }
      if (content === '/unlock') {
        await supabase.from('channel_settings').update({ is_locked: false }).eq('channel', activeChannel);
        return;
      }
      if (content.startsWith('/poll ')) {
        // Format: /poll Pregunta? Opción1, Opción2, Opción3
        const match = content.match(/^\/poll\s+([^?]+(?:\?)?)\s+(.+)$/);
        if (match) {
          const question = match[1].trim();
          const options = match[2].split(',').map(s => s.trim()).filter(Boolean);
          if (options.length >= 2) {
            await supabase.from('messages').insert({
              content: question,
              type: 'poll',
              metadata: { options },
              channel: activeChannel,
              author_id: currentUser.id,
            });
            return;
          } else {
            alert('Una encuesta necesita al menos 2 opciones separadas por comas.');
            return;
          }
        } else {
          alert('Formato de encuesta inválido. Usa: /poll ¿Pregunta? Opcion 1, Opcion 2');
          return;
        }
      }
    }

    // Optimistic UI update for immediate feedback
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content,
      channel: activeChannel,
      author_id: currentUser.id,
      created_at: new Date().toISOString(),
      profiles: currentUser
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    await supabase.from('messages').insert({
      content,
      channel: activeChannel,
      author_id: currentUser.id,
    });
  };

  const handleVote = async (messageId: string, optionIndex: number) => {
    if (!currentUser) return;

    // Optimistic UI para Votos (0ms de retraso visual)
    setPollVotes(prev => {
      const currentVotes = prev[messageId] || [];
      const tempVote = { id: `temp_${Date.now()}`, message_id: messageId, user_id: currentUser.id, option_index: optionIndex };
      return {
        ...prev,
        [messageId]: [...currentVotes.filter(v => v.user_id !== currentUser.id), tempVote]
      };
    });

    await supabase.from('poll_votes').upsert({
      message_id: messageId,
      user_id: currentUser.id,
      option_index: optionIndex
    }, { onConflict: 'message_id,user_id' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar este mensaje?')) return;

    // Optimistic UI para Borrado (desaparece al instante)
    setMessages(prev => prev.filter(msg => msg.id !== id));

    await supabase.from('messages').delete().eq('id', id);
  };

  const isModerator = currentUser?.role === 'admin' || currentUser?.role === 'delegate' || currentUser?.role === 'sub-delegate';
  
  const isDM = activeChannel.startsWith('dm_');

  const canWrite = 
    isModerator || // Moderators can always write
    (activeChannel === 'general' && !isLocked) ||
    isDM; // Can write in DMs

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderRichText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>;
          if (part.startsWith('*') && part.endsWith('*')) return <em key={j}>{part.slice(1, -1)}</em>;
          if (part.startsWith('`') && part.endsWith('`')) return <code key={j} className="bg-black/30 px-1 py-0.5 rounded text-indigo-300 font-mono text-xs">{part.slice(1, -1)}</code>;
          return part;
        })}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const getChannelName = () => {
    if (activeChannel === 'general') return 'Chat General';
    if (activeChannel === 'announcements') return 'Anuncios';
    if (isDM) {
      const otherUserId = activeChannel.replace('dm_', '').replace(currentUser?.id || '', '').replace('_', '');
      const otherUser = profiles.find(p => p.id === otherUserId);
      return `MD: ${otherUser?.full_name || 'Usuario'}`;
    }
    return activeChannel;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen bg-slate-950 p-6 gap-6 text-white overflow-hidden">
      
      {/* Channels Sidebar */}
      <div className="w-64 bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-xl flex flex-col gap-2 overflow-y-auto">
        <h2 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Canales</h2>
        
        <button 
          onClick={() => setActiveChannel('general')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeChannel === 'general' ? 'bg-indigo-500/20 text-indigo-300 shadow-inner' : 'hover:bg-white/5 text-slate-400'}`}
        >
          <Hash size={18} />
          <span className="font-medium">General</span>
        </button>
        
        <button 
          onClick={() => setActiveChannel('announcements')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeChannel === 'announcements' ? 'bg-fuchsia-500/20 text-fuchsia-300 shadow-inner' : 'hover:bg-white/5 text-slate-400'}`}
        >
          <Megaphone size={18} />
          <span className="font-medium">Anuncios</span>
        </button>

        <h2 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">Mensajes Directos</h2>
        {profiles.filter(p => p.id !== currentUser?.id).map(p => {
          const dmId = `dm_${[currentUser?.id || '', p.id].sort().join('_')}`;
          return (
            <button 
              key={p.id}
              onClick={() => setActiveChannel(dmId)}
              className={`flex items-center gap-3 px-4 py-2 rounded-2xl transition-all ${activeChannel === dmId ? 'bg-cyan-500/20 text-cyan-300 shadow-inner' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <User size={12} className="text-slate-400" />
              </div>
              <span className="font-medium text-sm truncate">{p.full_name}</span>
            </button>
          )
        })}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="h-16 border-b border-white/10 flex items-center px-6 gap-3 shrink-0">
          {activeChannel === 'general' ? <Hash className="text-indigo-400" /> : 
           activeChannel === 'announcements' ? <Megaphone className="text-fuchsia-400" /> :
           <User className="text-cyan-400" />}
          <h2 className="text-xl font-bold">{getChannelName()}</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 gap-3">
              <Loader2 className="animate-spin" /> Cargando mensajes...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              No hay mensajes aquí todavía. ¡Sé el primero!
            </div>
          ) : (
            messages.map((msg) => {
              const isAdminOrDelegate = msg.profiles?.role === 'admin' || msg.profiles?.role === 'delegate' || msg.profiles?.role === 'sub-delegate';
              const isMe = msg.author_id === currentUser?.id;

              if (activeChannel === 'announcements') {
                return (
                  <div key={msg.id} className="relative group bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 border border-fuchsia-500/20 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-lg">
                        <Megaphone size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-lg text-white">{msg.profiles?.full_name || 'Admin'}</div>
                        <div className="text-xs text-fuchsia-400 uppercase tracking-widest font-bold">Anuncio Oficial</div>
                      </div>
                      
                      {isModerator && (
                        <button onClick={() => handleDelete(msg.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-2 bg-black/20 rounded-xl">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <p className="text-slate-200 text-lg leading-relaxed">{renderRichText(msg.content)}</p>
                    <div className="mt-4 text-xs flex justify-between items-center opacity-75 font-medium">
                      <span className="text-slate-500">{new Date(msg.created_at).toLocaleDateString()}</span>
                      <span className="text-fuchsia-400">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`group flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar / Badge */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    msg.profiles?.role === 'admin' ? 'bg-gradient-to-tr from-amber-500 to-orange-500' :
                    msg.profiles?.role === 'delegate' ? 'bg-gradient-to-tr from-emerald-500 to-teal-500' :
                    'bg-slate-800'
                  }`}>
                    {msg.profiles?.role === 'admin' ? <Crown size={20} className="text-white" /> :
                     msg.profiles?.role === 'delegate' ? <Shield size={20} className="text-white" /> :
                     <GraduationCap size={20} className="text-slate-400" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 px-1">
                      <span className="font-bold text-sm text-slate-300">{msg.profiles?.full_name || 'Usuario Desconocido'}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        {msg.profiles?.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 group-hover:gap-4 transition-all">
                      {isMe && isModerator && (
                        <button onClick={() => handleDelete(msg.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1">
                          <Trash2 size={16} />
                        </button>
                      )}

                      <div className={`px-5 py-3 rounded-3xl text-sm ${
                        isAdminOrDelegate 
                          ? 'bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 border border-indigo-500/30 text-white' 
                          : 'bg-slate-800/50 border border-slate-700/50 text-slate-200'
                      } ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${msg.type === 'poll' ? 'w-64' : ''}`}>
                        
                        {msg.type === 'poll' ? (
                          <div className="flex flex-col gap-3">
                            <div className="font-bold text-base flex items-center gap-2">
                              <BarChart2 className={isAdminOrDelegate ? 'text-fuchsia-400' : 'text-slate-400'} size={18} />
                              {msg.content}
                            </div>
                            <div className="flex flex-col gap-2 mt-1">
                              {msg.metadata?.options?.map((opt: string, idx: number) => {
                                const votesForOption = pollVotes[msg.id]?.filter(v => v.option_index === idx).length || 0;
                                const totalVotes = pollVotes[msg.id]?.length || 0;
                                const percentage = totalVotes === 0 ? 0 : Math.round((votesForOption / totalVotes) * 100);
                                const hasVotedThis = pollVotes[msg.id]?.some(v => v.user_id === currentUser?.id && v.option_index === idx);
                                
                                const voters = pollVotes[msg.id]?.filter(v => v.option_index === idx).map(v => {
                                  const p = profilesRef.current.find(pr => pr.id === v.user_id);
                                  return p?.full_name?.split(' ')[0] || 'Alguien';
                                }) || [];

                                return (
                                  <div key={idx}>
                                    <button
                                      onClick={() => handleVote(msg.id, idx)}
                                      className={`relative overflow-hidden w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                        hasVotedThis 
                                          ? 'border-indigo-400/50 bg-indigo-500/20 text-white' 
                                          : 'border-white/10 bg-black/20 text-slate-300 hover:bg-white/10'
                                      }`}
                                    >
                                      <div 
                                        className="absolute left-0 top-0 bottom-0 bg-indigo-500/20 transition-all duration-500" 
                                        style={{ width: `${percentage}%` }}
                                      />
                                      <div className="relative flex justify-between">
                                        <span>{opt}</span>
                                        <span>{votesForOption} ({percentage}%)</span>
                                      </div>
                                    </button>
                                    {voters.length > 0 && (
                                      <div className="text-[10px] text-slate-500 mt-1 pl-2 mb-2 font-medium">
                                        Votaron: <span className="text-slate-400">{voters.join(', ')}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="text-[10px] text-slate-500 flex justify-between mt-1 items-center">
                              <span>Total votos: {pollVotes[msg.id]?.length || 0}</span>
                              <span className="opacity-50">{formatTime(msg.created_at)}</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {renderRichText(msg.content)}
                            <div className={`text-[10px] mt-1 text-right font-medium opacity-50 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {formatTime(msg.created_at)}
                            </div>
                          </div>
                        )}

                      </div>

                      {!isMe && isModerator && (
                        <button onClick={() => handleDelete(msg.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/20 border-t border-white/5 shrink-0">
          {isLocked && !isModerator && (
            <div className="mb-3 text-center text-rose-400 font-bold bg-rose-500/10 py-2 rounded-xl border border-rose-500/20 shadow-inner">
              🔒 Este canal ha sido bloqueado por un Administrador.
            </div>
          )}
          {canWrite ? (
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isModerator ? `Mensaje #${activeChannel}... (Usa /poll Pregunta? Op 1, Op 2)` : `Mensaje #${activeChannel}...`}
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-2xl py-4 pl-6 pr-14 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              />
              <button 
                type="submit" 
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </form>
          ) : (
            <div className="py-4 text-center text-slate-500 font-medium bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
              No tienes permiso para escribir en este canal.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
