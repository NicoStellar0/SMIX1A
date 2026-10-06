'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, BrainCircuit, Plus, Loader2, CheckCircle2 } from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'memory_card' | 'mind_map'>('memory_card');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [mindMapUrl, setMindMapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

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
          Admin Studio
        </h1>
        <p className="text-slate-400">Publish study materials for your students to access.</p>
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
            Memory Card
          </button>
          <button
            onClick={() => setActiveTab('mind_map')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${
              activeTab === 'mind_map' ? 'bg-fuchsia-500/10 text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <BrainCircuit size={18} />
            Mind Map
          </button>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Title / Topic</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="e.g. Chapter 1: Anatomy Basics"
              />
            </div>

            {activeTab === 'memory_card' ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Question</label>
                  <textarea 
                    required
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px]"
                    placeholder="What is the powerhouse of the cell?"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Answer</label>
                  <textarea 
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px]"
                    placeholder="Mitochondria."
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Mind Map Image URL</label>
                <input 
                  type="url" 
                  required
                  value={mindMapUrl}
                  onChange={(e) => setMindMapUrl(e.target.value)}
                  className="bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 px-4 outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all"
                  placeholder="https://example.com/mindmap.png"
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
                <><Loader2 className="animate-spin" /> Publishing...</>
              ) : success ? (
                <><CheckCircle2 /> Material Published!</>
              ) : (
                <><Plus size={20} /> Publish Material</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
