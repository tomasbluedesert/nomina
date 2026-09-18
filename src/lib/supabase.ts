import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (all: { name: string; value: string; options?: Record<string, unknown> }[]) => { try { all.forEach(c => store.set(c.name, c.value, c.options)); } catch {} } },
  });
}
export async function currentUserEmail(): Promise<string | null> {
  try { const { data } = await (await supabaseServer()).auth.getUser(); return data.user?.email ?? null; } catch { return null; }
}
