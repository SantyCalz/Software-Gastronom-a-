import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Coins,
  CreditCard,
  Lock,
  Minus,
  Plus,
  QrCode,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { generarId } from '../../utils/ids';
import { calcularDescuento } from '../../utils/descuentos';
import { CATEGORIAS_BEBIDA } from '../../data/mockData';
import { COMERCIO_CONFIG } from '../../config/comercio';
import type {
  ArqueoCaja,
  DesglosePago,
  ItemPedido,
  Producto,
} from '../../types';

type TipoServicio = 'salon' | 'takeaway';
type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'mixto';

const METODOS_PAGO: { id: MetodoPago; label: string; Icon: React.ElementType }[] =
  [
    { id: 'efectivo', label: 'Efectivo', Icon: Banknote },
    { id: 'transferencia', label: 'MP / QR', Icon: QrCode },
    { id: 'tarjeta', label: 'Tarjeta', Icon: CreditCard },
    { id: 'mixto', label: 'Mixto', Icon: Coins },
  ];

const ETIQUETA_RESULTADO: Record<ArqueoCaja['resultado'], string> = {
  sobrante: 'Sobrante',
  faltante: 'Faltante',
  exacta: 'Caja exacta',
};

// Las reglas de personalización (leches y extras con recargo) viven en
// AppContext como modificadores globales editables por el dueño.

const POS: React.FC = () => {
  const {
    productos = [],
    categorias = [],
    agregarPedido,
    usuarioActual,
    turnoCaja,
    abrirTurno,
    cerrarTurnoConArqueo,
    modificadores: modificadoresGlobales = [],
    registrarEgreso,
    mesas = [],
    marcharComanda,
    cobrarMesa,
    pedidos = [],
    configCobro,
    anularMesa,
  } = useAppContext();

  const [tipoServicio, setTipoServicio] = useState<TipoServicio>(
    COMERCIO_CONFIG.mesasHabilitadas ? 'salon' : 'takeaway',
  );
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number | null>(
    null,
  );
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todas');
  const [carrito, setCarrito] = useState<ItemPedido[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');

  // Personalización rápida de bebidas
  const [productoSel, setProductoSel] = useState<Producto | null>(null);
  const idLecheDefecto =
    modificadoresGlobales.find(m => m.grupo === 'leche')?.id ?? 'entera';
  const [lecheSel, setLecheSel] = useState(idLecheDefecto);
  const [extrasSel, setExtrasSel] = useState<string[]>([]);
  const [notaTxt, setNotaTxt] = useState('');

  // Arqueo / cierre de turno
  const [modalArqueo, setModalArqueo] = useState<
    'cerrado' | 'abrir' | 'cerrar' | 'resultado'
  >('cerrado');
  const [montoInicialTxt, setMontoInicialTxt] = useState('');
  const [montoContadoTxt, setMontoContadoTxt] = useState('');
  const [ultimoArqueo, setUltimoArqueo] = useState<ArqueoCaja | null>(null);
  const [errorArqueo, setErrorArqueo] = useState<string | null>(null);

  const turnoAbierto = turnoCaja?.estado === 'abierto';

  // Egresos de caja
  const [modalCajaCerrada, setModalCajaCerrada] = useState(false);
  const [mesaPendiente, setMesaPendiente] = useState<number | null>(null);

  // Cambiar de mesa: si la actual tiene ronda sin marchar, pide confirmación
  const intentarCambiarMesa = (numero: number) => {
    if (numero === mesaSeleccionada) {
      setMesaSeleccionada(null);
      setCarrito([]);
      return;
    }
    if (carrito.length > 0) {
      setMesaPendiente(numero);
      return;
    }
    setMesaSeleccionada(numero);
    setCarrito([]);
  };

  const confirmarCambioMesa = () => {
    if (mesaPendiente === null) return;
    setMesaSeleccionada(mesaPendiente);
    setCarrito([]);
    setMesaPendiente(null);
  };

  const [modalAnularMesa, setModalAnularMesa] = useState(false);
  const [modalRondaPendiente, setModalRondaPendiente] = useState(false);
  const [modalEgreso, setModalEgreso] = useState(false);
  const [montoEgresoTxt, setMontoEgresoTxt] = useState('');
  const [motivoEgreso, setMotivoEgreso] = useState('');
  const [excesoEgreso, setExcesoEgreso] = useState<{
    monto: number;
    motivo: string;
    disponible: number;
  } | null>(null);
  const [errorEgreso, setErrorEgreso] = useState<string | null>(null);
  const [exitoEgreso, setExitoEgreso] = useState<string | null>(null);

  const abrirModalEgreso = () => {
    setMontoEgresoTxt('');
    setMotivoEgreso('');
    setErrorEgreso(null);
    setExitoEgreso(null);
    setModalEgreso(true);
  };

  const confirmarEgreso = () => {
    const monto = Number(montoEgresoTxt);
    if (
      montoEgresoTxt.trim() === '' ||
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      setErrorEgreso('Ingresá un monto válido mayor a 0.');
      return;
    }
    if (motivoEgreso.trim() === '') {
      setErrorEgreso('El motivo es obligatorio para auditar el retiro.');
      return;
    }
    if (turnoCaja && turnoCaja.estado === 'abierto') {
      const apertura = new Date(turnoCaja.fechaApertura).getTime();
      const ventasEfectivo = pedidos
        .filter(
          pedido =>
            pedido.estado !== 'anulado' &&
            pedido.cobrado !== false &&
            (pedido.metodoPago === 'efectivo' ||
              (pedido.metodoPago === 'mixto' &&
                pedido.desglosePago !== undefined)) &&
            new Date(pedido.fechaCreacion).getTime() >= apertura,
        )
        .reduce(
          (acc, pedido) =>
            acc +
            (pedido.metodoPago === 'mixto' && pedido.desglosePago
              ? pedido.desglosePago.efectivo
              : pedido.total),
          0,
        );
      const disponible =
        turnoCaja.montoInicial + ventasEfectivo - turnoCaja.egresosTotales;
      if (monto > disponible) {
        setExcesoEgreso({ monto, motivo: motivoEgreso.trim(), disponible });
        return;
      }
    }
    const egreso = registrarEgreso(monto, motivoEgreso.trim());
    if (!egreso) {
      setErrorEgreso('No hay un turno abierto para registrar el egreso.');
      return;
    }
    setExitoEgreso(
      `Retiro de $${egreso.monto} registrado (${egreso.motivo}).`,
    );
    setMontoEgresoTxt('');
    setMotivoEgreso('');
  };

  const confirmarExcesoEgreso = () => {
    if (!excesoEgreso) return;
    const egreso = registrarEgreso(excesoEgreso.monto, excesoEgreso.motivo);
    setExcesoEgreso(null);
    if (!egreso) {
      setErrorEgreso('No hay un turno abierto para registrar el egreso.');
      return;
    }
    setExitoEgreso(
      `Retiro de $${egreso.monto} registrado (${egreso.motivo}).`,
    );
    setMontoEgresoTxt('');
    setMotivoEgreso('');
  };

  const abrirModalArqueo = () => {
    setErrorArqueo(null);
    if (turnoAbierto) {
      setMontoContadoTxt('');
      setModalArqueo('cerrar');
    } else {
      setMontoInicialTxt('');
      setModalArqueo('abrir');
    }
  };

  const confirmarApertura = () => {
    const monto = Number(montoInicialTxt);
    if (!Number.isFinite(monto) || monto < 0) {
      setErrorArqueo('Ingresá un monto inicial válido (0 o más).');
      return;
    }
    abrirTurno(usuarioActual?.id ?? 'sin-usuario', monto);
    setModalArqueo('cerrado');
  };

  const confirmarCierre = () => {
    const contado = Number(montoContadoTxt);
    if (
      montoContadoTxt.trim() === '' ||
      !Number.isFinite(contado) ||
      contado < 0
    ) {
      setErrorArqueo('Ingresá el efectivo contado en caja (0 o más).');
      return;
    }
    const arqueo = cerrarTurnoConArqueo(contado);
    if (!arqueo) {
      setErrorArqueo('No hay un turno abierto para cerrar.');
      return;
    }
    setUltimoArqueo(arqueo);
    setModalArqueo('resultado');
  };

  // --- Personalización de bebidas ---
  // Personalizable por flag explícito (admin) o por categoría (legado)
  const esPersonalizable = (producto: Producto) =>
    COMERCIO_CONFIG.modificadoresHabilitados &&
    (producto.personalizable ??
      CATEGORIAS_BEBIDA.includes(producto.categoriaId));

  const abrirPersonalizacion = (producto: Producto) => {
    setProductoSel(producto);
    setLecheSel(idLecheDefecto);
    setExtrasSel([]);
    setNotaTxt('');
  };

  const cerrarPersonalizacion = () => setProductoSel(null);

  const alternarExtra = (id: string) => {
    setExtrasSel(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id],
    );
  };

  // Firma de personalización: líneas iguales se fusionan, distintas no
  const firmaItem = (
    productoId: string,
    precioUnitario: number,
    modificadores: string[],
    nota: string,
  ) =>
    `${productoId}|${precioUnitario}|${[...modificadores].sort().join(';')}|${nota}`;

  const leches = modificadoresGlobales.filter(m => m.grupo === 'leche');
  const extrasReceta = modificadoresGlobales.filter(m => m.grupo === 'extra');
  const lecheElegida = leches.find(l => l.id === lecheSel);
  const recargoLeche = lecheElegida?.recargo ?? 0;
  const recargoExtras = extrasSel.reduce(
    (acc, id) => acc + (extrasReceta.find(o => o.id === id)?.recargo ?? 0),
    0,
  );
  const precioPersonalizado =
    (productoSel?.precio ?? 0) + recargoLeche + recargoExtras;

  const confirmarPersonalizacion = () => {
    if (!productoSel) return;
    const mods: string[] = [];
    if (lecheElegida) {
      mods.push(lecheElegida.etiquetaTicket);
    }
    extrasSel.forEach(id => {
      const op = extrasReceta.find(o => o.id === id);
      if (op) mods.push(op.etiquetaTicket);
    });
    agregarAlCarrito(productoSel, {
      modificadores: mods,
      nota: notaTxt.trim(),
      recargo: recargoLeche + recargoExtras,
    });
    cerrarPersonalizacion();
  };

  // Productos disponibles filtrados por categoría ('promos' = solo
  // promociones; en 'todas' las promos ordenan primero)
  const productosVisibles = useMemo(() => {
    const lista = productos.filter((producto: Producto) => {
      if (!producto.disponible) return false;
      if (categoriaActiva === 'todas') return true;
      if (categoriaActiva === 'promos') return producto.esPromocion === true;
      return producto.categoriaId === categoriaActiva;
    });
    if (categoriaActiva === 'todas') {
      return [...lista].sort(
        (a, b) =>
          Number(b.esPromocion ?? false) - Number(a.esPromocion ?? false),
      );
    }
    return lista;
  }, [productos, categoriaActiva]);

  const promosEnVista =
    categoriaActiva === 'todas'
      ? productosVisibles.filter(p => p.esPromocion === true)
      : [];
  const restoEnVista =
    categoriaActiva === 'todas'
      ? productosVisibles.filter(p => p.esPromocion !== true)
      : productosVisibles;

  const renderTarjetaProducto = (producto: Producto) => (
    <button
      key={producto.id}
      onClick={() =>
        esPersonalizable(producto)
          ? abrirPersonalizacion(producto)
          : agregarAlCarrito(producto)
      }
      className="bg-stone-800 rounded-xl p-4 border border-stone-700 hover:border-amber-500 transition-colors text-left"
    >
      <div className="font-medium text-stone-100 mb-1 flex items-center gap-1.5">
        {producto.esPromocion && (
          <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-stone-950">
            PROMO
          </span>
        )}
        <span className="truncate">{producto.nombre}</span>
      </div>
      <div className="text-xs text-stone-400 mb-2 line-clamp-2">
        {producto.descripcion}
      </div>
      <div className="text-lg font-bold text-amber-500">
        ${producto.precio}
        {producto.esPromocion &&
          producto.precioOriginal !== undefined &&
          producto.precioOriginal > producto.precio && (
            <span className="ml-2 text-xs font-normal line-through text-stone-500">
              ${producto.precioOriginal}
            </span>
          )}
      </div>
    </button>
  );

  // Agregar producto al carrito. Líneas con igual personalización
  // (producto + precio + modificadores + nota) suman cantidad; si la
  // personalización difiere se crean líneas separadas.
  const agregarAlCarrito = (
    producto: Producto,
    personalizacion: {
      modificadores: string[];
      nota: string;
      recargo: number;
    } = { modificadores: [], nota: '', recargo: 0 },
  ) => {
    const precioUnitario = producto.precio + personalizacion.recargo;
    const firma = firmaItem(
      producto.id,
      precioUnitario,
      personalizacion.modificadores,
      personalizacion.nota,
    );
    setCarrito(prev => {
      const existe = prev.find(
        item =>
          firmaItem(
            item.productoId,
            item.precioUnitario,
            item.modificadores ?? [],
            item.nota ?? '',
          ) === firma,
      );
      if (existe) {
        return prev.map(item =>
          item.id === existe.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      const nuevoItem: ItemPedido = {
        id: generarId('item'),
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precioUnitario,
        modificadores: personalizacion.modificadores,
        nota: personalizacion.nota || undefined,
      };
      return [...prev, nuevoItem];
    });
  };

  // Cambiar cantidad (+ / -)
  const cambiarCantidad = (itemId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) =>
          item.id === itemId
            ? { ...item, cantidad: item.cantidad + delta }
            : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  };

  // Eliminar ítem del carrito
  const eliminarItem = (itemId: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Vaciar carrito completo
  const vaciarCarrito = () => {
    setCarrito([]);
  };

  // Calcular totales
  const subtotal = carrito.reduce(
    (acc, item) => acc + item.precioUnitario * item.cantidad,
    0,
  );
  const total = subtotal;

  // Cobrar: agrega pedido con estado 'pendiente'
  const cobrar = () => {
    if (carrito.length === 0) return;
    if (!turnoAbierto) {
      setModalCajaCerrada(true);
      return;
    }
    if (metodoPago === 'mixto') {
      abrirModalMixto();
      return;
    }

    agregarPedido({
      mesaNumero: tipoServicio === 'takeaway' ? 0 : (mesaSeleccionada ?? 0),
      tipoServicio,
      estado: 'pendiente',
      items: carrito,
      total: totalCobro,
      metodoPago,
      usuarioId: usuarioActual?.id,
      usuarioNombre: usuarioActual?.nombre,
      cobrado: true,
      ...(descuentoCobro > 0
        ? { subtotalBruto: total, descuentoMonto: descuentoCobro }
        : {}),
    });

    setCarrito([]);
  };

  // Mesa activa + rondas anteriores (cuenta abierta, sin anular)
  const mesaActiva =
    mesaSeleccionada === null
      ? null
      : (mesas.find(m => m.numero === mesaSeleccionada) ?? null);

  const rondasMesa = useMemo(() => {
    if (!mesaActiva) return [];
    const ids = new Set(mesaActiva.pedidosIds);
    return pedidos
      .filter(p => ids.has(p.id) && p.estado !== 'anulado')
      .sort(
        (a, b) =>
          new Date(a.fechaCreacion).getTime() -
          new Date(b.fechaCreacion).getTime(),
      );
  }, [pedidos, mesaActiva]);

  const totalCuentaMesa = rondasMesa.reduce((acc, p) => acc + p.total, 0);

  // Descuento por pago en efectivo sobre la base a cobrar
  // (carrito en take away; cuenta + ronda actual en salón, en vivo)
  const baseCobro =
    tipoServicio === 'salon' ? totalCuentaMesa + total : total;
  const { descuento: descuentoCobro } = calcularDescuento(
    baseCobro,
    metodoPago,
    configCobro,
  );
  const totalCobro = baseCobro - descuentoCobro;
  const PORC_DESCUENTO = configCobro.descuentoEfectivoPorcentaje;

  // Pago mixto / dividido: sin descuento por efectivo (precio de lista).
  // Válido solo si 0 < efectivo < total; el resto va al método digital.
  const [modalMixto, setModalMixto] = useState(false);
  const [efectivoMixtoTxt, setEfectivoMixtoTxt] = useState('');
  const [metodoDigitalMixto, setMetodoDigitalMixto] = useState<
    'transferencia' | 'tarjeta'
  >('transferencia');

  const abrirModalMixto = () => {
    setEfectivoMixtoTxt('');
    setMetodoDigitalMixto('transferencia');
    setModalMixto(true);
  };

  const efectivoMixto = Number(efectivoMixtoTxt);
  const mixtoValido =
    efectivoMixtoTxt.trim() !== '' &&
    Number.isFinite(efectivoMixto) &&
    efectivoMixto > 0 &&
    efectivoMixto < totalCobro;
  const restoMixto =
    totalCobro - (Number.isFinite(efectivoMixto) ? efectivoMixto : 0);

  const confirmarMixto = () => {
    if (!mixtoValido) return;
    const desglose: DesglosePago = {
      efectivo: efectivoMixto,
      digital: totalCobro - efectivoMixto,
      metodoDigital: metodoDigitalMixto,
    };
    if (tipoServicio === 'salon') {
      if (mesaSeleccionada === null) return;
      const ok = cobrarMesa(mesaSeleccionada, 'mixto', desglose);
      if (!ok) {
        setErrorCierre(
          'No se pudo cerrar la mesa (ya está libre o sin rondas cobrables).',
        );
        setModalMixto(false);
        return;
      }
    } else {
      agregarPedido({
        mesaNumero: 0,
        tipoServicio,
        estado: 'pendiente',
        items: carrito,
        total: totalCobro,
        metodoPago: 'mixto',
        desglosePago: desglose,
        usuarioId: usuarioActual?.id,
        usuarioNombre: usuarioActual?.nombre,
        cobrado: true,
      });
      setCarrito([]);
    }
    setModalMixto(false);
  };

  // Mesas dinámicas del contexto, ordenadas por número correlativo
  const mesasOrdenadas = useMemo(
    () => [...mesas].sort((a, b) => a.numero - b.numero),
    [mesas],
  );

  // Si la mesa seleccionada fue eliminada desde Admin, limpiar selección
  useEffect(() => {
    if (
      mesaSeleccionada !== null &&
      !mesas.some(m => m.numero === mesaSeleccionada)
    ) {
      setMesaSeleccionada(null);
      setCarrito([]);
    }
  }, [mesas, mesaSeleccionada]);

  // Agregado por mesa para el plano, la barra compacta y la grilla
  const infoMesas = useMemo(() => {
    const mapa = new Map<number, { subtotal: number; rondas: number }>();
    mesas.forEach(m => {
      const ids = new Set(m.pedidosIds);
      const rondas = pedidos.filter(
        p => ids.has(p.id) && p.estado !== 'anulado',
      );
      mapa.set(m.numero, {
        subtotal: rondas.reduce((acc, p) => acc + p.total, 0),
        rondas: rondas.length,
      });
    });
    return mapa;
  }, [pedidos, mesas]);

  // Marchar: envía la ronda actual a cocina sin cobrar
  const marchar = () => {
    if (mesaSeleccionada === null || carrito.length === 0) return;
    const pedido = marcharComanda(mesaSeleccionada, carrito, total);
    if (!pedido) return;
    setCarrito([]);
  };

  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  // Cobrar y cerrar mesa: cobra el acumulado con el método elegido
  const cobrarCierre = () => {
    try {
      setErrorCierre(null);
      if (mesaSeleccionada === null) {
        setErrorCierre('Elegí una mesa para cobrar.');
        return;
      }
      if (carrito.length > 0) {
        setModalRondaPendiente(true);
        return;
      }
      if (!turnoAbierto) {
        setModalCajaCerrada(true);
        return;
      }
      if (metodoPago === 'mixto') {
        abrirModalMixto();
        return;
      }
      if (import.meta.env.DEV) {
        console.log('Cerrando mesa:', mesaSeleccionada, {
          metodoPago,
          cuenta: totalCuentaMesa,
        });
      }
      const ok = cobrarMesa(mesaSeleccionada, metodoPago);
      if (!ok) {
        if (import.meta.env.DEV) {
          console.warn(
            'cobrarMesa devolvió false para la mesa:',
            mesaSeleccionada,
          );
        }
        setErrorCierre(
          'No se pudo cerrar la mesa (ya está libre o sin rondas cobrables).',
        );
        return;
      }
      if (import.meta.env.DEV) {
        console.log('Mesa cerrada con éxito:', mesaSeleccionada);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error al cerrar la mesa:', err);
      }
      setErrorCierre('Ocurrió un error al cerrar la mesa. Reintentá.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] lg:h-[calc(100vh-4.5rem)] flex flex-col overflow-y-auto lg:overflow-hidden bg-stone-900 text-stone-100">
      <div className="w-full flex-1 min-h-0 flex flex-col px-6 lg:px-8 pb-6 pt-4 gap-4">
        {/* CABECERA PRINCIPAL CON 3 ZONAS COINCIDENTES EN X */}
        <header className="w-full flex items-center justify-between mb-6 shrink-0">
          {/* ZONA 1 (sobre columna Mesas): Título y Cajero */}
          <div className="w-56 shrink-0">
            <div>
              <h1 className="text-xl font-bold text-amber-500">Punto de Venta</h1>
              <p className="text-xs text-stone-400">Cajero: {usuarioActual?.nombre || 'Admin'}</p>
            </div>
          </div>

          {/* ZONA 2 (alineada al inicio de la columna Catálogo): Selector Salón / Take Away */}
          <div className="flex-1 flex items-center justify-start pl-2">
            <div className="inline-flex items-center bg-stone-900 border border-stone-800 rounded-lg p-1">
          {/* Selector de venta */}
            {COMERCIO_CONFIG.mesasHabilitadas && (
            <div className="flex rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  setTipoServicio('salon');
                  setCarrito([]);
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  tipoServicio === 'salon'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                <UtensilsCrossed className="h-4 w-4" />
                Salón
              </button>
              <button
                onClick={() => {
                  setTipoServicio('takeaway');
                  setCarrito([]);
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tipoServicio === 'takeaway'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                Take Away
              </button>
            </div>
            )}

          </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-3">
            {/* 1. Registrar Egreso */}
            <button
              onClick={abrirModalEgreso}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium whitespace-nowrap transition-colors"
              title="Registrar salida o gasto menor de efectivo"
            >
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>Registrar Egreso</span>
            </button>

            {/* 2. Badge Estado Caja */}
            {turnoAbierto ? (
              <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium whitespace-nowrap text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Caja abierta · Inicial ${turnoCaja?.montoInicial ?? 0}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm font-medium whitespace-nowrap text-stone-400">
                <span className="h-2 w-2 rounded-full bg-stone-500" />
                Caja cerrada
              </span>
            )}

            {/* 3. Cierre de Turno / Arqueo */}
            <button
              onClick={abrirModalArqueo}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/60 px-3 py-2 text-sm font-medium whitespace-nowrap text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <Lock className="h-4 w-4" />
              Cierre de Turno / Arqueo
            </button>
          </div>
        </header>


        <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-6">
          {tipoServicio === 'salon' && (
          <aside className="w-full lg:w-56 shrink-0 bg-stone-900/60 border border-stone-800/80 rounded-2xl p-3 flex flex-row lg:flex-col min-h-0 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto">
            <div className="hidden lg:block flex-shrink-0 px-2 pt-3 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Salón
              </span>
            </div>
            <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-2 lg:flex-1 lg:min-h-0 w-full">
              {mesasOrdenadas.map(mesa => {
                const numero = mesa.numero;
                const ocupada = mesa.estado === 'ocupada';
                const info = infoMesas.get(numero) ?? {
                  subtotal: 0,
                  rondas: 0,
                };
                const seleccionada = mesaSeleccionada === numero;
                return (
                  <button
                    key={numero}
                    onClick={() => intentarCambiarMesa(numero)}
                    className={`shrink-0 min-w-[4.5rem] lg:min-w-0 rounded-xl border px-3 py-2 text-center transition-colors ${
                      ocupada
                        ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 font-medium hover:border-amber-400'
                        : 'bg-stone-950/60 border-stone-800/80 text-stone-400 hover:border-stone-700'
                    } ${seleccionada ? 'ring-2 ring-amber-400 border-transparent' : ''}`}
                  >
                    <div className="text-sm font-bold">Mesa {numero}</div>
                    <div className="text-xs font-mono opacity-80">
                      {ocupada ? `$${info.subtotal}` : 'Libre'}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
          )}
          {/* Catálogo táctil */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-4">
            {/* Filtro por categoría */}
            <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
              <button
                onClick={() => setCategoriaActiva('todas')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  categoriaActiva === 'todas'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setCategoriaActiva('promos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  categoriaActiva === 'promos'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                🔥 Promos
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaActiva(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    categoriaActiva === cat.id
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>

            {/* Grilla de productos */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 flex-1 min-h-0 overflow-y-auto pr-1 content-start">
              {categoriaActiva === 'promos' && restoEnVista.length === 0 ? (
                <p className="col-span-full py-8 text-center text-sm text-stone-500">
                  No hay promos activas por el momento.
                </p>
              ) : categoriaActiva === 'todas' && promosEnVista.length > 0 ? (
                <>
                  <div className="col-span-full h-auto p-4 bg-stone-950/40 border border-amber-500/30 rounded-xl mb-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-3">
                      🔥 Promociones & Combos
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {promosEnVista.map(renderTarjetaProducto)}
                    </div>
                  </div>
                  {restoEnVista.length > 0 && (
                    <p className="col-span-full mt-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Carta completa
                    </p>
                  )}
                  {restoEnVista.map(renderTarjetaProducto)}
                </>
              ) : (
                <>{productosVisibles.map(renderTarjetaProducto)}</>
              )}
            </div>
          </div>

          {/* Comanda lateral */}
          <div className="w-full lg:w-96 shrink-0 h-full min-h-0 max-h-[55vh] lg:max-h-none flex flex-col justify-between bg-stone-900/60 border border-stone-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  {tipoServicio === 'salon' && mesaActiva
                    ? `Mesa ${mesaActiva.numero}`
                    : tipoServicio === 'salon'
                      ? 'Comanda'
                      : 'Take Away'}
                </h2>
                <p className="text-xs text-stone-500">
                  {tipoServicio === 'salon' && mesaActiva
                    ? mesaActiva.estado === 'ocupada'
                      ? `Cuenta $${totalCuentaMesa}`
                      : 'Mesa libre'
                    : tipoServicio === 'salon'
                      ? 'Elegí una mesa'
                      : 'Venta rápida'}
                </p>
              </div>
              {carrito.length > 0 && (
                <button
                  onClick={vaciarCarrito}
                  className="text-stone-400 hover:text-red-400 transition-colors"
                  aria-label="Vaciar carrito"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Cuenta de la mesa (rondas anteriores, sin cobrar) */}
            {tipoServicio === 'salon' &&
              mesaActiva !== null &&
              mesaActiva.estado === 'ocupada' && (
                <>
                <div className="rounded-xl border border-amber-500/40 bg-stone-950 p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-amber-400">
                      Mesa {mesaActiva.numero} · Cuenta
                    </h3>
                    <span className="text-xs text-stone-400">
                      {rondasMesa.length}{' '}
                      {rondasMesa.length === 1 ? 'ronda' : 'rondas'}
                    </span>
                  </div>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {rondasMesa.map(ronda => (
                      <li key={ronda.id} className="text-xs text-stone-300">
                        <span className="text-stone-500">
                          {new Date(ronda.fechaCreacion).toLocaleTimeString(
                            'es-AR',
                            { hour: '2-digit', minute: '2-digit' },
                          )}
                        </span>{' '}
                        {ronda.items
                          .map(i => `${i.cantidad}x ${i.nombre}`)
                          .join(', ')}{' '}
                        <span className="font-bold text-stone-100">
                          ${ronda.total}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between mt-2 pt-2 border-t border-stone-800 text-sm font-bold">
                    <span className="text-stone-300">Acumulado</span>
                    <span className="text-amber-400">${totalCuentaMesa}</span>
                  </div>
                </div>
                <button
                  onClick={() => setModalAnularMesa(true)}
                  className="mt-2 w-full rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:border-rose-700 transition-colors"
                >
                  Anular Comanda / Liberar Mesa
                </button>
                {modalAnularMesa && (
                  <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
                    onClick={() => setModalAnularMesa(false)}
                  >
                    <div
                      className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center"
                      onClick={e => e.stopPropagation()}
                    >
                      <h2 className="text-lg font-bold text-stone-100">
                        Anular comanda
                      </h2>
                      <p className="mt-2 text-sm text-stone-400">
                        ¿Seguro que deseas anular todos los pedidos y liberar
                        la Mesa {mesaActiva.numero}? Esta acción no sumará
                        dinero a la caja.
                      </p>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setModalAnularMesa(false)}
                          className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            anularMesa(mesaActiva.numero);
                            setModalAnularMesa(false);
                          }}
                          className="flex-[2] py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors"
                        >
                          Confirmar anulación
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
              )}

            {/* Lista de ítems */}
            <div className="flex-1 min-h-0 overflow-y-auto">
            {tipoServicio === 'salon' && (
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500 mb-2">
                Ítems por marchar
              </p>
            )}
            {carrito.length === 0 ? (
              <p className="text-stone-500 text-sm text-center py-8">
                Carrito vacío
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {carrito.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 bg-stone-700 rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-stone-100 truncate">
                        {item.nombre}
                      </div>
                      <div className="text-xs text-stone-400">
                        ${item.precioUnitario} c/u
                      </div>
                      {(item.modificadores?.length || item.nota) && (
                        <div className="text-[11px] text-stone-500 truncate">
                          {[...(item.modificadores ?? [])]
                            .concat(item.nota ? [`«${item.nota}»`] : [])
                            .join(' · ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => cambiarCantidad(item.id, -1)}
                        className="p-1 rounded bg-stone-600 hover:bg-stone-500 transition-colors"
                        aria-label="Restar"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(item.id, 1)}
                        className="p-1 rounded bg-stone-600 hover:bg-stone-500 transition-colors"
                        aria-label="Sumar"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => eliminarItem(item.id)}
                        className="p-1 rounded text-stone-400 hover:text-red-400 transition-colors ml-1"
                        aria-label="Eliminar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            </div>

            {/* Totales */}
            <div className="border-t border-stone-800 pt-4 space-y-1 mb-4 mt-4">
              <div className="flex justify-between text-sm text-stone-400">
                <span>Subtotal</span>
                <span>${baseCobro}</span>
              </div>
              {descuentoCobro > 0 && (
                <div className="flex justify-between text-sm font-medium text-emerald-400">
                  <span>Descuento Efectivo ({PORC_DESCUENTO}%)</span>
                  <span>-${descuentoCobro}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-amber-500">
                <span>{descuentoCobro > 0 ? 'Total Final' : 'Total'}</span>
                <span>${totalCobro}</span>
              </div>
              {tipoServicio === 'salon' && total > 0 && totalCuentaMesa > 0 && (
                <p className="text-[11px] text-stone-500 text-right">
                  Incluye cuenta (${totalCuentaMesa}) + ronda actual (${total})
                </p>
              )}
            </div>

            {/* Marchar a cocina (solo salón con mesa elegida) */}
            {tipoServicio === 'salon' && (
              <button
                onClick={marchar}
                disabled={mesaSeleccionada === null || carrito.length === 0}
                className="w-full mb-3 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Marchar a Cocina
              </button>
            )}
            {tipoServicio === 'salon' && mesaSeleccionada === null && (
              <p className="text-xs text-stone-500 text-center mb-3">
                Elegí una mesa para marchar o cobrar.
              </p>
            )}
            {tipoServicio === 'salon' &&
              mesaSeleccionada !== null &&
              carrito.length > 0 && (
                <p className="text-xs text-stone-500 text-center mb-3">
                  Marchá la ronda actual antes de cobrar la mesa.
                </p>
              )}

            {/* Cobro rápido */}
            <div className="mb-3">
              <div className="text-xs text-stone-400 mb-2 uppercase tracking-wide">
                Método de pago
              </div>
              <div className="grid grid-cols-4 gap-2">
                {METODOS_PAGO.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setMetodoPago(id)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors border ${
                      metodoPago === id
                        ? 'bg-amber-500 text-stone-950 border-amber-500'
                        : 'bg-stone-700 text-stone-300 border-stone-600 hover:bg-stone-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón cobrar / cerrar mesa */}
            <button
              onClick={tipoServicio === 'salon' ? cobrarCierre : cobrar}
              disabled={
                tipoServicio === 'salon'
                  ? mesaSeleccionada === null ||
                    carrito.length > 0 ||
                    totalCuentaMesa <= 0
                  : carrito.length === 0
              }
              className={`w-full py-3 rounded-xl bg-amber-500 text-stone-950 font-semibold text-lg hover:bg-amber-400 transition-all shadow-sm disabled:bg-stone-700 disabled:text-stone-500 disabled:cursor-not-allowed flex items-center justify-center gap-2${
                tipoServicio === 'salon' &&
                carrito.length === 0 &&
                totalCuentaMesa > 0
                  ? ' shadow-lg shadow-amber-500/25 ring-1 ring-amber-500/50'
                  : ''
              }`}
            >
              {tipoServicio === 'salon'
                ? `Cobrar y Cerrar Mesa $${totalCobro}`
                : `Cobrar $${totalCobro}`}
            </button>
            {tipoServicio === 'salon' && errorCierre && (
              <p className="mt-2 text-xs text-red-400 text-center">
                {errorCierre}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de personalización rápida */}
      {productoSel && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={cerrarPersonalizacion}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="text-lg font-bold text-stone-100">
                  {productoSel.nombre}
                </h2>
                <p className="text-xs text-stone-500">
                  Base ${productoSel.precio} c/u
                </p>
              </div>
              <button
                onClick={cerrarPersonalizacion}
                aria-label="Cerrar"
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tipo de leche */}
            <div className="py-3 border-b border-stone-800">
              <div className="text-sm font-medium text-stone-300 mb-2">
                Tipo de leche
              </div>
              <div className="flex flex-wrap gap-2">
                {leches.map(leche => {
                  const activa = lecheSel === leche.id;
                  return (
                    <button
                      key={leche.id}
                      onClick={() => setLecheSel(leche.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        activa
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                          : 'border-stone-700 bg-stone-900 text-stone-400 hover:text-stone-200 hover:border-stone-600'
                      }`}
                    >
                      {leche.etiqueta}
                      {leche.recargo > 0 && ` +$${leche.recargo}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modificadores de receta */}
            <div className="py-3 border-b border-stone-800">
              <div className="text-sm font-medium text-stone-300 mb-2">
                Modificadores de receta
              </div>
              <div className="flex flex-wrap gap-2">
                {extrasReceta.map(op => {
                  const activa = extrasSel.includes(op.id);
                  return (
                    <button
                      key={op.id}
                      onClick={() => alternarExtra(op.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        activa
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                          : 'border-stone-700 bg-stone-900 text-stone-400 hover:text-stone-200 hover:border-stone-600'
                      }`}
                    >
                      {op.etiqueta}
                      {op.recargo > 0 && ` +$${op.recargo}`}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-stone-600">
                Quitar ingredientes no altera el precio base.
              </p>
            </div>

            {/* Notas especiales */}
            <div className="py-3">
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Notas especiales
              </label>
              <input
                type="text"
                value={notaTxt}
                onChange={e => setNotaTxt(e.target.value)}
                maxLength={80}
                placeholder="Ej. bien caliente, edulcorante en sobre"
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={confirmarPersonalizacion}
              className="mt-1 w-full py-3 rounded-lg bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 transition-colors"
            >
              Agregar a la comanda · ${precioPersonalizado}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Egreso / Retiro de caja */}
      {modalEgreso && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setModalEgreso(false)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-500" />
                Registrar Egreso
              </h2>
              <button
                onClick={() => setModalEgreso(false)}
                aria-label="Cerrar"
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!turnoAbierto ? (
              <div className="space-y-3">
                <p className="text-sm text-stone-400">
                  No hay un turno abierto. Abrí la caja primero para poder
                  registrar retiros.
                </p>
                <button
                  onClick={() => setModalEgreso(false)}
                  className="w-full py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : exitoEgreso ? (
              <div className="space-y-3">
                <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {exitoEgreso}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExitoEgreso(null)}
                    className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                  >
                    Registrar otro
                  </button>
                  <button
                    onClick={() => setModalEgreso(false)}
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Monto en efectivo retirado ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    autoFocus
                    value={montoEgresoTxt}
                    onChange={e => {
                      setMontoEgresoTxt(e.target.value);
                      setErrorEgreso(null);
                    }}
                    placeholder="0"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Motivo (obligatorio)
                  </label>
                  <input
                    type="text"
                    value={motivoEgreso}
                    onChange={e => {
                      setMotivoEgreso(e.target.value);
                      setErrorEgreso(null);
                    }}
                    maxLength={80}
                    placeholder="Ej. Compra de hielo urgente"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {errorEgreso && (
                  <p className="text-sm text-red-400">{errorEgreso}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalEgreso(false)}
                    className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarEgreso}
                    className="flex-[2] py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
                  >
                    Confirmar retiro
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de caja cerrada */}
      {modalCajaCerrada && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setModalCajaCerrada(false)}
        >
          <div
            className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-stone-100">
              Caja Cerrada
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              Para cobrar debes iniciar un turno de caja.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setModalCajaCerrada(false)}
                className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setModalCajaCerrada(false);
                  abrirModalArqueo();
                }}
                className="flex-[2] py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
              >
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de pago mixto / dividido */}
      {modalMixto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setModalMixto(false)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                Pago Mixto
              </h2>
              <button
                onClick={() => setModalMixto(false)}
                aria-label="Cerrar"
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-stone-900 border border-stone-800 px-4 py-3 flex justify-between text-sm mb-4">
              <span className="text-stone-400">Total de la cuenta</span>
              <span className="font-bold text-amber-400">${totalCobro}</span>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Precio regular sin descuento por efectivo (aplica solo al pago
              100% en efectivo).
            </p>

            <div className="mb-3">
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Monto en efectivo ($)
              </label>
              <input
                type="number"
                min={0}
                max={totalCobro}
                autoFocus
                value={efectivoMixtoTxt}
                onChange={e => setEfectivoMixtoTxt(e.target.value)}
                placeholder="0"
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="rounded-xl bg-stone-900 border border-stone-800 px-4 py-3 flex justify-between text-sm mb-4">
              <span className="text-stone-400">Saldo restante (digital)</span>
              <span
                className={`font-bold ${restoMixto > 0 && restoMixto < totalCobro ? 'text-sky-400' : 'text-stone-500'}`}
              >
                ${restoMixto}
              </span>
            </div>

            <div className="mb-4">
              <div className="text-xs text-stone-400 mb-2 uppercase tracking-wide">
                El saldo se cobra con
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'transferencia', label: 'MP / QR' },
                    { id: 'tarjeta', label: 'Tarjeta' },
                  ] as const
                ).map(op => (
                  <button
                    key={op.id}
                    onClick={() => setMetodoDigitalMixto(op.id)}
                    className={`py-2 px-1 rounded-lg text-xs font-medium transition-colors border ${
                      metodoDigitalMixto === op.id
                        ? 'bg-amber-500 text-stone-950 border-amber-500'
                        : 'bg-stone-700 text-stone-300 border-stone-600 hover:bg-stone-600'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalMixto(false)}
                className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarMixto}
                disabled={!mixtoValido}
                className="flex-[2] py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Confirmar ${efectivoMixtoTxt || 0} ef. + ${mixtoValido ? totalCobro - efectivoMixto : 0} dig.
              </button>
            </div>
            {!mixtoValido && (
              <p className="mt-2 text-xs text-stone-500 text-center">
                Ingresá un monto en efectivo mayor a 0 y menor a ${totalCobro}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal de ronda pendiente */}
      {modalRondaPendiente && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setModalRondaPendiente(false)}
        >
          <div
            className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-stone-100">Atención</h2>
            <p className="mt-2 text-sm text-stone-400">
              Hay ítems por marchar. Debes marchar la ronda o vaciar la
              selección antes de cerrar la cuenta.
            </p>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => {
                  setModalRondaPendiente(false);
                  marchar();
                }}
                className="w-full py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
              >
                Marchar ahora
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCarrito([]);
                    setModalRondaPendiente(false);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                >
                  Vaciar selección
                </button>
                <button
                  onClick={() => setModalRondaPendiente(false)}
                  className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cambio de mesa con ronda sin marchar */}
      {mesaPendiente !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setMesaPendiente(null)}
        >
          <div
            className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-stone-100">Atención</h2>
            <p className="mt-2 text-sm text-stone-400">
              Tienes productos sin marchar en esta mesa. ¿Deseas descartar
              los cambios y cambiar de mesa?
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setMesaPendiente(null)}
                className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioMesa}
                className="flex-[2] py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
              >
                Descartar y cambiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exceso de caja */}
      {excesoEgreso && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setExcesoEgreso(null)}
        >
          <div
            className="w-full max-w-sm bg-stone-950 border border-amber-500/50 rounded-2xl p-5 text-center"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-amber-400">Atención</h2>
            <p className="mt-2 text-sm text-stone-300">
              El egreso de ${excesoEgreso.monto} supera el efectivo
              disponible en caja (${excesoEgreso.disponible}). La caja
              quedará con saldo negativo.
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Motivo: {excesoEgreso.motivo}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setExcesoEgreso(null)}
                className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExcesoEgreso}
                className="flex-[2] py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
              >
                Confirmar igual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Arqueo / Cierre de turno */}
      {modalArqueo !== 'cerrado' && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setModalArqueo('cerrado')}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500" />
                {modalArqueo === 'abrir' && 'Abrir caja'}
                {modalArqueo === 'cerrar' && 'Cierre ciego de turno'}
                {modalArqueo === 'resultado' && 'Resultado del arqueo'}
              </h2>
              <button
                onClick={() => setModalArqueo('cerrado')}
                aria-label="Cerrar"
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalArqueo === 'cerrar' &&
              mesas.some(
                m => m.estado === 'ocupada' && m.totalAcumulado > 0,
              ) && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 mb-3 text-xs font-medium text-amber-300">
                  Atención: Hay mesas abiertas en el salón. Debes cobrarlas
                  o anularlas antes de cerrar la caja definitiva.
                </div>
              )}

            {/* Abrir caja con monto inicial */}
            {modalArqueo === 'abrir' && (
              <div className="space-y-3">
                <p className="text-sm text-stone-400">
                  No hay un turno abierto. Ingresá el monto inicial en
                  efectivo para abrir la caja.
                </p>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Monto inicial en efectivo ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    autoFocus
                    value={montoInicialTxt}
                    onChange={e => {
                      setMontoInicialTxt(e.target.value);
                      setErrorArqueo(null);
                    }}
                    placeholder="0"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {errorArqueo && (
                  <p className="text-sm text-red-400">{errorArqueo}</p>
                )}
                <button
                  onClick={confirmarApertura}
                  className="w-full py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
                >
                  Abrir caja
                </button>
              </div>
            )}

            {/* Cierre ciego: el cajero NO ve el esperado */}
            {modalArqueo === 'cerrar' && (
              <div className="space-y-3">
                <p className="text-sm text-stone-400">
                  Contá el efectivo de la registradora e ingresá el total.
                  Por seguridad, el sistema no muestra cuánto debería haber
                  hasta confirmar.
                </p>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Efectivo contado en caja ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    autoFocus
                    value={montoContadoTxt}
                    onChange={e => {
                      setMontoContadoTxt(e.target.value);
                      setErrorArqueo(null);
                    }}
                    placeholder="0"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {errorArqueo && (
                  <p className="text-sm text-red-400">{errorArqueo}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalArqueo('cerrado')}
                    className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarCierre}
                    className="flex-[2] py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
                  >
                    Confirmar cierre
                  </button>
                </div>
              </div>
            )}

            {/* Resultado de la auditoría */}
            {modalArqueo === 'resultado' && ultimoArqueo && (
              <div className="space-y-3">
                <div className="text-center py-2">
                  <span
                    className={`inline-block rounded-full border px-4 py-1.5 text-base font-bold ${
                      ultimoArqueo.resultado === 'sobrante'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : ultimoArqueo.resultado === 'faltante'
                          ? 'border-red-500/50 bg-red-500/10 text-red-300'
                          : 'border-stone-600 bg-stone-800 text-stone-200'
                    }`}
                  >
                    {ETIQUETA_RESULTADO[ultimoArqueo.resultado]}
                  </span>
                </div>
                <div className="rounded-xl bg-stone-900 border border-stone-800 divide-y divide-stone-800 text-sm">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-stone-400">Efectivo contado</span>
                    <span className="font-bold text-stone-100">
                      ${ultimoArqueo.montoContado}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-stone-400">Efectivo esperado</span>
                    <span className="font-bold text-stone-100">
                      ${ultimoArqueo.efectivoEsperado}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-stone-400">Diferencia</span>
                    <span
                      className={`font-bold ${
                        ultimoArqueo.resultado === 'sobrante'
                          ? 'text-emerald-400'
                          : ultimoArqueo.resultado === 'faltante'
                            ? 'text-red-400'
                            : 'text-stone-300'
                      }`}
                    >
                      {ultimoArqueo.diferencia > 0 ? '+' : ''}$
                      {ultimoArqueo.diferencia}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-stone-500 text-center">
                  Inicial ${ultimoArqueo.montoInicial} + Ventas efectivo $
                  {ultimoArqueo.ventasEfectivo} − Egresos $
                  {ultimoArqueo.egresos} · El arqueo quedó registrado para
                  auditoría.
                </p>
                <button
                  onClick={() => setModalArqueo('cerrado')}
                  className="w-full py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
                >
                  Entendido
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
