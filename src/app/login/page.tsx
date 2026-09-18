import { LoginForm } from './ui';
export const metadata = { title: 'Acceso · Costo Real de Nómina' };
export default function Login() {
  return <div className="min-h-[70vh] flex items-center justify-center">
    <div className="card p-8 w-full max-w-sm">
      <h1 className="text-xl font-semibold">Costo Real de Nómina</h1>
      <p className="text-sm text-ink2 mt-1 mb-5">Blue Desert Cabo · acceso restringido</p>
      <LoginForm />
      <p className="text-xs text-ink2 mt-5">¿Sin acceso? Solicítalo al administrador; no hay registro público.</p>
    </div>
  </div>;
}
