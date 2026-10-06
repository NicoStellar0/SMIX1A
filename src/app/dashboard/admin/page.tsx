'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, BrainCircuit, Plus, Loader2, CheckCircle2, Users, ShieldAlert, BarChart3, TrendingUp, MessageSquare, UploadCloud } from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'memory_card' | 'mind_map' | 'users' | 'analytics'>('memory_card');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [mindMapUrl, setMindMapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Analytics State
  const [stats, setStats] = useState({ totalTasks: 0, totalMessages: 0, totalMaterials: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    setLoadingStats(true);
    const [{ count: tasksCount }, { count: messagesCount }, { count: materialsCount }] = await Promise.all([
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('study_materials').select('*', { count: 'exact', head: true }),
    ]);
    
    setStats({
      totalTasks: tasksCount || 0,
      totalMessages: messagesCount || 0,
      totalMaterials: materialsCount || 0
    });
    setLoadingStats(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoadingUsers(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } else {
      alert('Error updating role: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const content = activeTab === 'memory_card' 
      ? { question, answer } 
      : { url: mindMapUrl };

    const { error } = await supabase.from('study_materials').insert({
      title,
      type: activeTab,
      content,
      author_id: user.id
    });

    setLoading(false);

    if (!error) {
      setSuccess(true);
      setTitle('');
      setQuestion('');
      setAnswer('');
      setMindMapUrl('');
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert('Error saving material: ' + error.message);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 tracking-tight mb-2">
          Estudio de Admin
        </h1>
        <p className="text-slate-400">Publica materiales de estudio para que tus estudiantes puedan acceder.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('memory_card')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${
              activeTab === 'memory_card' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <BookOpen size={18} />
            Tarjeta de Memoria
          </button>
          <button
            onClick={() => setActiveTab('mind_map')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${
              activeTab === 'mind_map' ? 'bg-fuchsia-500/10 text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <BrainCircuit size={18} />
            Mapa Mental
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${
              activeTab === 'users' ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <Users size={18} />
            Gestionar Usuarios
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <BarChart3 size={18} />
            Analíticas
          </button>
        </div>

        {/* Form / Content */}
        <div className="p-8">
          {activeTab === 'analytics' ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><TrendingUp className="text-emerald-400" /> Actividad de la Plataforma</h2>
              {loadingStats ? (
                <div className="flex justify-center py-12 text-slate-500"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:border-cyan-500/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center"><UploadCloud size={24} /></div>
                    <div>
                      <div className="text-3xl font-bold text-white">{stats.totalTasks}</div>
                      <div className="text-slate-400 text-sm font-bold uppercase tracking-wider">Tareas Subidas</div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:border-indigo-500/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center"><MessageSquare size={24} /></div>
                    <div>
                      <div className="text-3xl font-bold text-white">{stats.totalMessages}</div>
                      <div className="text-slate-400 text-sm font-bold uppercase tracking-wider">Mensajes Enviados</div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:border-fuchsia-500/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center"><BookOpen size={24} /></div>
                    <div>
                      <div className="text-3xl font-bold text-white">{stats.totalMaterials}</div>
                      <div className="text-slate-400 text-sm font-bold uppercase tracking-wider">Materiales de Estudio</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'users' ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <ShieldAlert size={24} className="shrink-0" />
                <p className="text-sm font-medium">Cambiar el rol de un usuario le otorga acceso inmediato a áreas restringidas. ¡Ten cuidado a quién promueves!</p>
              </div>
              
              {loadingUsers ? (
                <div className="flex justify-center py-12 text-slate-500"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Rol Actual</th>
                        <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Cambiar Rol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="py-4 font-bold text-white">{u.full_name}</td>
                          <td className="py-4 text-slate-400 text-sm">{u.email}</td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' :
                              u.role === 'delegate' ? 'bg-emerald-500/20 text-emerald-400' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <select 
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                            >
                              <option value="student">Estudiante</option>
                              <option value="sub-delegate">Sub-Delegado</option>
                              <option value="delegate">Delegado</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Título / Tema</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Ej. Capítulo 1: Conceptos Básicos"
              />
            </div>

            {activeTab === 'memory_card' ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pregunta</label>
                  <textarea 
                    required
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px]"
                    placeholder="¿Cuál es el puerto HTTP por defecto?"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Respuesta</label>
                  <textarea 
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px]"
                    placeholder="El puerto 80."
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">URL de la Imagen del Mapa Mental</label>
                <input 
                  type="url" 
                  required
                  value={mindMapUrl}
                  onChange={(e) => setMindMapUrl(e.target.value)}
                  className="bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all"
                  placeholder="https://ejemplo.com/mapa.png"
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className={`mt-4 w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
                success ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-orange-500/20'
              }`}
            >
              {loading ? (
                <><Loader2 className="animate-spin" /> Publicando...</>
              ) : success ? (
                <><CheckCircle2 /> ¡Material Publicado!</>
              ) : (
                <><Plus size={20} /> Publicar Material</>
              )}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
