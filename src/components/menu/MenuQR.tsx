import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { Producto } from '../../types';
import { COMERCIO_CONFIG } from '../../config/comercio';

// Notas informativas por sección (en lugar de repetir badges en cada ítem)
const NOTAS_SECCION: Record<string, string> = {
  cafeteria:
    '✦ Personalizá tu café: Leches vegetales (Almendras / Avena) y opciones de endulzantes disponibles al pedir a tu mozo.',
};

// Carta digital de solo lectura: el cliente consulta, no pide desde acá
const MenuQR: React.FC = () => {
  const { productos, categorias } = useAppContext();

  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

  const textoBusqueda = busqueda.trim().toLowerCase();

  const coincideBusqueda = (nombre: string, descripcion: string) =>
    textoBusqueda === '' ||
    nombre.toLowerCase().includes(textoBusqueda) ||
    descripcion.toLowerCase().includes(textoBusqueda);

  // Secciones visibles: 'promos' muestra solo promociones;
  // 'todas' las encabeza en su sección y el resto va debajo sin repetirse.
  const secciones = useMemo(() => {
    const enBusqueda = (producto: Producto) =>
      coincideBusqueda(producto.nombre, producto.descripcion);
    const esPromo = (producto: Producto) => producto.esPromocion === true;

    if (categoriaActiva === 'promos') {
      const items = productos.filter(p => esPromo(p) && enBusqueda(p));
      return items.length > 0
        ? [{ categoria: { id: 'promos', nombre: '🔥 Promociones & Combos' }, items }]
        : [];
    }

    const regulares = categorias
      .filter(
        cat => categoriaActiva === 'todas' || categoriaActiva === cat.id,
      )
      .map(cat => ({
        categoria: cat,
        items: productos.filter(
          producto =>
            producto.categoriaId === cat.id &&
            (categoriaActiva !== 'todas' || !esPromo(producto)) &&
            enBusqueda(producto),
        ),
      }))
      .filter(seccion => seccion.items.length > 0);

    if (categoriaActiva === 'todas') {
      const promos = productos.filter(p => esPromo(p) && enBusqueda(p));
      if (promos.length > 0) {
        return [
          {
            categoria: { id: 'promos', nombre: '🔥 Promociones & Combos' },
            items: promos,
          },
          ...regulares,
        ];
      }
    }
    return regulares;
  }, [categorias, categoriaActiva, productos, busqueda]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Encabezado gastronómico */}
      <header className="px-4 pt-10 pb-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-amber-500/80">
          Carta
        </p>
        <h1 className="mt-2 font-serif text-4xl text-stone-50">{COMERCIO_CONFIG.nombre}</h1>
        <p className="mt-2 text-sm text-stone-400">
          {COMERCIO_CONFIG.subtitulo}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-amber-500/60">
          <span className="h-px w-10 bg-stone-800" aria-hidden />
          <span className="text-xs" aria-hidden>
            ✦
          </span>
          <span className="h-px w-10 bg-stone-800" aria-hidden />
        </div>

        {/* Buscador discreto */}
        <div className="mx-auto mt-5 flex max-w-sm items-center gap-2 rounded-full bg-stone-900 border border-stone-800/80 px-3.5 py-2 focus-within:border-stone-700 transition-colors">
          <Search className="h-3.5 w-3.5 text-stone-600 shrink-0" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar en la carta..."
            aria-label="Buscar en la carta"
            className="w-full bg-transparent text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
              className="p-0.5 rounded-full text-stone-500 hover:text-stone-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Selector horizontal de categorías */}
      <div className="sticky top-0 z-10 bg-stone-950/95 backdrop-blur border-b border-stone-800/60">
        <div className="mx-auto flex max-w-2xl gap-1.5 overflow-x-auto px-4 py-3">
          <button
            onClick={() => setCategoriaActiva('todas')}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
              categoriaActiva === 'todas'
                ? 'text-amber-300 border border-amber-500/40 bg-amber-500/10'
                : 'text-stone-500 border border-transparent hover:text-stone-200'
            }`}
          >
            Todo
          </button>
          <button
            onClick={() => setCategoriaActiva('promos')}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
              categoriaActiva === 'promos'
                ? 'text-amber-300 border border-amber-500/40 bg-amber-500/10'
                : 'text-stone-500 border border-transparent hover:text-stone-200'
            }`}
          >
            🔥 Promos
          </button>
          {categorias.map(cat => {
            const activa = categoriaActiva === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(activa ? 'todas' : cat.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                  activa
                    ? 'text-amber-300 border border-amber-500/40 bg-amber-500/10'
                    : 'text-stone-500 border border-transparent hover:text-stone-200'
                }`}
              >
                {cat.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secciones de la carta */}
      <div className="mx-auto max-w-2xl px-5">
        {secciones.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[15px] text-stone-400">
              {categoriaActiva === 'promos'
                ? 'No hay promos activas por el momento'
                : 'Nada por acá con esa búsqueda'}
            </p>
            <p className="text-[13px] text-stone-600 mt-1">
              Probá con otra palabra o categoría
            </p>
          </div>
        ) : (
          <main className="pb-10">
            {secciones.map(({ categoria, items }) => (
              <section key={categoria.id} className="pt-8">
                <h2 className="font-serif text-[22px] text-stone-100">
                  {categoria.nombre}
                </h2>
                <ul className="mt-1 divide-y divide-stone-800/60">
                  {items.map(producto => (
                    <li
                      key={producto.id}
                      className={`py-4 ${producto.disponible ? '' : 'opacity-55'}`}
                    >
                      <div className="flex items-baseline gap-2">
                        {producto.esPromocion && (
                          <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-stone-950">
                            PROMO
                          </span>
                        )}
                        <h3 className="text-[15px] font-medium text-stone-100">
                          {producto.nombre}
                        </h3>
                        <span
                          aria-hidden
                          className="mx-1 flex-1 border-b border-dotted border-stone-700"
                        />
                        <span className="shrink-0 text-[15px] font-semibold text-amber-200/90">
                          ${producto.precio}
                          {producto.esPromocion &&
                            producto.precioOriginal !== undefined &&
                            producto.precioOriginal > producto.precio && (
                              <span className="ml-1.5 text-xs font-normal line-through text-stone-500">
                                ${producto.precioOriginal}
                              </span>
                            )}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-stone-400">
                        {producto.descripcion}
                      </p>
                      {!producto.disponible && (
                        <p className="mt-1 text-xs italic text-stone-500">
                          Agotado por hoy
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {NOTAS_SECCION[categoria.id] &&
                  COMERCIO_CONFIG.modificadoresHabilitados && (
                  <p className="mt-3 border-l-2 border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200/80">
                    {NOTAS_SECCION[categoria.id]}
                  </p>
                )}
              </section>
            ))}
          </main>
        )}

        <footer className="pb-10 text-center text-xs text-stone-600">
          Precios en pesos · Preguntá al mozo por alérgenos y opciones del día
        </footer>
      </div>
    </div>
  );
};

export default MenuQR;
