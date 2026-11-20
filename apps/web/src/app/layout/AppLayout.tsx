import { Link, Outlet } from 'react-router';
import logo from '../../assets/logo.png';

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-50 text-brand-950">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-3"
      >
        Saltar al contenido
      </a>
      <header className="bg-brand-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center px-5 py-4 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-sm text-sm font-semibold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <img src={logo} alt="" width="48" height="48" className="size-12 object-contain" />
            Centro Deportivo Los Robles
          </Link>
        </div>
      </header>
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl grow px-5 py-12 sm:px-8 sm:py-20"
      >
        <Outlet />
      </main>
      <footer className="border-t border-brand-200 px-5 py-6 text-center text-sm text-brand-800">
        Centro Deportivo Los Robles
      </footer>
    </div>
  );
}
