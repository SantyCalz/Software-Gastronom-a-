import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  Check,
  CheckCircle,
  Clock,
  Coffee,
  RefreshCw,
  Trash,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

type EstadoKDS = 'pendiente' | 'preparacion' | 'listo' | 'anulado';

interface ItemKDS {
  key: string;
  nombre: string;
  cantidad: number;
  modificadores: string[];
  nota?: string;
}

interface ComandaKDS {
  id: string;
  titulo: string;
  tipoServicio: 'salon' | 'takeaway';
  estado: EstadoKDS;
  items: ItemKDS[];
  minutos: number;
}

const Kitchen: React.FC = () => {
  const { pedidos, actualizarPedidoEstado, eliminarPedido } = useAppContext();

  // Comandas anuladas ocultadas del panel (persisten en el historial)
  const [ocultas, setOcultas] = useState<string[]>(() => {
    try {
      const crudo = localStorage.getItem('coffeepos:kds-ocultos');
      if (crudo) {
        const parsed: unknown = JSON.parse(crudo);
        if (Array.isArray(parsed)) {
          return parsed.filter((x): x is string => typeof x === 'string');
        }
      }
    } catch {
      // Sin registros previos
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('coffeepos:kds-ocultos', JSON.stringify(ocultas));
    } catch {
      // Sin persistencia disponible
    }
  }, [ocultas]);

  const ocultarAnulada = (comandaId: string) => {
    setOcultas(prev =>
      prev.includes(comandaId) ? prev : [...prev, comandaId],
    );
  };

  // Comandas activas (las entregadas salen del tablero y van al historial)
  const comandas = useMemo<ComandaKDS[]>(
    () =>
      pedidos
        .filter(
          pedido =>
            pedido.estado === 'pendiente' ||
            pedido.estado === 'preparacion' ||
            pedido.estado === 'listo' ||
            (pedido.estado === 'anulado' && !ocultas.includes(pedido.id)),
        )
        .map(pedido => {
          const fecha = new Date(pedido.fechaCreacion);
          const minutos = Math.max(
            0,
            Math.floor((Date.now() - fecha.getTime()) / 60000),
          );
          return {
            id: pedido.id,
            titulo:
              pedido.tipoServicio === 'takeaway'
                ? 'Take Away'
                : `Mesa ${pedido.mesaNumero}`,
            tipoServicio: pedido.tipoServicio,
            estado: pedido.estado as EstadoKDS,
            items: pedido.items.map((item, idx) => ({
              key: `${item.id}-${idx}`,
              nombre: item.nombre,
              cantidad: item.cantidad,
              modificadores: item.modificadores ?? [],
              nota: item.nota,
            })),
            minutos,
          };
        })
        // Las más antiguas primero
        .sort((a, b) => b.minutos - a.minutos),
    [pedidos, ocultas],
  );

  const pendientes = comandas.filter(c => c.estado === 'pendiente');
  const enPreparacion = comandas.filter(c => c.estado === 'preparacion');
  const listos = comandas.filter(c => c.estado === 'listo');

  const [comandaADescartar, setComandaADescartar] = useState<string | null>(null);

  const descartar = (comandaId: string) => {
    setComandaADescartar(comandaId);
  };

  const confirmarDescarte = () => {
    if (comandaADescartar) eliminarPedido(comandaADescartar);
    setComandaADescartar(null);
  };

  // Tarjeta de pedido anulado: aviso rojo + descartar del panel
  const tarjetaAnulada = (comanda: ComandaKDS) => (
    <div
      key={comanda.id}
      className="rounded-xl bg-stone-950 border border-red-500/60 border-t-4 border-t-red-600 p-4"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-lg font-extrabold text-white">
          {comanda.titulo}
        </span>
        <span className="text-xs font-bold rounded-full px-2 py-0.5 border border-red-500/60 bg-red-500/15 text-red-300">
          ANULADO POR CAJA
        </span>
      </div>
      <ul className="space-y-1 mb-3 opacity-70">
        {comanda.items.map(item => (
          <li key={item.key} className="text-sm text-stone-400 line-through">
            {item.cantidad}x {item.nombre}
          </li>
        ))}
      </ul>
      <button
        onClick={() => ocultarAnulada(comanda.id)}
        aria-label="Descartar del panel"
        className="w-full py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-xs font-semibold hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
      >
        <Trash className="h-3.5 w-3.5" />
        Descartar del panel
      </button>
    </div>
  );

  const tarjeta = (comanda: ComandaKDS) => {
    const acento =
      comanda.estado === 'pendiente'
        ? 'border-t-red-500'
        : comanda.estado === 'preparacion'
          ? 'border-t-amber-500'
          : 'border-t-green-500';
    const urgente = comanda.minutos >= 15 && comanda.estado !== 'listo';

    return (
      <div
        key={comanda.id}
        className={`rounded-xl bg-stone-950 border border-stone-800 border-t-4 ${acento} p-4`}
      >
        {/* Encabezado: mesa + tiempo */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-lg font-extrabold text-white">
            {comanda.titulo}
          </span>
          <span
            className={`text-xs font-medium rounded-full px-2 py-0.5 border ${
              comanda.tipoServicio === 'takeaway'
                ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {comanda.tipoServicio === 'takeaway' ? 'Take Away' : 'Salón'}
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 text-sm font-semibold mb-3 ${
            urgente ? 'text-red-400' : 'text-stone-400'
          }`}
        >
          <Clock className="h-4 w-4" />
          {comanda.minutos < 1
            ? 'Justo ahora'
            : `Hace ${comanda.minutos} min`}
          {urgente && (
            <span className="ml-1 rounded bg-red-500/15 border border-red-500/50 px-1.5 py-0.5 text-xs font-bold uppercase">
              Urgente
            </span>
          )}
        </div>

        {/* Ítems con cantidades y modificadores */}
        <ul className="space-y-2 mb-4">
          {comanda.items.map(item => (
            <li
              key={item.key}
              className="rounded-lg bg-stone-900 border border-stone-800 px-3 py-2"
            >
              <div className="text-base font-bold text-stone-50">
                <span className="text-amber-400">{item.cantidad}x</span>{' '}
                {item.nombre}
              </div>
              {item.modificadores.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.modificadores.map(mod => (
                    <span
                      key={mod}
                      className="rounded border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-300"
                    >
                      [{mod}]
                    </span>
                  ))}
                </div>
              )}
              {item.nota && (
                <p className="text-xs text-cyan-400 italic mt-1 font-medium">
                  « {item.nota} »
                </p>
              )}
            </li>
          ))}
        </ul>

        {/* Acciones según estado */}
        {comanda.estado === 'pendiente' && (
          <button
            onClick={() => actualizarPedidoEstado(comanda.id, 'preparacion')}
            className="w-full py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowUp className="h-4 w-4" />A preparación
          </button>
        )}

        {comanda.estado === 'preparacion' && (
          <div className="flex gap-2">
            <button
              onClick={() => actualizarPedidoEstado(comanda.id, 'pendiente')}
              className="flex-1 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-xs font-semibold hover:bg-stone-700 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={() => actualizarPedidoEstado(comanda.id, 'listo')}
              className="flex-[2] py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Listo
            </button>
          </div>
        )}

        {comanda.estado === 'listo' && (
          <div className="flex gap-2">
            <button
              onClick={() => actualizarPedidoEstado(comanda.id, 'entregado')}
              className="flex-[2] py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" />
              Entregado
            </button>
            <button
              onClick={() => descartar(comanda.id)}
              aria-label="Descartar comanda"
              className="p-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-500 hover:text-red-400 hover:border-red-500/50 transition-colors"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const columna = (
    titulo: string,
    cantidad: number,
    Icono: React.ElementType,
    colorTitulo: string,
    borde: string,
    comandasColumna: ComandaKDS[],
    vacio: string,
  ) => (
    <div className={`bg-stone-950 border border-stone-800 border-t-4 ${borde} rounded-2xl p-4`}>
      <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${colorTitulo}`}>
        <Icono className="h-5 w-5" />
        {titulo} ({cantidad})
      </h2>
      {comandasColumna.length === 0 ? (
        <div className="p-6 text-center">
          <Coffee className="h-10 w-10 mx-auto mb-2 text-stone-700" />
          <p className="text-sm text-stone-500 italic">{vacio}</p>
        </div>
      ) : (
        <div className="space-y-3">{comandasColumna.map(tarjeta)}</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-stone-950 border border-stone-800 rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Coffee className="h-6 w-6 text-amber-500" />
            <span className="text-xl font-bold text-stone-100">
              Cocina · KDS
            </span>
          </div>
          <span className="text-sm font-medium text-stone-400">
            {comandas.length}{' '}
            {comandas.length === 1 ? 'comanda activa' : 'comandas activas'}
          </span>
        </header>

        {/* Anulados por caja: frenar preparación */}
        {comandas.some(c => c.estado === 'anulado') && (
          <div className="rounded-2xl border border-red-500/50 bg-red-500/5 p-4 mb-4">
            <h2 className="text-base font-bold text-red-400 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Anulados por caja — frenar preparación
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {comandas
                .filter(c => c.estado === 'anulado')
                .map(tarjetaAnulada)}
            </div>
          </div>
        )}

        {/* Tablero Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {columna(
            'Pendientes',
            pendientes.length,
            AlertCircle,
            'text-red-400',
            'border-t-red-500',
            pendientes,
            'Sin pedidos pendientes',
          )}
          {columna(
            'En preparación',
            enPreparacion.length,
            RefreshCw,
            'text-amber-400',
            'border-t-amber-500',
            enPreparacion,
            'Sin pedidos en preparación',
          )}
          {columna(
            'Listos',
            listos.length,
            CheckCircle,
            'text-green-400',
            'border-t-green-500',
            listos,
            'No hay pedidos listos',
          )}
        </div>
      </div>

      {/* Modal temático de confirmación: descartar comanda del tablero */}
      {comandaADescartar && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setComandaADescartar(null)}
        >
          <div
            className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-stone-100">
              Descartar comanda
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              ¿Descartar esta comanda del tablero? Quedará registrada en el
              historial de ventas.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setComandaADescartar(null)}
                className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDescarte}
                className="flex-[2] py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kitchen;
