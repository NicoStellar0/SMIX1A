'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Library, File, ImageIcon, Loader2, Heart, Filter } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  subject: string;
  created_at: string;
  upvotes: number;
  profiles: {
    full_name: string;
  };
};

export default function GalleryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: upvoteData } = await supabase.from('task_upvotes').select('task_id').eq('user_id', user.id);
        if (upvoteData) {
          setUserUpvotes(new Set(upvoteData.map(u => u.task_id)));
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTasks(data as unknown as Task[]);
      }
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const handleUpvote = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;

    const hasUpvoted = userUpvotes.has(taskId);

    if (hasUpvoted) {
      // Remove upvote
      await supabase.from('task_upvotes').delete().eq('task_id', taskId).eq('user_id', currentUserId);
      setUserUpvotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, upvotes: (t.upvotes || 0) - 1 } : t));
    } else {
      // Add upvote
      await supabase.from('task_upvotes').insert({ task_id: taskId, user_id: currentUserId });
      setUserUpvotes(prev => new Set(prev).add(taskId));
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, upvotes: (t.upvotes || 0) + 1 } : t));
    }
  };

  const filteredTasks = selectedSubject === 'All' ? tasks : tasks.filter(t => t.subject === selectedSubject);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Library size={24} className="text-white" />
          </div>
          Task Gallery
        </h1>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <p className="text-slate-400 text-lg">Browse and study from documents and pictures uploaded by your colleagues.</p>
          <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-700">
            <Filter size={18} className="text-cyan-400 ml-2" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-transparent text-white outline-none appearance-none cursor-pointer pr-4 font-bold"
            >
              <option value="All">All Subjects</option>
              <option value="General">General</option>
              <option value="Networks">Networks</option>
              <option value="Operating Systems">Operating Systems</option>
              <option value="Hardware">Hardware</option>
              <option value="Web Apps">Web Apps</option>
              <option value="Databases">Databases</option>
              <option value="Office Apps">Office Apps</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32 text-slate-500 gap-3">
          <Loader2 className="animate-spin" /> Loading gallery...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 backdrop-blur-xl">
          <Library size={48} className="mb-4 opacity-50 text-cyan-500" />
          <p className="text-2xl font-bold text-white mb-2">No tasks found for {selectedSubject}.</p>
          <p>Be the first to upload a document!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-cyan-500/50 transition-all group shadow-xl">
              <div className="h-48 bg-black/50 relative flex items-center justify-center border-b border-white/10 overflow-hidden">
                {task.file_type === 'image' ? (
                  <img src={task.file_url} alt={task.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500" />
                ) : (
                  <File size={64} className="text-slate-600 group-hover:text-cyan-500 group-hover:scale-110 transition-all duration-500" />
                )}
                
                {/* Hover overlay button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <a href={task.file_url} target="_blank" rel="noopener noreferrer" className="bg-cyan-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                    Open File
                  </a>
                </div>
                
                {/* Subject Tag */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                  {task.subject || 'General'}
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h3 className="font-bold text-xl text-white truncate" title={task.title}>{task.title}</h3>
                  <button 
                    onClick={(e) => handleUpvote(task.id, e)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all border ${
                      userUpvotes.has(task.id) 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Heart size={16} className={userUpvotes.has(task.id) ? 'fill-rose-400' : ''} />
                    {task.upvotes || 0}
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400 mt-4">
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                      {task.profiles?.full_name?.charAt(0) || '?'}
                    </div>
                    {task.profiles?.full_name?.split(' ')[0] || 'Student'}
                  </span>
                  <span>{new Date(task.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
