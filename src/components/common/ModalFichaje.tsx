import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Delete, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { Usuario } from '../../types';

interface ModalFichajeProps {
  onCerrar: () => void;
}

const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Admin',
  cajero: 'Cajero',
  barista: 'Barista',
};

type Paso = 'pin' | 'confirmar' | 'exito';

// Reloj de fichaje tipo kiosco: funciona con el PIN del empleado sin
// alterar el usuario con sesión activa en el POS.
const ModalFichaje: React.FC<ModalFichajeProps> = ({ onCerrar }) => {
  const { obtenerEmpleadoPorPin, ficharPorPin, fichajes } = useAppContext();

  const [pin, setPin] = useState('');
  const [paso, setPaso] = useState<Paso>('pin');
  const [empleado, setEmpleado] = useState<Usuario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{
    tipo: 'entrada' | 'salida';
    hora: string;
  } | null>(null);

  // Cierre automático 2 segundos después de registrar
  useEffect(() => {
    if (!exito) return;
    const t = window.setTimeout(onCerrar, 2000);
    return () => window.clearTimeout(t);
  }, [exito, onCerrar]);

  const validar = (pinCompleto: string) => {
    const encontrado = obtenerEmpleadoPorPin(pinCompleto);
    if (!encontrado) {
      setError('PIN incorrecto');
      setPin('');
      return;
    }
    setError(null);
    setEmpleado(encontrado);
    setPaso('confirmar');
  };

  const ingresarDigito = (digito: string) => {
    if (paso !== 'pin' || pin.length >= 4) return;
    const nuevo = pin + digito;
    setPin(nuevo);
    if (nuevo.length === 4) validar(nuevo);
  };

  // Confirmación manual (botón en pantalla o tecla Enter física)
  const confirmarManual = () => {
    if (paso !== 'pin' || pin.length !== 4) return;
    validar(pin);
  };

  const borrar = () => {
    if (paso !== 'pin') return;
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const volverAPin = () => {
    setEmpleado(null);
    setPin('');
    setError(null);
    setPaso('pin');
  };

  // Teclado físico: dígitos, Enter para confirmar, Escape para cerrar.
  // Sin array de dependencias: se re-suscribe en cada render y los
  // closures siempre ven el estado fresco (pin, paso).
  useEffect(() => {
    const alPresionarTecla = (e: KeyboardEvent) => {
      const objetivo = e.target as HTMLElement | null;
      const etiqueta = objetivo?.tagName ?? '';
      // No interferir si el foco está en un campo de texto de fondo
      if (
        etiqueta === 'INPUT' ||
        etiqueta === 'TEXTAREA' ||
        etiqueta === 'SELECT'
      ) {
        return;
      }
      if (paso === 'pin') {
        if (/^[0-9]$/.test(e.key)) ingresarDigito(e.key);
        else if (e.key === 'Backspace') borrar();
        else if (e.key === 'Enter') confirmarManual();
      }
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alPresionarTecla);
    return () => window.removeEventListener('keydown', alPresionarTecla);
  });

  // Último movimiento del empleado (para mostrar su estado)
  const ultimoMovimiento = useMemo(() => {
    if (!empleado) return null;
    return (
      [...fichajes].reverse().find(f => f.usuarioId === empleado.id) ?? null
    );
  }, [fichajes, empleado]);

  // Último movimiento de hoy (para habilitar el botón correspondiente)
  const ultimoHoy = useMemo(() => {
    if (!empleado) return null;
    const hoy = new Date().toDateString();
    return (
      [...fichajes]
        .reverse()
        .find(
          f =>
            f.usuarioId === empleado.id &&
            new Date(f.fechaHora).toDateString() === hoy,
        ) ?? null
    );
  }, [fichajes, empleado]);

  const entradaDeshabilitada = ultimoHoy?.tipo === 'entrada';
  const salidaDeshabilitada = !ultimoHoy || ultimoHoy.tipo === 'salida';

  const registrar = (tipo: 'entrada' | 'salida') => {
    if (paso !== 'confirmar' || !empleado) return;
    const ficha = ficharPorPin(pin, tipo);
    if (!ficha) {
      setError('No se pudo registrar. Probá de nuevo.');
      return;
    }
    setExito({
      tipo,
      hora: new Date(ficha.fechaHora).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    setPaso('exito');
  };

  const textoUltimo = ultimoMovimiento
    ? `${ultimoMovimiento.tipo === 'entrada' ? 'Entrada' : 'Salida'} · ${new Date(
        ultimoMovimiento.fechaHora,
      ).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      })} hs${
        new Date(ultimoMovimiento.fechaHora).toDateString() !==
        new Date().toDateString()
          ? ` · ${new Date(ultimoMovimiento.fechaHora).toLocaleDateString(
              'es-AR',
              { day: '2-digit', month: '2-digit' },
            )}`
          : ''
      }`
    : 'Sin registros previos';

  const iniciales = empleado
    ? empleado.nombre
        .split(' ')
        .map(palabra => palabra[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-bold text-stone-100">
                Reloj de Fichaje
              </h2>
              <p className="text-xs text-stone-500">
                Marcá con tu PIN sin cerrar la sesión actual
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Confirmación visual */}
        {paso === 'exito' && exito ? (
          <div className="py-6 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/40">
              <Check className="h-7 w-7 text-emerald-400" />
            </span>
            <p className="text-lg font-bold text-stone-100">
              ¡{exito.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada!
            </p>
            <p className="mt-1 text-sm text-stone-400">
              {empleado?.nombre} · {exito.hora} hs
            </p>
          </div>
        ) : paso === 'confirmar' && empleado ? (
          /* Empleado detectado: confirmar movimiento */
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-stone-900 border border-stone-800 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/40 text-sm font-bold text-amber-400">
                {iniciales}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-stone-100 truncate">
                  {empleado.nombre}
                </p>
                <p className="text-xs text-stone-500">
                  {ETIQUETA_ROL[empleado.rol] ?? empleado.rol} · Último
                  registro: {textoUltimo}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => registrar('entrada')}
                disabled={entradaDeshabilitada}
                className="py-3.5 rounded-xl bg-emerald-600 text-white text-base font-bold hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Registrar Entrada
              </button>
              <button
                onClick={() => registrar('salida')}
                disabled={salidaDeshabilitada}
                className="py-3.5 rounded-xl bg-rose-600 text-white text-base font-bold hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Registrar Salida
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <button
              onClick={volverAPin}
              className="w-full text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              Usar otro PIN
            </button>
          </div>
        ) : (
          /* Teclado numérico táctil */
          <div className="space-y-4">
            <div className="flex justify-center gap-2.5">
              {[0, 1, 2, 3].map(i => (
                <span
                  key={i}
                  className={`h-4 w-4 rounded-full border transition-colors ${
                    pin.length > i
                      ? 'bg-amber-500 border-amber-500'
                      : 'border-stone-600'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digito => (
                <button
                  key={digito}
                  onClick={() => ingresarDigito(digito)}
                  className="py-3.5 rounded-xl bg-stone-800 border border-stone-700 text-xl font-bold text-stone-100 hover:bg-stone-700 active:bg-stone-600 transition-colors"
                >
                  {digito}
                </button>
              ))}
              <span />
              <button
                onClick={() => ingresarDigito('0')}
                className="py-3.5 rounded-xl bg-stone-800 border border-stone-700 text-xl font-bold text-stone-100 hover:bg-stone-700 active:bg-stone-600 transition-colors"
              >
                0
              </button>
              <button
                onClick={borrar}
                aria-label="Borrar dígito"
                className="py-3.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700 active:bg-stone-600 transition-colors flex items-center justify-center"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={confirmarManual}
              disabled={pin.length !== 4}
              className="w-full py-3 rounded-xl bg-amber-500 text-stone-950 text-base font-bold hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Confirmar PIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalFichaje;
