'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, BrainCircuit, Loader2, Sparkles, ChevronRight, Trash2 } from 'lucide-react';

type Material = {
  id: string;
  title: string;
  type: 'memory_card' | 'mind_map';
  content: any;
  created_at: string;
};

export default function StudyPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Get role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) setUserRole(profile.role);
      }

      // Get materials
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMaterials(data as Material[]);
      }
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const toggleFlip = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this study material?')) return;
    await supabase.from('study_materials').delete().eq('id', id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const isModerator = userRole === 'admin' || userRole === 'delegate' || userRole === 'sub-delegate';
  
  const memoryCards = materials.filter(m => m.type === 'memory_card');
  const mindMaps = materials.filter(m => m.type === 'mind_map');

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight mb-2 flex items-center gap-3">
          <Sparkles className="text-indigo-400" /> Sección de Estudio
        </h1>
        <p className="text-slate-400 text-lg">Domina tus asignaturas con Tarjetas de Memoria interactivas y Mapas Mentales.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
          <Loader2 className="animate-spin" /> Cargando materiales...
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-xl">
          <BookOpen className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">No hay materiales todavía</h3>
          <p className="text-slate-400">El Administrador no ha publicado ningún material de estudio aún. ¡Vuelve más tarde!</p>
        </div>
      ) : (
        <>
          {/* Memory Cards Section */}
          {memoryCards.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 text-2xl font-bold text-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                  <BookOpen size={20} />
                </div>
                Tarjetas de Memoria
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {memoryCards.map((card) => {
                  const isFlipped = flippedCards[card.id];
                  
                  return (
                    <div 
                      key={card.id}
                      onClick={() => toggleFlip(card.id)}
                      className="group relative h-64 w-full perspective-1000 cursor-pointer"
                    >
                      <div className={`w-full h-full transition-all duration-500 preserve-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
                        
                        {/* Front (Question) */}
                        <div className="absolute inset-0 backface-hidden bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:bg-white/10 transition-colors shadow-xl">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4 flex justify-between">
                              <span>Pregunta</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 truncate max-w-[120px]">{card.title}</span>
                                {isModerator && (
                                  <button onClick={(e) => handleDelete(card.id, e)} className="text-slate-600 hover:text-rose-400 p-1 bg-black/20 rounded-lg transition-colors z-10 relative">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <h3 className="text-xl font-medium text-white">{card.content.question}</h3>
                          </div>
                          <div className="text-sm text-slate-500 flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
                            Click para revelar respuesta <ChevronRight size={16} />
                          </div>
                        </div>

                        {/* Back (Answer) */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-indigo-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 mb-4">
                              Respuesta
                            </div>
                            <h3 className="text-xl font-medium text-white leading-relaxed">{card.content.answer}</h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Mind Maps Section */}
          {mindMaps.length > 0 && (
            <section className="space-y-6 pt-8 border-t border-white/10">
              <div className="flex items-center gap-3 text-2xl font-bold text-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-lg">
                  <BrainCircuit size={20} />
                </div>
                Mapas Mentales
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {mindMaps.map((map) => (
                  <div key={map.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl hover:border-fuchsia-500/30 transition-colors group">
                    <div className="h-48 bg-black/50 relative overflow-hidden flex items-center justify-center border-b border-white/10">
                      {map.content.url ? (
                        <img 
                          src={map.content.url} 
                          alt={map.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <BrainCircuit size={48} className="text-slate-700" />
                      )}
                    </div>
                    <div className="p-6 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white truncate max-w-[50%]">{map.title}</h3>
                      <div className="flex items-center gap-2">
                        {isModerator && (
                          <button onClick={(e) => handleDelete(map.id, e)} className="px-3 py-2 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-colors" title="Delete Mind Map">
                            <Trash2 size={16} />
                          </button>
                        )}
                        <a 
                          href={map.content.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-fuchsia-500/20 text-fuchsia-300 rounded-xl text-sm font-bold hover:bg-fuchsia-500/30 transition-colors"
                        >
                          Ver Mapa
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
