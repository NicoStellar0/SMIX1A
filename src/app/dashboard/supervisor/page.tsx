'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, File, ImageIcon, Loader2, Trash2 } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
};

export default function SupervisorPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTasks(data as unknown as Task[]);
      }
      setLoading(false);
    };

    fetchTasks();
  }, [supabase]);

  const handleDelete = async (id: string, file_url: string) => {
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;
    
    // Attempt to extract the file path from the public URL to delete it from storage
    try {
      const urlObj = new URL(file_url);
      const parts = urlObj.pathname.split('/');
      // The path usually looks like /storage/v1/object/public/tasks/uploads/filename.ext
      // We just need 'uploads/filename.ext'
      const uploadsIndex = parts.indexOf('uploads');
      if (uploadsIndex !== -1) {
        const filePath = parts.slice(uploadsIndex).join('/');
        await supabase.storage.from('tasks').remove([filePath]);
      }
    } catch (e) {
      console.error("Failed to parse and delete storage object", e);
    }

    // Delete from database
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-2 flex items-center gap-3">
            <Eye className="text-emerald-400" /> Supervisor Panel
          </h1>
          <p className="text-slate-400 text-lg">Review and manage tasks uploaded by students.</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl">
          <span className="text-emerald-400 font-bold text-xl">{tasks.length}</span>
          <span className="text-slate-400 ml-2 uppercase text-xs tracking-wider font-bold">Total Uploads</span>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-slate-500 gap-3">
            <Loader2 className="animate-spin" /> Loading uploaded tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <File size={48} className="mb-4 opacity-50" />
            <p className="text-xl font-bold text-white mb-2">No tasks uploaded yet.</p>
            <p>When students submit their work, it will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/20 border-b border-white/10">
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Task Description</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-6">
                      <div className="font-bold text-white text-base">{task.profiles?.full_name || 'Unknown Student'}</div>
                      <div className="text-sm text-slate-500">{task.profiles?.email}</div>
                    </td>
                    <td className="p-6">
                      <div className="text-slate-300 font-medium">{task.title}</div>
                    </td>
                    <td className="p-6">
                      <div className="text-sm text-slate-400">
                        {new Date(task.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-6 text-right space-x-2">
                      <a 
                        href={task.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all font-bold text-sm"
                      >
                        {task.file_type === 'image' ? <ImageIcon size={16} /> : <File size={16} />}
                        View
                      </a>
                      <button 
                        onClick={() => handleDelete(task.id, task.file_url)}
                        className="inline-flex items-center justify-center p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                        title="Delete Task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
