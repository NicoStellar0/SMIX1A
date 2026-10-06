import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-fuchsia-400">
          Dashboard
        </h1>
        <p className="mt-4 text-slate-400">
          Welcome, {user.email}!
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold mb-2">Upcoming Exams</h2>
            <p className="text-slate-500 text-sm">No upcoming exams scheduled yet.</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold mb-2">What to study today</h2>
            <p className="text-slate-500 text-sm">Your study materials will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
