'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, UploadCloud, Shield, LogOut, MessageSquare, Eye, Library, Moon, Sun } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark'|'light'>('dark');

  useEffect(() => {
    // Read theme from local storage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (data) setUserRole(data.role);
      }
    };
    fetchRole();
  }, [supabase]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const commonNav = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Class Chat', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'Study Section', href: '/dashboard/study', icon: BookOpen },
    { name: 'Upload Task', href: '/dashboard/upload', icon: UploadCloud },
    { name: 'Task Gallery', href: '/dashboard/gallery', icon: Library },
  ];

  const adminNav = [
    { name: 'Admin Studio', href: '/dashboard/admin', icon: Shield },
  ];

  const supervisorNav = [
    { name: 'Supervisor', href: '/dashboard/supervisor', icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex selection:bg-indigo-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <BookOpen className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Class Hub</span>
          </div>

          <nav className="space-y-2">
            {commonNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                    isActive ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}>
                    <Icon size={18} />
                    {item.name}
                  </div>
                </Link>
              );
            })}

            {/* Supervisor Only Menu */}
            {(userRole === 'admin' || userRole === 'delegate' || userRole === 'sub-delegate') && (
              <>
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Moderation</div>
                {supervisorNav.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                      pathname === item.href ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}>
                      <item.icon size={18} />
                      {item.name}
                    </div>
                  </Link>
                ))}
              </>
            )}

            {/* Admin Only Menu */}
            {userRole === 'admin' && (
              <>
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Management</div>
                {adminNav.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                      pathname === item.href ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}>
                      <item.icon size={18} />
                      {item.name}
                    </div>
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>

        <div className="p-6 space-y-2">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
          >
            {theme === 'dark' ? <><Sun size={18} /> Light Mode</> : <><Moon size={18} /> Dark Mode</>}
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors font-medium"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
