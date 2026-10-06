'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UploadCloud, File, Image as ImageIcon, Loader2, CheckCircle2, X } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setLoading(true);
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('tasks')
      .upload(filePath, file);

    if (uploadError) {
      alert('Error uploading file: ' + uploadError.message);
      setLoading(false);
      return;
    }

    // 2. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tasks')
      .getPublicUrl(filePath);

    // 3. Save metadata to the tasks table
    const { error: dbError } = await supabase.from('tasks').insert({
      student_id: user.id,
      title: title.trim(),
      file_url: publicUrl,
      file_type: file.type.includes('image') ? 'image' : 'document'
    });

    setLoading(false);

    if (!dbError) {
      setSuccess(true);
      setFile(null);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert('Error saving task record: ' + dbError.message);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
            <UploadCloud size={24} className="text-white" />
          </div>
          Task Repository
        </h1>
        <p className="text-slate-400 text-lg">Upload your completed exercises, documents, and pictures here.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Task Title / Description</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-900/50 border border-slate-700 text-white rounded-xl py-4 px-5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-lg"
              placeholder="e.g. Math Homework - Page 42"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">File Upload (Images or Documents)</label>
            
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                file ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 bg-slate-900/30 hover:border-cyan-500/50 hover:bg-slate-900/50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              
              {file ? (
                <div className="flex flex-col items-center gap-3 text-cyan-400">
                  {file.type.includes('image') ? <ImageIcon size={48} /> : <File size={48} />}
                  <div className="text-center">
                    <p className="font-bold text-lg text-white">{file.name}</p>
                    <p className="text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); setFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="mt-2 text-slate-400 hover:text-red-400 flex items-center gap-1 text-sm font-bold bg-black/20 px-3 py-1 rounded-lg transition-colors"
                  >
                    <X size={14} /> Remove File
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud size={48} className="text-slate-500" />
                  <div className="text-center">
                    <p className="font-bold text-lg text-white mb-1">Click to browse or drag and drop</p>
                    <p className="text-sm text-slate-400">Supports JPG, PNG, PDF, DOCX</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !file || !title.trim()}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all ${
              success ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
              loading || !file || !title.trim() ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 
              'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20'
            }`}
          >
            {loading ? (
              <><Loader2 className="animate-spin" /> Uploading to Server...</>
            ) : success ? (
              <><CheckCircle2 /> Task Uploaded Successfully!</>
            ) : (
              <><UploadCloud size={20} /> Submit Task</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
