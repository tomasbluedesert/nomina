# 9. Usuarios, roles, autenticación y seguridad

## Modelo de acceso
Un solo nivel: **usuario autenticado = acceso total a todos los módulos**. No hay tabla de roles ni permisos por acción (decisión actual; ver riesgos).

| Función | Usuario autenticado | Visitante |
|---|---:|---:|
| Ver/usar todos los módulos | ✓ | — |
| Iniciar sesión | ✓ | ✓ (pantalla /login) |
| Registrarse solo | — | — (registro público desactivado en Supabase) |

Altas/bajas de usuarios: panel Supabase → Authentication → Users (crear con *Auto Confirm*). "Quién puede acceder" por módulo: todos los autenticados.

## Autenticación (implementación)
- `src/middleware.ts`: en **cada request** crea cliente Supabase SSR con cookies y llama `auth.getUser()` (validación contra servidor, no solo cookie); sin usuario → redirect `/login`; con usuario en `/login` → redirect `/`. Matcher excluye estáticos.
- `src/app/login/ui.tsx`: `signInWithPassword` en el navegador; la sesión queda en cookies gestionadas por @supabase/ssr.
- `src/app/layout.tsx`: muestra el correo y botón **Salir** (server action `salir()` → `auth.signOut()` → redirect).
- `src/lib/supabase.ts::currentUserEmail`: sella `calculatedBy` en cada cálculo (auditoría de quién corrió qué).

## Variables sensibles (solo nombres; valores en .env local y Netlify)
`DATABASE_URL`, `DIRECT_URL`, `ASISTENCIAS_DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Las `NEXT_PUBLIC_*` viajan al navegador por diseño (la anon key es pública y está limitada por las políticas de Supabase); las cadenas de BD solo viven en servidor.

## Acceso a bases de datos
Nómina: Prisma con el rol postgres del proyecto (pooler transaccional). Asistencias: usuario dedicado `nomina_lector` con SELECT (RLS/grants definidos en ese proyecto) — la app no puede escribir allá.

## Riesgos encontrados
| Riesgo | Nivel | Nota |
|---|---|---|
| Sin roles: cualquier usuario autenticado puede eliminar periodos o cambiar parámetros | MEDIO | Mitigado por número reducido de usuarios; si crece el equipo, añadir roles (ver doc 12) |
| Credenciales de BD expuestas durante el desarrollo (chat) | ALTO hasta rotar | Acción: reset de contraseñas en ambos proyectos y actualización en .env + Netlify |
| Server actions confían en la sesión del middleware; no re-verifican rol | BAJO hoy | Coherente con modelo de un solo nivel |
