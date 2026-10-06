'use client';

import { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Sparkles, BookOpen } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formattedUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
      const fakeEmail = `${formattedUsername}@smix1a.local`;

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: fakeEmail,
          password,
        });
        if (error) throw error;
        window.location.href = '/dashboard'; // Redirect on success
      } else {
        const { error } = await supabase.auth.signUp({
          email: fakeEmail,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (error) throw error;
        // Si tienes la confirmación de correo desactivada en Supabase, el usuario ya estará logueado.
        window.location.href = '/dashboard'; 
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* Dynamic Animated Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/40 blur-[120px] rounded-full animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-600/40 blur-[120px] rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Floating Elements */}
      <div className="absolute top-20 right-32 text-indigo-400/20 animate-bounce" style={{ animationDuration: '4s' }}>
        <Sparkles size={120} />
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
        
        {/* Glassmorphism Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-500">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 mb-6 shadow-lg shadow-indigo-500/30">
              <BookOpen className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
              {isLogin ? 'Bienvenido' : 'Únete a la Clase'}
            </h1>
            <p className="text-slate-400 mt-2 font-medium">
              {isLogin ? 'Inicia sesión para acceder a tus materiales de estudio.' : 'Crea una cuenta para empezar a organizar tus tareas.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Conditional Name Field for Registering */}
            <div className={`transition-all duration-500 overflow-hidden ${isLogin ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'}`}>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Nombre Completo" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                required
                placeholder="Nombre de Usuario" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                required
                placeholder="Contraseña" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              {isLogin ? "¿No tienes una cuenta? " : "¿Ya tienes una cuenta? "}
              <span className="text-indigo-400 hover:text-indigo-300 underline decoration-indigo-500/30 underline-offset-4">
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
