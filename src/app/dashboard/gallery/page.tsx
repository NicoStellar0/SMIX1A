'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Library, File, ImageIcon, Loader2 } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
};

export default function GalleryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTasks(data as unknown as Task[]);
      }
      setLoading(false);
    };

    fetchTasks();
  }, [supabase]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Library size={24} className="text-white" />
          </div>
          Task Gallery
        </h1>
        <p className="text-slate-400 text-lg">Browse and study from documents and pictures uploaded by your colleagues.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32 text-slate-500 gap-3">
          <Loader2 className="animate-spin" /> Loading gallery...
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 backdrop-blur-xl">
          <Library size={48} className="mb-4 opacity-50 text-cyan-500" />
          <p className="text-2xl font-bold text-white mb-2">No tasks found.</p>
          <p>Be the first to upload a document or picture to help your class!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
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
              </div>
              
              <div className="p-6">
                <h3 className="font-bold text-xl text-white mb-1 truncate" title={task.title}>{task.title}</h3>
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
