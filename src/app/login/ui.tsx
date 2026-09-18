'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
export function LoginForm() {
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
  const [err, setErr] = useState(''); const [cargando, setCargando] = useState(false);
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setCargando(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error) { setErr(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message); setCargando(false); return; }
    window.location.assign('/');
  };
  return <form onSubmit={entrar} className="space-y-3">
    <label className="block"><span className="lbl">Correo</span><input type="email" required autoFocus className="inp w-full" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label>
    <label className="block"><span className="lbl">Contraseña</span><input type="password" required className="inp w-full" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" /></label>
    {err && <p className="text-ember text-sm">{err}</p>}
    <button className="btn w-full" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
  </form>;
}
