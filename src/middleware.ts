import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Protege toda la aplicación: sin sesión iniciada, cualquier ruta redirige a /login. */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (all: { name: string; value: string; options?: CookieOptions }[]) => { all.forEach(({ name, value }) => req.cookies.set(name, value)); res = NextResponse.next({ request: req }); all.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); },
    },
  });
  const { data: { user } } = await supabase.auth.getUser(); // getUser valida contra el servidor (no confiar solo en la cookie)
  const enLogin = req.nextUrl.pathname.startsWith('/login');
  if (!user && !enLogin) { const url = req.nextUrl.clone(); url.pathname = '/login'; url.search = ''; return NextResponse.redirect(url); }
  if (user && enLogin) { const url = req.nextUrl.clone(); url.pathname = '/'; url.search = ''; return NextResponse.redirect(url); }
  return res;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|svg|ico)$).*)'] };
