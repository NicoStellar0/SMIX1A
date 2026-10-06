'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Trash2, Megaphone, Hash, Crown, Shield, GraduationCap, Loader2, User } from 'lucide-react';

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
  
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          // Fetch the profile for the new message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', payload.new.author_id)
            .single();

          const newMessage = { ...payload.new, profiles: profileData } as Message;
          setMessages((prev) => [...prev, newMessage]);
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
        if (confirm('Are you sure you want to clear ALL messages in this channel?')) {
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
    }

    await supabase.from('messages').insert({
      content,
      channel: activeChannel,
      author_id: currentUser.id,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await supabase.from('messages').delete().eq('id', id);
  };

  const isModerator = currentUser?.role === 'admin' || currentUser?.role === 'delegate' || currentUser?.role === 'sub-delegate';
  
  const isDM = activeChannel.startsWith('dm_');

  const canWrite = 
    isModerator || // Moderators can always write
    (activeChannel === 'general' && !isLocked) ||
    isDM; // Can write in DMs

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
    if (activeChannel === 'general') return 'General Chat';
    if (activeChannel === 'announcements') return 'Announcements';
    if (isDM) {
      const otherUserId = activeChannel.replace('dm_', '').replace(currentUser?.id || '', '').replace('_', '');
      const otherUser = profiles.find(p => p.id === otherUserId);
      return `DM: ${otherUser?.full_name || 'User'}`;
    }
    return activeChannel;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen bg-slate-950 p-6 gap-6 text-white overflow-hidden">
      
      {/* Channels Sidebar */}
      <div className="w-64 bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-xl flex flex-col gap-2 overflow-y-auto">
        <h2 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Channels</h2>
        
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
          <span className="font-medium">Announcements</span>
        </button>

        <h2 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">Direct Messages</h2>
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
              <Loader2 className="animate-spin" /> Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              No messages here yet. Be the first!
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
                        <div className="text-xs text-fuchsia-400 uppercase tracking-widest font-bold">Official Announcement</div>
                      </div>
                      
                      {isModerator && (
                        <button onClick={() => handleDelete(msg.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-2 bg-black/20 rounded-xl">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <p className="text-slate-200 text-lg leading-relaxed">{renderRichText(msg.content)}</p>
                    <div className="mt-4 text-xs text-slate-500 font-medium">
                      {new Date(msg.created_at).toLocaleString()}
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
                      <span className="font-bold text-sm text-slate-300">{msg.profiles?.full_name || 'Unknown User'}</span>
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
                      } ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                        {renderRichText(msg.content)}
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
              🔒 This channel is currently locked by an Admin.
            </div>
          )}
          {canWrite ? (
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isModerator ? `Message #${activeChannel}... (Try /clear, /lock, /unlock)` : `Message #${activeChannel}...`}
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
              You do not have permission to write in this channel.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
