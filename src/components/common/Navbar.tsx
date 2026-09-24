import React, { useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Coffee, Lock, LogIn, LogOut, User, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import ModalFichaje from './ModalFichaje';
import { COMERCIO_CONFIG } from '../../config/comercio';

const vistas = [
  { key: 'pos', label: 'Punto Venta', path: '/pos' },
  { key: 'cocina', label: 'Cocina', path: '/cocina' },
  { key: 'admin', label: 'Admin', path: '/admin' },
  { key: 'menu', label: 'Menú QR', path: '/menu' },
];

const ETIQUETAS_ROL: Record<string, string> = {
  admin: 'Admin',
  cajero: 'Cajero',
  barista: 'Barista',
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const {
    usuarioActual,
    iniciarSesion,
    cerrarSesion,
  } = useAppContext();

  const [loginAbierto, setLoginAbierto] = useState(false);
  const [pin, setPin] = useState('');
  const [errorPin, setErrorPin] = useState<string | null>(null);

  const esAdmin = usuarioActual?.rol === 'admin';

  const [fichajeAbierto, setFichajeAbierto] = useState(false);
  const cerrarFichaje = useCallback(() => setFichajeAbierto(false), []);

  const esActiva = (path: string) =>
    location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path));

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    const usuario = iniciarSesion(pin);
    if (!usuario) {
      setErrorPin('PIN incorrecto. Probá de nuevo.');
      return;
    }
    setPin('');
    setErrorPin(null);
    setLoginAbierto(false);
  };

  const salir = () => {
    cerrarSesion();
  };

  return (
    <>
      <nav className="bg-stone-950 border-b border-stone-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="relative w-full px-6 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Logotipo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Coffee className="h-6 w-6 text-amber-500" />
            <span className="text-xl font-bold text-amber-500">{COMERCIO_CONFIG.nombre}</span>
          </Link>

          {/* Enlaces de navegación */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
            {vistas.map(vista => {
              const activa = esActiva(vista.path);
              const bloqueada = vista.key === 'admin' && !esAdmin;
              return (
                <Link
                  key={vista.key}
                  to={vista.path}
                  title={
                    bloqueada ? 'Solo administradores' : undefined
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    activa
                      ? 'bg-stone-800 text-amber-400'
                      : bloqueada
                        ? 'text-stone-600 hover:text-stone-400'
                        : 'text-stone-300 hover:text-stone-100 hover:bg-stone-900'
                  }`}
                >
                  {bloqueada && <Lock className="h-3.5 w-3.5" />}
                  {vista.label}
                </Link>
              );
            })}
          </div>

          {/* Sesión + Reloj de fichaje */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => setFichajeAbierto(true)}
              title="Reloj de fichaje"
              className="flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-1.5 text-sm font-medium text-stone-200 hover:border-amber-500/60 hover:text-amber-400 transition-colors"
            >
              <Clock className="h-4 w-4" />
              Reloj de Fichaje
            </button>
            {usuarioActual ? (
              <>
                <span className="flex items-center gap-2 rounded-lg bg-stone-900 border border-stone-800 px-3 py-1.5 text-sm">
                  <User className="h-4 w-4 text-amber-500" />
                  <span className="text-stone-200 font-medium">
                    {usuarioActual.nombre}
                  </span>
                  <span className="text-xs text-stone-500">
                    {ETIQUETAS_ROL[usuarioActual.rol] ?? usuarioActual.rol}
                  </span>
                </span>
                <button
                  onClick={salir}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="p-2 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-900 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setLoginAbierto(true)}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/60 px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Reloj de fichaje (kiosco independiente de la sesión) */}
      {fichajeAbierto && <ModalFichaje onCerrar={cerrarFichaje} />}

      {/* Modal de login */}
      {loginAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLoginAbierto(false)}
        >
          <div
            className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-100">
                  Iniciar sesión
                </h2>
                <p className="text-xs text-stone-500">
                  Ingresá tu PIN para identificarte
                </p>
              </div>
              <button
                onClick={() => setLoginAbierto(false)}
                aria-label="Cerrar"
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={entrar} className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={pin}
                onChange={e => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setErrorPin(null);
                }}
                placeholder="PIN de 4 dígitos"
                aria-label="PIN de usuario"
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-center text-lg tracking-[0.5em] text-stone-100 placeholder:text-stone-600 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errorPin && (
                <p className="text-sm text-red-400 text-center">{errorPin}</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
