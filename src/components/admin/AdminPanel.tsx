import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  CalendarDays,
  ClipboardList,
  Clock,
  Coffee,
  CreditCard,
  DollarSign,
  Eye,
  EyeOff,
  LayoutGrid,
  Pencil,
  Plus,
  QrCode,
  Receipt,
  Save,
  ShoppingBag,
  ToggleLeft,
  ToggleRight,
  Trash,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  Wallet,
  X,
  Download,
  Search,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { CATEGORIAS_BEBIDA } from '../../data/mockData';
import type { Fichaje, Pedido, Producto, Usuario } from '../../types';

const ESTILOS_ESTADO: Record<string, string> = {
  pendiente: 'bg-amber-500/10 text-amber-400 border-amber-500/40',
  anulado: 'bg-red-500/10 text-red-400 border-red-500/40',
  preparacion: 'bg-sky-500/10 text-sky-400 border-sky-500/40',
  listo: 'bg-green-500/10 text-green-400 border-green-500/40',
  entregado: 'bg-stone-600/30 text-stone-300 border-stone-600',
};

const ETIQUETAS_METODO_PAGO: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Mercado Pago / QR',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
};

const ETIQUETA_METODO_DIGITAL: Record<string, string> = {
  tarjeta: 'Tarjeta',
  transferencia: 'MP/QR',
};

const ESTILO_ARQUEO: Record<string, string> = {
  sobrante: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  faltante: 'border-red-500/40 bg-red-500/10 text-red-300',
  exacta: 'border-stone-600 bg-stone-800 text-stone-300',
};

const ETIQUETA_ARQUEO: Record<string, string> = {
  sobrante: 'Sobrante',
  faltante: 'Faltante',
  exacta: 'Exacta',
};

// Franjas horarias para el gráfico de horas pico
const FRANJAS = [
  {
    id: 'manana',
    etiqueta: 'Mañana',
    rango: '6–12',
    test: (h: number) => h >= 6 && h < 12,
  },
  {
    id: 'mediodia',
    etiqueta: 'Mediodía',
    rango: '12–15',
    test: (h: number) => h >= 12 && h < 15,
  },
  {
    id: 'tarde',
    etiqueta: 'Tarde',
    rango: '15–19',
    test: (h: number) => h >= 15 && h < 19,
  },
  {
    id: 'noche',
    etiqueta: 'Noche',
    rango: '19–6',
    test: (h: number) => h >= 19 || h < 6,
  },
];

const METODOS_CHART: {
  id: Pedido['metodoPago'];
  etiqueta: string;
  Icono: React.ElementType;
  barra: string;
}[] = [
  { id: 'efectivo', etiqueta: 'Efectivo', Icono: Banknote, barra: 'bg-emerald-500' },
  { id: 'transferencia', etiqueta: 'Mercado Pago / QR', Icono: QrCode, barra: 'bg-sky-500' },
  { id: 'tarjeta', etiqueta: 'Tarjeta', Icono: CreditCard, barra: 'bg-violet-500' },
];

type FiltroFecha = 'hoy' | 'ayer' | '7dias' | 'rango';

const FILTROS_FECHA: { id: FiltroFecha; etiqueta: string }[] = [
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'ayer', etiqueta: 'Ayer' },
  { id: '7dias', etiqueta: 'Últimos 7 días' },
  { id: 'rango', etiqueta: 'Rango' },
];

type TabAdmin =
  | 'resumen'
  | 'catalogo'
  | 'salon'
  | 'caja'
  | 'personal'
  | 'informes';

const TABS_ADMIN: {
  id: TabAdmin;
  etiqueta: string;
  Icono: React.ElementType;
}[] = [
  { id: 'resumen', etiqueta: 'Resumen & Ventas', Icono: TrendingUp },
  { id: 'catalogo', etiqueta: 'Catálogo & Precios', Icono: Coffee },
  { id: 'salon', etiqueta: 'Salón / Mesas', Icono: LayoutGrid },
  { id: 'caja', etiqueta: 'Caja & Egresos', Icono: Wallet },
  { id: 'personal', etiqueta: 'Personal & Asistencia', Icono: Users },
  { id: 'informes', etiqueta: 'Exportar Datos', Icono: Download },
];

const CLAVE_TAB = 'coffeepos:admin-tab';

const cargarTab = (): TabAdmin => {
  try {
    const guardado = localStorage.getItem(CLAVE_TAB);
    if (
      guardado === 'resumen' ||
      guardado === 'catalogo' ||
      guardado === 'salon' ||
      guardado === 'caja' ||
      guardado === 'personal' ||
      guardado === 'informes'
    ) {
      return guardado;
    }
  } catch {
    // Sin preferencia guardada
  }
  return 'resumen';
};

const inicioDelDia = (fecha: Date): Date => {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
};

const aISOFecha = (fecha: Date): string => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const desdeISOFecha = (texto: string): Date => {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
};

const CLASE_INPUT =
  'w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500';

const AdminPanel: React.FC = () => {
  const {
    pedidos = [],
    productos = [],
    categorias = [],
    toggleProductoDisponible,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    turnoCaja,
    fichajes = [],
    arqueos = [],
    modificadores = [],
    actualizarModificador,
    empleados = [],
    agregarEmpleado,
    actualizarEmpleado,
    desactivarEmpleado,
    egresos: egresosRegistrados = [],
    anularPedido,
    mesas = [],
    agregarMesa,
    eliminarMesa,
    configCobro,
    actualizarConfigCobro,
    crearCategoria,
  } = useAppContext();

  // ---------- Pestañas (con persistencia local) ----------
  const [tabActivo, setTabActivo] = useState<TabAdmin>(cargarTab);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_TAB, tabActivo);
    } catch {
      // Sin persistencia disponible
    }
  }, [tabActivo]);

  // ---------- Anulación auditada ----------
  const [pedidoAAnular, setPedidoAAnular] = useState<Pedido | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null);

  const abrirAnulacion = (pedido: Pedido) => {
    setPedidoAAnular(pedido);
    setMotivoAnulacion('');
    setErrorAnulacion(null);
  };

  const cerrarAnulacion = () => {
    setPedidoAAnular(null);
    setMotivoAnulacion('');
    setErrorAnulacion(null);
  };

  const confirmarAnulacion = () => {
    if (!pedidoAAnular) return;
    if (motivoAnulacion.trim() === '') {
      setErrorAnulacion('El motivo es obligatorio para auditar la anulación.');
      return;
    }
    anularPedido(pedidoAAnular.id, motivoAnulacion.trim());
    cerrarAnulacion();
  };

  // ---------- Egresos ordenados ----------
  const egresosOrdenados = useMemo(
    () =>
      [...egresosRegistrados].sort(
        (a, b) =>
          new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
      ),
    [egresosRegistrados],
  );

  const totalEgresos = useMemo(
    () => egresosRegistrados.reduce((acc, egreso) => acc + egreso.monto, 0),
    [egresosRegistrados],
  );

  // ---------- Salón / Mesas (gestión dinámica de capacidad) ----------
  const [msgSalon, setMsgSalon] = useState<string | null>(null);

  const mesasOrdenadasAdmin = useMemo(
    () => [...mesas].sort((a, b) => a.numero - b.numero),
    [mesas],
  );

  const mesasLibres = mesas.filter(m => m.estado !== 'ocupada').length;

  const quitarMesa = (numero: number) => {
    const r = eliminarMesa(numero);
    setMsgSalon(r.ok ? null : r.error);
  };

  // ---------- Filtro de fechas ----------
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('hoy');
  const [desdeTxt, setDesdeTxt] = useState(() => aISOFecha(new Date()));
  const [hastaTxt, setHastaTxt] = useState(() => aISOFecha(new Date()));

  const etiquetaFiltro =
    FILTROS_FECHA.find(f => f.id === filtroFecha)?.etiqueta ?? '';

  const pedidosFiltrados = useMemo(() => {
    const hoyIni = inicioDelDia(new Date());
    const DIA = 86400000;
    let desde: Date | null = null;
    let hasta: Date | null = null;

    if (filtroFecha === 'hoy') {
      desde = hoyIni;
    } else if (filtroFecha === 'ayer') {
      desde = new Date(hoyIni.getTime() - DIA);
      hasta = hoyIni;
    } else if (filtroFecha === '7dias') {
      desde = new Date(hoyIni.getTime() - 6 * DIA);
    } else {
      let a = inicioDelDia(desdeISOFecha(desdeTxt));
      let b = inicioDelDia(desdeISOFecha(hastaTxt));
      if (a.getTime() > b.getTime()) {
        const tmp = a;
        a = b;
        b = tmp;
      }
      desde = a;
      hasta = new Date(b.getTime() + DIA);
    }

    return pedidos.filter(pedido => {
      const t = new Date(pedido.fechaCreacion).getTime();
      if (desde && t < desde.getTime()) return false;
      if (hasta && t >= hasta.getTime()) return false;
      return true;
    });
  }, [pedidos, filtroFecha, desdeTxt, hastaTxt]);

  // Pedidos contables: excluye anulados (facturación, métodos, franjas, caja)
  const pedidosContables = useMemo(
    () =>
      pedidosFiltrados.filter(
        pedido => pedido.estado !== 'anulado' && pedido.cobrado !== false,
      ),
    [pedidosFiltrados],
  );

  // ---------- Métricas (KPIs según filtro) ----------
  const totalFacturado = useMemo(
    () => pedidosContables.reduce((acc, pedido) => acc + pedido.total, 0),
    [pedidosContables],
  );

  const cantidadPedidos = pedidosContables.length;

  const ticketPromedio =
    cantidadPedidos > 0 ? Math.round(totalFacturado / cantidadPedidos) : 0;

  // Caja: siempre global (turno actual + efectivo cobrado no anulado,
  // incluyendo la fracción en efectivo de los pagos mixtos)
  const ingresosEfectivo = useMemo(
    () =>
      pedidos
        .filter(
          pedido =>
            pedido.estado !== 'anulado' &&
            pedido.cobrado !== false &&
            (pedido.metodoPago === 'efectivo' ||
              (pedido.metodoPago === 'mixto' &&
                pedido.desglosePago !== undefined)),
        )
        .reduce(
          (acc, pedido) =>
            acc +
            (pedido.metodoPago === 'mixto' && pedido.desglosePago
              ? pedido.desglosePago.efectivo
              : pedido.total),
          0,
        ),
    [pedidos],
  );

  const montoInicial = turnoCaja?.montoInicial ?? 0;
  const egresos = turnoCaja?.egresosTotales ?? 0;
  const estadoCaja = montoInicial + ingresosEfectivo - egresos;

  const detalleCaja = turnoCaja
    ? turnoCaja.estado === 'abierto'
      ? 'Turno abierto'
      : 'Turno cerrado'
    : 'Sin turno abierto';

  const kpis = [
    {
      label: 'Total facturado',
      valor: `$${totalFacturado}`,
      detalle: `Según filtro: ${etiquetaFiltro}`,
      Icono: DollarSign,
    },
    {
      label: 'Pedidos procesados',
      valor: String(cantidadPedidos),
      detalle: `Según filtro: ${etiquetaFiltro}`,
      Icono: ShoppingBag,
    },
    {
      label: 'Ticket promedio',
      valor: `$${ticketPromedio}`,
      detalle: 'Facturado / pedidos del período',
      Icono: TrendingUp,
    },
    {
      label: 'Estado de caja',
      valor: `$${estadoCaja}`,
      detalle: `Inicial $${montoInicial} + Efectivo $${ingresosEfectivo} − Egresos $${egresos} · ${detalleCaja}`,
      Icono: Coffee,
    },
  ];

  // ---------- Historial de ventas (filtrado) ----------
  const historial = useMemo(
    () =>
      [...pedidosFiltrados].sort(
        (a, b) =>
          new Date(b.fechaCreacion).getTime() -
          new Date(a.fechaCreacion).getTime(),
      ),
    [pedidosFiltrados],
  );

  const nombreCategoria = (categoriaId: string) =>
    categorias.find(cat => cat.id === categoriaId)?.nombre ?? categoriaId;

  // ---------- Métricas avanzadas (gráficos) ----------
  const ventasPorFranja = useMemo(
    () =>
      FRANJAS.map(franja => {
        const deFranja = pedidosContables.filter(pedido => {
          const d = new Date(pedido.fechaCreacion);
          return franja.test(d.getHours() + d.getMinutes() / 60);
        });
        return {
          ...franja,
          cantidad: deFranja.length,
          total: deFranja.reduce((acc, pedido) => acc + pedido.total, 0),
        };
      }),
    [pedidosContables],
  );

  const maxFranja = Math.max(0, ...ventasPorFranja.map(f => f.cantidad));

  const { filasMetodo, totalMetodos } = useMemo(() => {
    // Acumula por método: los pagos mixtos aportan su fracción en efectivo
    // a la fila Efectivo y su fracción digital a la fila correspondiente
    // (la cantidad cuenta pedidos que tocaron el método).
    const acum = new Map<string, { cantidad: number; total: number }>();
    METODOS_CHART.forEach(metodo =>
      acum.set(metodo.id ?? 'sin-metodo', { cantidad: 0, total: 0 }),
    );
    pedidosContables.forEach(pedido => {
      if (pedido.metodoPago === 'mixto' && pedido.desglosePago) {
        const ef = acum.get('efectivo');
        if (ef) {
          ef.cantidad += 1;
          ef.total += pedido.desglosePago.efectivo;
        }
        const dig = acum.get(pedido.desglosePago.metodoDigital);
        if (dig) {
          dig.cantidad += 1;
          dig.total += pedido.desglosePago.digital;
        }
        return;
      }
      const fila = acum.get(pedido.metodoPago ?? 'sin-metodo');
      if (fila) {
        fila.cantidad += 1;
        fila.total += pedido.total;
      }
    });
    const filas = METODOS_CHART.map(metodo => ({
      ...metodo,
      cantidad: acum.get(metodo.id ?? 'sin-metodo')?.cantidad ?? 0,
      total: acum.get(metodo.id ?? 'sin-metodo')?.total ?? 0,
    }));
    const total = filas.reduce((acc, fila) => acc + fila.total, 0);
    return {
      filasMetodo: filas.map(fila => ({
        ...fila,
        porcentaje: total > 0 ? Math.round((fila.total / total) * 100) : 0,
      })),
      totalMetodos: total,
    };
  }, [pedidosContables]);

  const arqueosOrdenados = useMemo(
    () =>
      [...arqueos].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      ),
    [arqueos],
  );

  const formatearHora = (fecha: Date) =>
    new Date(fecha).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const etiquetaMesa = (mesaNumero: number, tipoServicio: string) =>
    tipoServicio === 'takeaway' ? 'Take Away' : `Mesa ${mesaNumero}`;

  // ---------- Modal Nuevo / Editar producto ----------
  const [modalProducto, setModalProducto] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(
    null,
  );
  // ---------- Gestión de Personal ----------
  const [modalEmpleado, setModalEmpleado] = useState(false);
  const [empleadoEnEdicion, setEmpleadoEnEdicion] = useState<Usuario | null>(
    null,
  );
  const [nombreEmp, setNombreEmp] = useState('');
  const [pinEmp, setPinEmp] = useState('');
  const [rolEmp, setRolEmp] = useState<'admin' | 'cajero' | 'barista'>('cajero');
  const [errorEmp, setErrorEmp] = useState<string | null>(null);
  const [pinsVisibles, setPinsVisibles] = useState<Record<string, boolean>>({});
  const [empleadoADesactivar, setEmpleadoADesactivar] =
    useState<Usuario | null>(null);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  const abrirNuevoEmpleado = () => {
    setEmpleadoEnEdicion(null);
    setNombreEmp('');
    setPinEmp('');
    setRolEmp('cajero');
    setErrorEmp(null);
    setModalEmpleado(true);
  };

  const abrirEdicionEmpleado = (emp: Usuario) => {
    setEmpleadoEnEdicion(emp);
    setNombreEmp(emp.nombre);
    setPinEmp(emp.pin);
    setRolEmp(emp.rol);
    setErrorEmp(null);
    setModalEmpleado(true);
  };

  const cerrarModalEmpleado = () => {
    setModalEmpleado(false);
    setEmpleadoEnEdicion(null);
    setErrorEmp(null);
  };

  const guardarEmpleado = () => {
    if (nombreEmp.trim() === '') {
      setErrorEmp('El nombre es obligatorio.');
      return;
    }
    if (empleadoEnEdicion) {
      const r = actualizarEmpleado(empleadoEnEdicion.id, {
        nombre: nombreEmp.trim(),
        pin: pinEmp,
        rol: rolEmp,
      });
      if (!r.ok) {
        setErrorEmp(r.error);
        return;
      }
    } else {
      const r = agregarEmpleado({
        nombre: nombreEmp.trim(),
        pin: pinEmp,
        rol: rolEmp,
      });
      if (!r.ok) {
        setErrorEmp(r.error);
        return;
      }
    }
    cerrarModalEmpleado();
  };

  const alternarActivo = (emp: Usuario) => {
    if (emp.activo) {
      setErrorBaja(null);
      setEmpleadoADesactivar(emp);
    } else {
      actualizarEmpleado(emp.id, { activo: true });
    }
  };

  const cerrarModalBaja = () => {
    setEmpleadoADesactivar(null);
    setErrorBaja(null);
  };

  const confirmarBaja = () => {
    if (!empleadoADesactivar) return;
    const r = desactivarEmpleado(empleadoADesactivar.id);
    if (!r.ok) {
      setErrorBaja(r.error);
      return;
    }
    cerrarModalBaja();
  };

  const alternarPinVisible = (id: string) => {
    setPinsVisibles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioTxt, setPrecioTxt] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [modsTxt, setModsTxt] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [personalizable, setPersonalizable] = useState(true);
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Modificadores globales por grupo (precios editables por el dueño)
  const lechesAdmin = modificadores.filter(m => m.grupo === 'leche');
  const extrasAdmin = modificadores.filter(m => m.grupo === 'extra');

  const confirmarRecargo = (id: string) => {
    const texto = borradores[id];
    if (texto === undefined) return;
    const valor = Number(texto);
    if (Number.isFinite(valor) && valor >= 0) {
      actualizarModificador(id, { recargo: Math.round(valor) });
    }
    setBorradores(prev => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  };

  const abrirNuevo = () => {
    const catInicial = categorias[0]?.id ?? '';
    setProductoEnEdicion(null);
    setNombre('');
    setDescripcion('');
    setPrecioTxt('');
    setCategoriaId(catInicial);
    setModsTxt('');
    setEsPromocion(false);
    setPrecioOriginalTxt('');
    setDisponible(true);
    setPersonalizable(CATEGORIAS_BEBIDA.includes(catInicial));
    setErrorForm(null);
    setModalProducto(true);
  };

  const abrirEdicion = (producto: Producto) => {
    setProductoEnEdicion(producto);
    setNombre(producto.nombre);
    setDescripcion(producto.descripcion);
    setPrecioTxt(String(producto.precio));
    setCategoriaId(producto.categoriaId);
    setModsTxt(producto.modificadores.join(', '));
    setEsPromocion(producto.esPromocion ?? false);
    setPrecioOriginalTxt(
      producto.precioOriginal !== undefined
        ? String(producto.precioOriginal)
        : '',
    );
    setDisponible(producto.disponible);
    setPersonalizable(
      producto.personalizable ??
        CATEGORIAS_BEBIDA.includes(producto.categoriaId),
    );
    setErrorForm(null);
    setModalProducto(true);
  };

  const cerrarModalProducto = () => {
    setModalProducto(false);
    setProductoEnEdicion(null);
    setErrorForm(null);
  };

  // ---------- Políticas de cobro (borrador local) ----------
  const [descHabilitado, setDescHabilitado] = useState(
    configCobro.descuentoEfectivoHabilitado,
  );
  const [porcTxt, setPorcTxt] = useState(
    String(configCobro.descuentoEfectivoPorcentaje),
  );
  const [msgConfig, setMsgConfig] = useState<string | null>(null);
  const [esPromocion, setEsPromocion] = useState(false);
  const [precioOriginalTxt, setPrecioOriginalTxt] = useState('');

  const [confirmaDescuento, setConfirmaDescuento] = useState(false);

  const guardarPoliticas = () => {
    const pct = Number(porcTxt);
    if (!Number.isFinite(pct) || pct < 0 || pct > 90) {
      setMsgConfig('Ingresá un porcentaje válido entre 0 y 90.');
      return;
    }
    const redondeado = Math.round(pct);
    if (redondeado > 30 && !confirmaDescuento) {
      setConfirmaDescuento(true);
      setMsgConfig(null);
      return;
    }
    actualizarConfigCobro({
      descuentoEfectivoHabilitado: descHabilitado,
      descuentoEfectivoPorcentaje: redondeado,
    });
    setConfirmaDescuento(false);
    setMsgConfig('Políticas guardadas. El POS las aplica al instante.');
  };

  // ---------- Catálogo: búsqueda, filtro y exportaciones ----------
  const [busquedaProd, setBusquedaProd] = useState('');
  const [filtroCatProd, setFiltroCatProd] = useState('todas');
  const [modalCategoria, setModalCategoria] = useState(false);
  const [nombreCat, setNombreCat] = useState('');
  const [errorCat, setErrorCat] = useState<string | null>(null);

  const productosFiltrados = useMemo(() => {
    const texto = busquedaProd.trim().toLowerCase();
    return productos.filter(p => {
      const coincideTexto =
        texto === '' || p.nombre.toLowerCase().includes(texto);
      const coincideCat =
        filtroCatProd === 'todas' || p.categoriaId === filtroCatProd;
      return coincideTexto && coincideCat;
    });
  }, [productos, busquedaProd, filtroCatProd]);

  const exportarCatalogo = () => {
    const filas: (string | number)[][] = [
      [
        'ID',
        'Nombre',
        'Categoría',
        'Precio',
        'Disponible',
        'Es Promo',
        'Precio Original',
        'Modificadores',
      ],
    ];
    productos.forEach(p => {
      filas.push([
        p.id,
        p.nombre,
        nombreCategoria(p.categoriaId),
        p.precio,
        p.disponible ? 'Sí' : 'No',
        p.esPromocion ? 'Sí' : 'No',
        p.precioOriginal ?? '',
        p.modificadores.join(', '),
      ]);
    });
    descargarCSV(`catalogo-${aISOFecha(new Date())}.csv`, filas);
  };

  const exportarCaja = () => {
    const filas: (string | number)[][] = [
      ['Tipo', 'Fecha', 'Hora', 'Cajero', 'Monto', 'Detalle'],
    ];
    if (turnoCaja) {
      const { dia, hora } = formatearFechaHora(turnoCaja.fechaApertura);
      filas.push([
        'Apertura',
        dia,
        hora,
        '—',
        turnoCaja.montoInicial,
        'Turno en curso',
      ]);
    }
    arqueosOrdenados.forEach(a => {
      const { dia, hora } = formatearFechaHora(a.fecha);
      const etiqueta = ETIQUETA_ARQUEO[a.resultado] ?? a.resultado;
      filas.push([
        'Arqueo',
        dia,
        hora,
        a.usuarioNombre,
        a.montoContado,
        `${etiqueta} (dif. ${a.diferencia >= 0 ? '+' : ''}$${a.diferencia})`,
      ]);
    });
    egresosOrdenados.forEach(e => {
      const { dia, hora } = formatearFechaHora(e.fechaHora);
      filas.push(['Egreso', dia, hora, e.usuarioNombre, -e.monto, e.motivo]);
    });
    descargarCSV(`caja-${aISOFecha(new Date())}.csv`, filas);
  };

  const abrirModalCategoria = () => {
    setNombreCat('');
    setErrorCat(null);
    setModalCategoria(true);
  };

  const cerrarModalCategoria = () => {
    setModalCategoria(false);
    setErrorCat(null);
  };

  const guardarCategoria = () => {
    const r = crearCategoria(nombreCat);
    if (!r.ok) {
      setErrorCat(r.error);
      return;
    }
    cerrarModalCategoria();
  };

  const guardarProducto = () => {
    const precio = Number(precioTxt);
    if (nombre.trim() === '') {
      setErrorForm('El nombre del producto es obligatorio.');
      return;
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      setErrorForm('Ingresá un precio válido mayor a 0.');
      return;
    }
    if (categoriaId === '') {
      setErrorForm('Elegí una categoría.');
      return;
    }
    let precioOriginal: number | undefined;
    if (esPromocion) {
      precioOriginal = Number(precioOriginalTxt);
      if (!Number.isFinite(precioOriginal) || precioOriginal <= 0) {
        setErrorForm('Ingresá el precio original de lista para la promo.');
        return;
      }
      if (precioOriginal <= precio) {
        setErrorForm('El precio original debe ser mayor al precio promo.');
        return;
      }
    }
    const modsLista = modsTxt
      .split(',')
      .map(m => m.trim())
      .filter(m => m !== '');

    if (productoEnEdicion) {
      actualizarProducto(productoEnEdicion.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio,
        categoriaId,
        modificadores: modsLista,
        disponible,
        personalizable,
        esPromocion,
        precioOriginal,
      });
    } else {
      agregarProducto({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio,
        categoriaId,
        imagen: '',
        disponible,
        modificadores: modsLista,
        personalizable,
        esPromocion,
        precioOriginal,
      });
    }
    cerrarModalProducto();
  };

  const [modalEliminar, setModalEliminar] = useState<{
    producto: Producto;
    modo: 'confirmar' | 'info';
  } | null>(null);

  const eliminar = (producto: Producto) => {
    const hoyIni = inicioDelDia(new Date());
    const enUso = pedidos.some(
      pedido =>
        (pedido.estado === 'pendiente' ||
          pedido.estado === 'preparacion' ||
          pedido.estado === 'listo' ||
          new Date(pedido.fechaCreacion).getTime() >= hoyIni.getTime()) &&
        (pedido.items ?? []).some(item => item.productoId === producto.id),
    );
    if (enUso) {
      actualizarProducto(producto.id, { disponible: false });
      setModalEliminar({ producto, modo: 'info' });
      return;
    }
    setModalEliminar({ producto, modo: 'confirmar' });
  };

  const confirmarEliminacion = () => {
    if (modalEliminar?.modo !== 'confirmar') return;
    eliminarProducto(modalEliminar.producto.id);
    setModalEliminar(null);
  };

  const formatearDuracion = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  };

  const tiempoDesdeAhora = (inicio: Date) =>
    Math.max(
      0,
      Math.floor((Date.now() - new Date(inicio).getTime()) / 60000),
    );

  // ---------- Resumen de horas por jornada ----------
  // Empareja cada Entrada con su Salida del mismo empleado y día
  const resumenJornadas = useMemo(() => {
    const grupos = new Map<string, Fichaje[]>();
    fichajes.forEach(ficha => {
      const dia = aISOFecha(new Date(ficha.fechaHora));
      const clave = `${ficha.usuarioId}|${dia}`;
      const lista = grupos.get(clave) ?? [];
      lista.push(ficha);
      grupos.set(clave, lista);
    });

    return [...grupos.entries()]
      .map(([clave, lista]) => {
        const ordenada = [...lista].sort(
          (a, b) =>
            new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime(),
        );
        let minutos = 0;
        let pares = 0;
        let abierta: Date | null = null;
        let primeraEntrada: Date | null = null;
        let ultimaSalida: Date | null = null;
        ordenada.forEach(ficha => {
          if (ficha.tipo === 'entrada') {
            if (!abierta) {
              abierta = new Date(ficha.fechaHora);
              if (!primeraEntrada) primeraEntrada = new Date(ficha.fechaHora);
            }
          } else if (abierta) {
            minutos += Math.max(
              0,
              Math.round(
                (new Date(ficha.fechaHora).getTime() - abierta.getTime()) /
                  60000,
              ),
            );
            pares += 1;
            abierta = null;
            ultimaSalida = new Date(ficha.fechaHora);
          }
        });
        const primera = ordenada[0];
        const diaISO = clave.split('|')[1] ?? '';
        const horaCorta = (d: Date) =>
          d.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          });
        return {
          clave,
          usuarioId: primera.usuarioId,
          usuarioNombre: primera.usuarioNombre,
          rol: primera.rol,
          dia: `${diaISO.slice(8, 10)}/${diaISO.slice(5, 7)}`,
          diaISO,
          duracion: formatearDuracion(minutos),
          minutos,
          pares,
          entrada: primeraEntrada ? horaCorta(primeraEntrada) : '—',
          salida: ultimaSalida
            ? horaCorta(ultimaSalida)
            : abierta
              ? 'En turno'
              : '—',
          enTurno: abierta !== null,
          tiempoEnTurno: abierta
            ? formatearDuracion(tiempoDesdeAhora(abierta))
            : '',
        };
      })
      .sort((a, b) => (a.diaISO < b.diaISO ? 1 : -1));
  }, [fichajes]);

  // ---------- Métricas nuevas: top productos y cajeros ----------
  const topProductos = useMemo(() => {
    const mapa = new Map<string, { nombre: string; unidades: number }>();
    pedidosContables.forEach(pedido => {
      pedido.items.forEach(item => {
        const actual = mapa.get(item.productoId) ?? {
          nombre: item.nombre,
          unidades: 0,
        };
        actual.unidades += item.cantidad;
        mapa.set(item.productoId, actual);
      });
    });
    return [...mapa.values()]
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 5);
  }, [pedidosContables]);

  const maxUnidades = topProductos[0]?.unidades ?? 0;

  const rendimientoCajeros = useMemo(() => {
    const mapa = new Map<
      string,
      { id: string; nombre: string; pedidos: number; total: number }
    >();
    pedidosContables.forEach(pedido => {
      const clave = pedido.usuarioId ?? 'sin-usuario';
      const actual = mapa.get(clave) ?? {
        id: clave,
        nombre: pedido.usuarioNombre ?? 'Sin identificar',
        pedidos: 0,
        total: 0,
      };
      actual.pedidos += 1;
      actual.total += pedido.total;
      mapa.set(clave, actual);
    });
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [pedidosContables]);

  // ---------- Exportación CSV (Blob, sin dependencias) ----------
  const BOM = '﻿';

  const escaparCSV = (valor: string | number): string => {
    const texto = String(valor);
    return /[";\n\r,]/.test(texto)
      ? `"${texto.replace(/"/g, '""')}"`
      : texto;
  };

  const descargarCSV = (nombre: string, filas: (string | number)[][]) => {
    const contenido =
      BOM + filas.map(fila => fila.map(escaparCSV).join(';')).join('\r\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  const exportarVentas = () => {
    const filas: (string | number)[][] = [
      [
        'ID',
        'Fecha',
        'Hora',
        'Cajero',
        'Método de Pago',
        'Total',
        'Descuento',
        'Estado',
        'Motivo Anulación',
      ],
    ];
    historial.forEach(pedido => {
      const { dia, hora } = formatearFechaHora(pedido.fechaCreacion);
      filas.push([
        pedido.id,
        dia,
        hora,
        pedido.usuarioNombre ?? '—',
        pedido.metodoPago === 'mixto' && pedido.desglosePago
          ? `Mixto ($${pedido.desglosePago.efectivo} Ef. / $${pedido.desglosePago.digital} ${ETIQUETA_METODO_DIGITAL[pedido.desglosePago.metodoDigital] ?? pedido.desglosePago.metodoDigital})`
          : pedido.metodoPago
            ? (ETIQUETAS_METODO_PAGO[pedido.metodoPago] ?? pedido.metodoPago)
            : 'Sin cobrar',
        pedido.total,
        pedido.descuentoMonto ?? 0,
        pedido.estado,
        pedido.motivoAnulacion ?? '',
      ]);
    });
    descargarCSV(`ventas-${aISOFecha(new Date())}.csv`, filas);
  };

  const exportarHoras = () => {
    const filas: (string | number)[][] = [
      ['Empleado', 'Rol', 'Fecha', 'Entrada', 'Salida', 'Horas Netas'],
    ];
    const anio = new Date().getFullYear();
    resumenJornadas.forEach(res => {
      const [dd, mm] = res.dia.split('/');
      filas.push([
        res.usuarioNombre,
        res.rol.charAt(0).toUpperCase() + res.rol.slice(1),
        `${dd}/${mm}/${anio}`,
        res.entrada,
        res.salida,
        res.enTurno ? `En turno (${res.tiempoEnTurno})` : res.duracion,
      ]);
    });
    descargarCSV(`horas-${aISOFecha(new Date())}.csv`, filas);
  };

  // ---------- Control de Asistencia ----------
  const fichajesOrdenados = useMemo(
    () =>
      [...fichajes].sort(
        (a, b) =>
          new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
      ),
    [fichajes],
  );

  // Personal actualmente en turno: último movimiento por usuario = entrada
  const presentesAhora = useMemo(() => {
    const ultimoPorUsuario = new Map<string, Fichaje>();
    [...fichajes]
      .sort(
        (a, b) =>
          new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime(),
      )
      .forEach(ficha => ultimoPorUsuario.set(ficha.usuarioId, ficha));
    return [...ultimoPorUsuario.values()].filter(
      ficha => ficha.tipo === 'entrada',
    );
  }, [fichajes]);

  const formatearFechaHora = (fecha: Date) => {
    const d = new Date(fecha);
    const dia = d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const hora = d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { dia, hora };
  };

  const capitalizarRol = (rol: string) =>
    rol.charAt(0).toUpperCase() + rol.slice(1);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-amber-500">
              Panel de Administración
            </h1>
            <p className="text-sm text-stone-400">
              Métricas, stock y auditoría de ventas del local
            </p>
          </div>
          <span className="text-sm text-stone-400">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Pestañas */}
        <nav
          className="flex gap-2 overflow-x-auto"
          aria-label="Secciones del panel"
        >
          {TABS_ADMIN.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActivo(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                tabActivo === tab.id
                  ? 'bg-amber-500 border-amber-500 text-stone-950'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-600'
              }`}
            >
              <tab.Icono className="h-4 w-4" />
              {tab.etiqueta}
            </button>
          ))}
        </nav>

        {/* ---------- Filtro de fechas ---------- */}
        <section
          className={`bg-stone-950 border border-stone-800 rounded-xl p-4 flex flex-wrap items-center gap-2${tabActivo === 'resumen' ? '' : ' hidden'}`}
        >
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-stone-500 mr-1">
            <CalendarDays className="h-4 w-4" />
            Período
          </span>
          {FILTROS_FECHA.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltroFecha(f.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filtroFecha === f.id
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {f.etiqueta}
            </button>
          ))}
          {filtroFecha === 'rango' && (
            <span className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={desdeTxt}
                max={hastaTxt}
                onChange={e => setDesdeTxt(e.target.value)}
                aria-label="Fecha desde"
                className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-stone-500 text-sm">al</span>
              <input
                type="date"
                value={hastaTxt}
                min={desdeTxt}
                onChange={e => setHastaTxt(e.target.value)}
                aria-label="Fecha hasta"
                className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </span>
          )}
        </section>

        {/* ---------- KPIs ---------- */}
        <section
          className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4${tabActivo === 'resumen' ? '' : ' hidden'}`}
        >
          {kpis.map(({ label, valor, detalle, Icono }) => (
            <div
              key={label}
              className="bg-stone-950 border border-stone-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  {label}
                </span>
                <span className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                  <Icono className="h-4 w-4 text-amber-500" />
                </span>
              </div>
              <div className="text-2xl font-bold text-stone-100">{valor}</div>
              <div className="text-xs text-stone-500 mt-1">{detalle}</div>
            </div>
          ))}
        </section>

        {/* ---------- Métricas avanzadas (gráficos) ---------- */}
        <section
          className={`grid grid-cols-1 lg:grid-cols-2 gap-4${tabActivo === 'resumen' ? '' : ' hidden'}`}
        >
          {/* Horas pico */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-stone-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Horas Pico
              </h2>
              <span className="text-xs text-stone-500">{etiquetaFiltro}</span>
            </div>
            {maxFranja === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">
                Sin ventas en este período.
              </p>
            ) : (
              <div className="flex items-end gap-3 h-48">
                {ventasPorFranja.map(franja => (
                  <div
                    key={franja.id}
                    className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                  >
                    <span className="text-xs font-bold text-stone-200">
                      {franja.cantidad}
                    </span>
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className="w-full max-w-14 rounded-t-md bg-gradient-to-t from-amber-600 to-amber-400"
                        style={{
                          height: `${
                            franja.cantidad === 0
                              ? 0
                              : Math.max(
                                  6,
                                  (franja.cantidad / maxFranja) * 100,
                                )
                          }%`,
                        }}
                        title={`${franja.etiqueta}: ${franja.cantidad} pedidos · $${franja.total}`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-stone-400">
                      {franja.etiqueta}
                    </span>
                    <span className="text-[11px] text-stone-600">
                      {franja.rango} · ${franja.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Métodos de pago */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-100 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-500" />
                Métodos de Pago
              </h2>
              <span className="text-xs text-stone-500">{etiquetaFiltro}</span>
            </div>
            {totalMetodos === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">
                Sin ventas en este período.
              </p>
            ) : (
              <div className="space-y-4 py-2">
                {filasMetodo.map(fila => (
                  <div key={fila.id}>
                    <div className="flex justify-between gap-2 text-sm mb-1.5">
                      <span className="flex items-center gap-1.5 text-stone-300">
                        <fila.Icono className="h-4 w-4 text-amber-500" />
                        {fila.etiqueta}
                        <span className="text-xs text-stone-500">
                          · {fila.cantidad} ventas
                        </span>
                      </span>
                      <span className="font-bold text-stone-100 whitespace-nowrap">
                        ${fila.total}{' '}
                        <span className="text-xs font-normal text-stone-500">
                          ({fila.porcentaje}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${fila.barra}`}
                        style={{ width: `${fila.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Top productos y cajeros ---------- */}
        <section
          className={`grid grid-cols-1 lg:grid-cols-2 gap-4${tabActivo === 'resumen' ? '' : ' hidden'}`}
        >
          {/* Top 5 productos más vendidos */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                Top 5 Productos
              </h2>
              <span className="text-xs text-stone-500">{etiquetaFiltro}</span>
            </div>
            {topProductos.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">
                Sin ventas en este período.
              </p>
            ) : (
              <ol className="space-y-3">
                {topProductos.map((prod, idx) => (
                  <li
                    key={`${prod.nombre}-${idx}`}
                    className="flex items-center gap-3"
                  >
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-amber-500">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2 text-sm mb-1">
                        <span className="text-stone-200 truncate">
                          {prod.nombre}
                        </span>
                        <span className="text-stone-400 whitespace-nowrap">
                          {prod.unidades} u.
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{
                            width: `${
                              maxUnidades > 0
                                ? Math.round(
                                    (prod.unidades / maxUnidades) * 100,
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Rendimiento por cajero */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                Rendimiento por Cajero
              </h2>
              <span className="text-xs text-stone-500">{etiquetaFiltro}</span>
            </div>
            {rendimientoCajeros.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">
                Sin ventas en este período.
              </p>
            ) : (
              <ul className="space-y-2">
                {rendimientoCajeros.map(cajero => (
                  <li
                    key={cajero.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-stone-900 border border-stone-800 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-stone-100 truncate">
                        {cajero.nombre}
                      </div>
                      <div className="text-xs text-stone-500">
                        {cajero.pedidos}{' '}
                        {cajero.pedidos === 1 ? 'pedido' : 'pedidos'}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-amber-500">
                      ${cajero.total}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ---------- Stock y disponibilidad ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'catalogo' ? '' : ' hidden'}`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-bold text-stone-100">
                Stock y Disponibilidad
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Mostrando {productosFiltrados.length} de {productos.length}{' '}
                productos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-stone-800 text-stone-300 text-xs px-2.5 py-1 rounded-full">
                {productos.filter(p => p.disponible).length} disponibles
              </span>
              <button
                onClick={abrirModalCategoria}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nueva Categoría
              </button>
              <button
                onClick={abrirNuevo}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-4 py-2 text-sm transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Nuevo Producto
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2 rounded-lg bg-stone-900 border border-stone-800 px-3 py-2 flex-1 min-w-52">
              <Search className="h-4 w-4 text-stone-500 shrink-0" />
              <input
                type="text"
                value={busquedaProd}
                onChange={e => setBusquedaProd(e.target.value)}
                placeholder="Buscar producto por nombre..."
                aria-label="Buscar producto"
                className="w-full bg-transparent text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none"
              />
              {busquedaProd && (
                <button
                  onClick={() => setBusquedaProd('')}
                  aria-label="Limpiar búsqueda"
                  className="p-0.5 rounded text-stone-500 hover:text-stone-200 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={filtroCatProd}
              onChange={e => setFiltroCatProd(e.target.value)}
              aria-label="Filtrar por categoría"
              className="bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-900/90 border-b border-stone-800">
                <tr className="text-left text-xs uppercase tracking-wider text-stone-400">
                  <th className="px-3 py-2.5 font-medium w-1/4">Producto</th>
                  <th className="px-3 py-2.5 font-medium w-1/5">Categoría</th>
                  <th className="px-3 py-2.5 font-medium w-1/6">Precio</th>
                  <th className="px-3 py-2.5 font-medium text-right w-1/6">
                    Estado
                  </th>
                  <th className="px-3 py-2.5 font-medium text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map(producto => (
                  <tr
                    key={producto.id}
                    className="border-b border-stone-800/40 last:border-none hover:bg-stone-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-100">
                        {producto.nombre}
                      </div>
                      <div className="text-xs text-stone-500 line-clamp-1">
                        {producto.descripcion}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-400">
                      {nombreCategoria(producto.categoriaId)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-500">
                      ${producto.precio}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => toggleProductoDisponible(producto.id)}
                          role="switch"
                          aria-checked={producto.disponible}
                          aria-label={`Cambiar disponibilidad de ${producto.nombre}`}
                          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                            producto.disponible
                              ? 'border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                              : 'border-stone-700 bg-stone-900 text-stone-500 hover:text-stone-300 hover:border-stone-600'
                          }`}
                        >
                          {producto.disponible ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                          {producto.disponible ? 'Disponible' : 'Agotado'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => abrirEdicion(producto)}
                          aria-label={`Editar ${producto.nombre}`}
                          className="p-2 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-800 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => eliminar(producto)}
                          aria-label={`Eliminar ${producto.nombre}`}
                          className="p-2 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- Ajuste de Precios de Modificadores ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'catalogo' ? '' : ' hidden'}`}
        >
          <div className="mb-4">
            <h2 className="font-bold text-stone-100">
              Ajuste de Precios de Modificadores
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Editá el recargo y confirmá con Enter o al salir del campo. Se
              aplica al instante en el POS.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {[
              { titulo: 'Leche', lista: lechesAdmin },
              { titulo: 'Extras de receta', lista: extrasAdmin },
            ].map(grupo => (
              <div key={grupo.titulo} className="p-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-stone-500 mb-2">
                  {grupo.titulo}
                </h3>
                <ul className="space-y-2">
                  {grupo.lista.map(mod => (
                    <li
                      key={mod.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-stone-900 border border-stone-800 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-stone-100 truncate">
                          {mod.etiqueta}
                        </div>
                        <div className="text-[11px] text-stone-500 truncate">
                          Ticket: {mod.etiquetaTicket}
                        </div>
                      </div>
                      <label className="flex items-center gap-1 text-sm text-stone-400 shrink-0">
                        $
                        <input
                          type="number"
                          min={0}
                          value={borradores[mod.id] ?? String(mod.recargo)}
                          onChange={e =>
                            setBorradores(prev => ({
                              ...prev,
                              [mod.id]: e.target.value,
                            }))
                          }
                          onBlur={() => confirmarRecargo(mod.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          aria-label={`Recargo de ${mod.etiqueta}`}
                          className="w-20 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-right text-sm font-bold text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Salón / Mesas ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'salon' ? '' : ' hidden'}`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-bold text-stone-100 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-amber-500" />
                Salón / Mesas
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Capacidad del local · se refleja al instante en el POS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-stone-800 text-stone-300 text-xs px-2.5 py-1 rounded-full">
                {mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'} ·{' '}
                {mesasLibres} libres
              </span>
              <button
                onClick={() => {
                  agregarMesa();
                  setMsgSalon(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-4 py-2 text-sm transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Nueva Mesa
              </button>
            </div>
          </div>

          {msgSalon && (
            <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {msgSalon}
            </p>
          )}

          {mesasOrdenadasAdmin.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              Sin mesas en el salón. Creá la primera con "+ Nueva Mesa".
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {mesasOrdenadasAdmin.map(mesa => {
                const ocupada = mesa.estado === 'ocupada';
                return (
                  <div
                    key={mesa.id}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-2 ${
                      ocupada
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-stone-800 bg-stone-950'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-base font-bold text-stone-100">
                        Mesa {mesa.numero}
                      </div>
                      <span
                        className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          ocupada
                            ? 'border-orange-500/40 bg-orange-500/10 text-orange-300'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {ocupada ? 'Ocupada' : 'Libre'}
                      </span>
                      {ocupada && (
                        <div className="mt-1 text-xs text-stone-500">
                          Cuenta ${mesa.totalAcumulado}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => quitarMesa(mesa.numero)}
                      disabled={ocupada}
                      title={
                        ocupada
                          ? `Mesa ${mesa.numero} ocupada: cobrá o anulá la cuenta antes de eliminarla`
                          : `Eliminar Mesa ${mesa.numero}`
                      }
                      aria-label={`Eliminar Mesa ${mesa.numero}`}
                      className={`shrink-0 p-2 rounded-lg transition-colors ${
                        ocupada
                          ? 'text-stone-600 cursor-not-allowed opacity-40'
                          : 'text-stone-400 hover:text-red-400 hover:bg-stone-800'
                      }`}
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------- Historial de ventas ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'resumen' ? '' : ' hidden'}`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-bold text-stone-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Historial de Ventas
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Pedidos cobrados y anulados del período
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-stone-800 text-stone-300 text-xs px-2.5 py-1 rounded-full">
                {historial.length} pedidos · {etiquetaFiltro}
              </span>
              {/* Exportación centralizada en la pestaña Informes */}
            </div>
          </div>

          {historial.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              No hay pedidos en este período. Cobrá un pedido en el Punto de
              Venta para verlo aquí.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-900/90 border-b border-stone-800">
                  <tr className="text-left text-xs uppercase tracking-wider text-stone-400">
                    <th className="px-3 py-2.5 font-medium w-[10%]">ID</th>
                    <th className="px-3 py-2.5 font-medium w-[10%]">Hora</th>
                    <th className="px-3 py-2.5 font-medium w-[12%]">
                      Mesa / TA
                    </th>
                    <th className="px-3 py-2.5 font-medium w-[14%]">
                      Método pago
                    </th>
                    <th className="px-3 py-2.5 font-medium w-[12%]">Ítems</th>
                    <th className="px-3 py-2.5 font-medium w-[14%]">Estado</th>
                    <th className="px-3 py-2.5 font-medium text-right w-[14%]">
                      Total
                    </th>
                    <th className="px-3 py-2.5 font-medium text-right w-[14%]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(pedido => (
                    <tr
                      key={pedido.id}
                      className={`border-b border-stone-800/40 last:border-none hover:bg-stone-800/50 transition-colors${
                        pedido.estado === 'anulado' ? ' opacity-60' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-stone-400">
                        {pedido.id.replace('pedido-', '#')}
                      </td>
                      <td className="px-4 py-3 text-stone-300">
                        {formatearHora(pedido.fechaCreacion)}
                      </td>
                      <td className="px-4 py-3 text-stone-300">
                        {etiquetaMesa(pedido.mesaNumero, pedido.tipoServicio)}
                      </td>
                      <td className="px-4 py-3 text-stone-400">
                        {pedido.metodoPago === 'mixto' && pedido.desglosePago ? (
                          <>
                            Mixto
                            <span className="block text-[11px] text-stone-500">
                              ${pedido.desglosePago.efectivo} ef. + $
                              {pedido.desglosePago.digital}{' '}
                              {ETIQUETA_METODO_DIGITAL[
                                pedido.desglosePago.metodoDigital
                              ] ?? pedido.desglosePago.metodoDigital}
                            </span>
                          </>
                        ) : pedido.metodoPago ? (
                          (ETIQUETAS_METODO_PAGO[pedido.metodoPago] ??
                            pedido.metodoPago)
                        ) : (
                          'Sin cobrar'
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-stone-400"
                        title={pedido.items
                          .map(item => `${item.cantidad}× ${item.nombre}`)
                          .join(', ')}
                      >
                        {pedido.items.reduce(
                          (acc, item) => acc + item.cantidad,
                          0,
                        )}{' '}
                        u.
                        <span className="text-stone-600">
                          {' '}
                          ({pedido.items.length} tipos)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs capitalize ${
                            ESTILOS_ESTADO[pedido.estado] ??
                            ESTILOS_ESTADO.entregado
                          }`}
                        >
                          {pedido.estado}
                        </span>
                        {pedido.estado !== 'anulado' &&
                          pedido.cobrado === false && (
                            <span className="ml-1 inline-block rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                              Sin cobrar
                            </span>
                          )}
                        {pedido.estado === 'anulado' &&
                          pedido.motivoAnulacion && (
                            <p className="mt-1 text-[11px] text-stone-500 max-w-40">
                              {pedido.motivoAnulacion}
                              {pedido.anuladoPor &&
                                ` · ${pedido.anuladoPor}`}
                            </p>
                          )}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold text-right ${
                          pedido.estado === 'anulado'
                            ? 'text-stone-500 line-through'
                            : 'text-amber-500'
                        }`}
                      >
                        ${pedido.total}
                        {(pedido.descuentoMonto ?? 0) > 0 && (
                          <span className="block text-[11px] font-normal text-emerald-400">
                            −${pedido.descuentoMonto} dto.
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {pedido.estado !== 'anulado' && (
                            <button
                              onClick={() => abrirAnulacion(pedido)}
                              className="rounded-lg border border-red-500/50 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- Gestión de Personal ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'personal' ? '' : ' hidden'}`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-bold text-stone-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                Gestión de Personal
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Alta, roles, PINs y estados de empleados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-stone-800 text-stone-300 text-xs px-2.5 py-1 rounded-full">
                {empleados.filter(e => e.activo).length} activos
              </span>
              <button
                onClick={abrirNuevoEmpleado}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-4 py-2 text-sm transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Nuevo Empleado
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-900/90 border-b border-stone-800">
                <tr className="text-left text-xs uppercase tracking-wider text-stone-400">
                  <th className="px-3 py-2.5 font-medium w-1/4">Nombre</th>
                  <th className="px-3 py-2.5 font-medium w-1/6">Rol</th>
                  <th className="px-3 py-2.5 font-medium w-1/6">PIN</th>
                  <th className="px-3 py-2.5 font-medium w-1/6">Estado</th>
                  <th className="px-3 py-2.5 font-medium text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {empleados.map(emp => (
                  <tr
                    key={emp.id}
                    className="border-b border-stone-800/40 last:border-none hover:bg-stone-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-stone-100">
                      {emp.nombre}
                    </td>
                    <td className="px-4 py-3 text-stone-400">
                      {emp.rol.charAt(0).toUpperCase() + emp.rol.slice(1)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-mono text-sm text-stone-300">
                        {pinsVisibles[emp.id] ? emp.pin : '••••'}
                        <button
                          onClick={() => alternarPinVisible(emp.id)}
                          aria-label={
                            pinsVisibles[emp.id]
                              ? 'Ocultar PIN'
                              : 'Mostrar PIN'
                          }
                          className="p-1 rounded text-stone-500 hover:text-amber-400 transition-colors"
                        >
                          {pinsVisibles[emp.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          emp.activo
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-stone-600 bg-stone-800 text-stone-400'
                        }`}
                      >
                        {emp.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => abrirEdicionEmpleado(emp)}
                          aria-label={`Editar ${emp.nombre}`}
                          className="p-2 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-800 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {emp.activo ? (
                          <button
                            onClick={() => alternarActivo(emp)}
                            aria-label={`Desactivar ${emp.nombre}`}
                            title="Desactivar"
                            className="p-2 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => alternarActivo(emp)}
                            aria-label={`Reactivar ${emp.nombre}`}
                            title="Reactivar"
                            className="p-2 rounded-lg text-stone-400 hover:text-emerald-400 hover:bg-stone-800 transition-colors"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- Modal Nuevo / Editar empleado ---------- */}
        {modalEmpleado && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
            onClick={cerrarModalEmpleado}
          >
            <div
              className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-stone-100">
                  {empleadoEnEdicion ? 'Editar empleado' : 'Nuevo empleado'}
                </h2>
                <button
                  onClick={cerrarModalEmpleado}
                  aria-label="Cerrar"
                  className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={nombreEmp}
                    onChange={e => {
                      setNombreEmp(e.target.value);
                      setErrorEmp(null);
                    }}
                    placeholder="Ej. Ana López"
                    className={CLASE_INPUT}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1">
                      PIN (4 dígitos) *
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinEmp}
                      onChange={e => {
                        setPinEmp(
                          e.target.value.replace(/\D/g, '').slice(0, 4),
                        );
                        setErrorEmp(null);
                      }}
                      placeholder="••••"
                      className={CLASE_INPUT}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1">
                      Rol *
                    </label>
                    <select
                      value={rolEmp}
                      onChange={e =>
                        setRolEmp(
                          e.target.value as 'admin' | 'cajero' | 'barista',
                        )
                      }
                      className={CLASE_INPUT}
                    >
                      <option value="cajero">Cajero</option>
                      <option value="barista">Barista</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {errorEmp && (
                  <p className="text-sm text-red-400">{errorEmp}</p>
                )}
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={cerrarModalEmpleado}
                  className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarEmpleado}
                  className="flex-[2] py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {empleadoEnEdicion ? 'Guardar cambios' : 'Crear empleado'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Modal de confirmación: desactivar empleado ---------- */}
        {empleadoADesactivar && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
            onClick={cerrarModalBaja}
          >
            <div
              className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-stone-100">
                Desactivar empleado
              </h2>
              <p className="mt-2 text-sm text-stone-400">
                ¿Desactivar a "{empleadoADesactivar.nombre}"? Ya no podrá
                iniciar sesión ni fichar.
              </p>
              {errorBaja && (
                <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {errorBaja}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={cerrarModalBaja}
                  className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarBaja}
                  className="flex-[2] py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors"
                >
                  Desactivar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Control de Asistencia ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'personal' ? '' : ' hidden'}`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-bold text-stone-100 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-500" />
                Control de Asistencia
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Fichajes y horas trabajadas del personal
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-stone-800 text-stone-300 text-xs px-2.5 py-1 rounded-full">
                {fichajesOrdenados.length} fichajes
              </span>
              {/* Exportación centralizada en la pestaña Informes */}
            </div>
          </div>

          {presentesAhora.length > 0 && (
            <div className="px-4 py-3 border-b border-stone-800 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-stone-400">
                <Users className="h-4 w-4 text-emerald-400" />
                En turno ahora:
              </span>
              {presentesAhora.map(ficha => (
                <span
                  key={ficha.usuarioId}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300"
                >
                  {ficha.usuarioNombre} · {capitalizarRol(ficha.rol)}
                </span>
              ))}
            </div>
          )}

          {resumenJornadas.length > 0 && (
            <div className="px-4 py-3 border-b border-stone-800">
              <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">
                Horas por jornada
              </p>
              <div className="space-y-2">
                {resumenJornadas.map(res => (
                  <div
                    key={res.clave}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-900 border border-stone-800 px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="font-medium text-stone-100">
                        {res.usuarioNombre}
                      </span>
                      <span className="text-stone-500"> · {res.dia}</span>
                      {res.pares > 0 && (
                        <span className="text-xs text-stone-600">
                          {' '}
                          ({res.pares} turno{res.pares === 1 ? '' : 's'})
                        </span>
                      )}
                    </div>
                    {res.enTurno ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        En turno activo (iniciado hace {res.tiempoEnTurno})
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-amber-400">
                        {res.duracion}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {fichajesOrdenados.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              Todavía no hay fichajes registrados. El personal puede marcar
              entrada y salida desde el Navbar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-900/90 border-b border-stone-800">
                  <tr className="text-left text-xs uppercase tracking-wider text-stone-400">
                    <th className="px-3 py-2.5 font-medium w-1/6">Fecha</th>
                    <th className="px-3 py-2.5 font-medium w-1/6">Hora</th>
                    <th className="px-3 py-2.5 font-medium w-1/4">Empleado</th>
                    <th className="px-3 py-2.5 font-medium w-1/6">Rol</th>
                    <th className="px-3 py-2.5 font-medium text-right">
                      Movimiento
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fichajesOrdenados.map(ficha => {
                    const { dia, hora } = formatearFechaHora(ficha.fechaHora);
                    return (
                      <tr
                        key={ficha.id}
                        className="border-b border-stone-800/40 last:border-none hover:bg-stone-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-stone-300">{dia}</td>
                        <td className="px-4 py-3 text-stone-300 font-mono text-xs">
                          {hora}
                        </td>
                        <td className="px-4 py-3 font-medium text-stone-100">
                          {ficha.usuarioNombre}
                        </td>
                        <td className="px-4 py-3 text-stone-400">
                          {capitalizarRol(ficha.rol)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <span
                              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                ficha.tipo === 'entrada'
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                              }`}
                            >
                              {ficha.tipo === 'entrada'
                                ? 'Entrada'
                                : 'Salida'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- Políticas de Cobro ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'caja' ? '' : ' hidden'}`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-bold text-stone-100">Políticas de Cobro</h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Descuento por pago en efectivo en el POS
              </p>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                configCobro.descuentoEfectivoHabilitado
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-stone-700 bg-stone-800 text-stone-400'
              }`}
            >
              {configCobro.descuentoEfectivoHabilitado
                ? `${configCobro.descuentoEfectivoPorcentaje}% activo`
                : 'Pausado'}
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <button
              onClick={() => {
                setDescHabilitado(prev => !prev);
                setMsgConfig(null);
              }}
              role="switch"
              aria-checked={descHabilitado}
              aria-label="Activar o pausar descuento en efectivo"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${
                descHabilitado
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'border-stone-700 bg-stone-900 text-stone-500 hover:text-stone-300 hover:border-stone-600'
              }`}
            >
              {descHabilitado ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              {descHabilitado ? 'Descuento activado' : 'Descuento pausado'}
            </button>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Porcentaje (%)
              </label>
              <input
                type="number"
                min={0}
                max={90}
                value={porcTxt}
                onChange={e => {
                  setPorcTxt(e.target.value);
                  setMsgConfig(null);
                }}
                className="w-24 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm font-bold text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={guardarPoliticas}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-4 py-2 text-sm transition-all shadow-sm"
            >
              Guardar cambios
            </button>
          </div>

          {confirmaDescuento && (
            <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5">
              <p className="text-sm text-amber-300">
                Vas a fijar un descuento inusualmente alto (más del 30%).
                ¿Confirmás este cambio?
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => guardarPoliticas()}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmaDescuento(false)}
                  className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {msgConfig && (
            <p className="mt-3 text-sm text-stone-300">{msgConfig}</p>
          )}
        </section>

        {/* ---------- Histórico de Arqueos de Caja ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'caja' ? '' : ' hidden'}`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-bold text-stone-100 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-500" />
                Histórico de Arqueos de Caja
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Turnos cerrados con diferencias de caja
              </p>
            </div>
            <span className="bg-stone-800 text-stone-300 text-xs px-2.5 py-1 rounded-full">
              {arqueosOrdenados.length} turnos cerrados
            </span>
          </div>

          {arqueosOrdenados.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              No hay registros de arqueos todavía. Realiza un cierre de turno
              desde el POS.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-900/90 border-b border-stone-800">
                  <tr className="text-left text-xs uppercase tracking-wider text-stone-400">
                    <th className="px-3 py-2.5 font-medium w-1/6">Fecha</th>
                    <th className="px-3 py-2.5 font-medium w-1/5">Cajero</th>
                    <th className="px-3 py-2.5 font-medium text-right w-[11%]">
                      Inicial
                    </th>
                    <th className="px-3 py-2.5 font-medium text-right w-[12%]">
                      Ventas efvo.
                    </th>
                    <th className="px-3 py-2.5 font-medium text-right w-[11%]">
                      Contado
                    </th>
                    <th className="px-3 py-2.5 font-medium text-right w-[11%]">
                      Diferencia
                    </th>
                    <th className="px-3 py-2.5 font-medium text-right w-[12%]">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {arqueosOrdenados.map(arqueo => {
                    const { dia, hora } = formatearFechaHora(arqueo.fecha);
                    return (
                      <tr
                        key={arqueo.id}
                        className="border-b border-stone-800/40 last:border-none hover:bg-stone-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-stone-300 whitespace-nowrap">
                          {dia}{' '}
                          <span className="font-mono text-xs text-stone-500">
                            {hora}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-stone-100">
                          {arqueo.usuarioNombre}
                        </td>
                        <td className="px-4 py-3 text-stone-400 text-right">
                          ${arqueo.montoInicial}
                        </td>
                        <td className="px-4 py-3 text-stone-400 text-right">
                          ${arqueo.ventasEfectivo}
                        </td>
                        <td className="px-4 py-3 text-stone-200 font-medium text-right">
                          ${arqueo.montoContado}
                        </td>
                        <td
                          className={`px-4 py-3 font-bold text-right ${
                            arqueo.resultado === 'sobrante' ||
                            arqueo.resultado === 'exacta'
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {arqueo.diferencia > 0 ? '+' : ''}$
                          {arqueo.diferencia}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <span
                              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                ESTILO_ARQUEO[arqueo.resultado] ??
                                ESTILO_ARQUEO.exacta
                              }`}
                            >
                              {ETIQUETA_ARQUEO[arqueo.resultado] ??
                                arqueo.resultado}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

        {/* ---------- Historial de Egresos ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'caja' ? '' : ' hidden'}`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-bold text-stone-100">
                Historial de Egresos
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Retiros de caja registrados desde el POS
              </p>
            </div>
            <span className="bg-stone-800 text-stone-300 text-xs px-2.5 py-1 rounded-full">
              {egresosOrdenados.length} retiros · Total ${totalEgresos}
            </span>
          </div>

          {egresosOrdenados.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              Sin egresos registrados. Retirá caja desde el Punto de Venta
              con el botón Registrar Egreso.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-900/90 border-b border-stone-800">
                  <tr className="text-left text-xs uppercase tracking-wider text-stone-400">
                    <th className="px-3 py-2.5 font-medium w-1/5">Fecha</th>
                    <th className="px-3 py-2.5 font-medium w-2/5">Motivo</th>
                    <th className="px-3 py-2.5 font-medium w-1/5">
                      Registrado por
                    </th>
                    <th className="px-3 py-2.5 font-medium text-right w-1/5">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {egresosOrdenados.map(egreso => {
                    const { dia, hora } = formatearFechaHora(egreso.fechaHora);
                    return (
                      <tr
                        key={egreso.id}
                        className="border-b border-stone-800/40 last:border-none hover:bg-stone-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-stone-300 whitespace-nowrap">
                          {dia}{' '}
                          <span className="font-mono text-xs text-stone-500">
                            {hora}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-stone-100">
                          {egreso.motivo}
                        </td>
                        <td className="px-4 py-3 text-stone-400">
                          {egreso.usuarioNombre}
                        </td>
                        <td className="px-4 py-3 font-semibold text-red-400 text-right">
                          −${egreso.monto}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- Modal de Anulación ---------- */}
        {pedidoAAnular && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
            onClick={cerrarAnulacion}
          >
            <div
              className="w-full max-w-md bg-stone-950 border border-stone-800 rounded-2xl p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-stone-100">
                  Anular pedido
                </h2>
                <button
                  onClick={cerrarAnulacion}
                  aria-label="Cerrar"
                  className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-xl bg-stone-900 border border-stone-800 px-4 py-3 text-sm mb-3">
                <span className="font-mono text-xs text-stone-400">
                  {pedidoAAnular.id.replace('pedido-', '#')}
                </span>{' '}
                <span className="text-stone-200">
                  {etiquetaMesa(
                    pedidoAAnular.mesaNumero,
                    pedidoAAnular.tipoServicio,
                  )}
                </span>{' '}
                <span className="font-bold text-amber-500">
                  ${pedidoAAnular.total}
                </span>
              </div>

              <p className="text-xs text-stone-500 mb-3">
                El pedido sale del tablero de cocina y de la facturación,
                pero queda en el historial con su motivo y responsable.
              </p>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Motivo de anulación (obligatorio)
                </label>
                <textarea
                  value={motivoAnulacion}
                  onChange={e => {
                    setMotivoAnulacion(e.target.value);
                    setErrorAnulacion(null);
                  }}
                  rows={2}
                  maxLength={120}
                  placeholder="Ej. Error de carga, cliente se retiró"
                  className={CLASE_INPUT}
                />
              </div>
              {errorAnulacion && (
                <p className="mt-2 text-sm text-red-400">{errorAnulacion}</p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={cerrarAnulacion}
                  className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAnulacion}
                  className="flex-[2] py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors"
                >
                  Confirmar anulación
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal de eliminación de producto */}
      {modalEliminar && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setModalEliminar(null)}
        >
          <div
            className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center"
            onClick={e => e.stopPropagation()}
          >
            {modalEliminar.modo === 'confirmar' ? (
              <>
                <h2 className="text-lg font-bold text-stone-100">
                  Eliminar producto
                </h2>
                <p className="mt-2 text-sm text-stone-400">
                  ¿Eliminar "{modalEliminar.producto.nombre}" del catálogo?
                  Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setModalEliminar(null)}
                    className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarEliminacion}
                    className="flex-[2] py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-stone-100">
                  Producto conservado
                </h2>
                <p className="mt-2 text-sm text-stone-400">
                  "{modalEliminar.producto.nombre}" está en pedidos activos
                  o del día: no se eliminó para cuidar el historial. Se
                  marcó como Agotado y ya no aparece en POS ni en la carta.
                </p>
                <button
                  onClick={() => setModalEliminar(null)}
                  className="w-full mt-4 py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors"
                >
                  Entendido
                </button>
              </>
            )}
          </div>
        </div>
      )}

        {/* ---------- Informes y exportación ---------- */}
        <section
          className={`bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden p-6 shadow-sm${tabActivo === 'informes' ? '' : ' hidden'}`}
        >
          <div className="mb-4">
            <h2 className="font-bold text-stone-100">Informes & CSV</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Descargas para contabilidad y gestión · formato Excel en español
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-stone-950 border border-stone-800 p-4">
              <h3 className="font-bold text-stone-100 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-500" />
                Ventas y Facturación
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                {historial.length} pedidos del período · netos, métodos y
                descuentos
              </p>
              <button
                onClick={exportarVentas}
                className="mt-3 rounded-xl border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                Exportar Ventas (.csv)
              </button>
            </div>

            <div className="rounded-xl bg-stone-950 border border-stone-800 p-4">
              <h3 className="font-bold text-stone-100 flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-500" />
                Catálogo y Stock
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                {productos.length} productos · precios y disponibilidad
              </p>
              <button
                onClick={exportarCatalogo}
                className="mt-3 rounded-xl border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                Exportar Catálogo (.csv)
              </button>
            </div>

            <div className="rounded-xl bg-stone-950 border border-stone-800 p-4">
              <h3 className="font-bold text-stone-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                Control de Asistencia
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                {fichajesOrdenados.length} fichajes · horas por jornada
              </p>
              <button
                onClick={exportarHoras}
                className="mt-3 rounded-xl border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                Exportar Horas (.csv)
              </button>
            </div>

            <div className="rounded-xl bg-stone-950 border border-stone-800 p-4">
              <h3 className="font-bold text-stone-100 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-500" />
                Movimientos de Caja
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                {arqueosOrdenados.length} arqueos · {egresosOrdenados.length}{' '}
                egresos
              </p>
              <button
                onClick={exportarCaja}
                className="mt-3 rounded-xl border border-amber-500/60 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                Exportar Caja (.csv)
              </button>
            </div>
          </div>
        </section>

        {/* ---------- Modal Nueva Categoría ---------- */}
        {modalCategoria && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
            onClick={cerrarModalCategoria}
          >
            <div
              className="w-full max-w-sm bg-stone-950 border border-stone-800 rounded-2xl p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-stone-100">
                  Nueva categoría
                </h2>
                <button
                  onClick={cerrarModalCategoria}
                  aria-label="Cerrar"
                  className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={nombreCat}
                  onChange={e => {
                    setNombreCat(e.target.value);
                    setErrorCat(null);
                  }}
                  maxLength={40}
                  placeholder="Ej. Panadería"
                  className={CLASE_INPUT}
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  El identificador se genera solo. Aparece al instante en
                  filtros, POS y carta.
                </p>
              </div>
              {errorCat && (
                <p className="mt-2 text-sm text-red-400">{errorCat}</p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={cerrarModalCategoria}
                  className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarCategoria}
                  className="flex-[2] py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Crear categoría
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ---------- Modal Nuevo / Editar producto ---------- */}
      {modalProducto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={cerrarModalProducto}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-stone-100">
                {productoEnEdicion ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <button
                onClick={cerrarModalProducto}
                aria-label="Cerrar"
                className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Latte de Avellanas"
                  className={CLASE_INPUT}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Descripción corta del producto"
                  rows={2}
                  className={CLASE_INPUT}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Precio ($) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={precioTxt}
                    onChange={e => setPrecioTxt(e.target.value)}
                    placeholder="45"
                    className={CLASE_INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Categoría *
                  </label>
                  <select
                    value={categoriaId}
                    onChange={e => setCategoriaId(e.target.value)}
                    className={CLASE_INPUT}
                  >
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Modificadores (separados por coma)
                </label>
                <input
                  type="text"
                  value={modsTxt}
                  onChange={e => setModsTxt(e.target.value)}
                  placeholder="Ej. Leche de almendras, Sin azúcar, Extra shot"
                  className={CLASE_INPUT}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disponible}
                  onChange={e => setDisponible(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Disponible para la venta
              </label>

              <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={personalizable}
                  onChange={e => setPersonalizable(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Es bebida personalizable (abre leches y extras en el POS)
              </label>

              <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={esPromocion}
                  onChange={e => setEsPromocion(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Es una promoción / combo
              </label>

              {esPromocion && (
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">
                    Precio original / de lista *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={precioOriginalTxt}
                    onChange={e => {
                      setPrecioOriginalTxt(e.target.value);
                      setErrorForm(null);
                    }}
                    placeholder="Ej. 60"
                    className={CLASE_INPUT}
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    Se muestra tachado junto al precio promo.
                  </p>
                </div>
              )}

              {errorForm && (
                <p className="text-sm text-red-400">{errorForm}</p>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={cerrarModalProducto}
                className="flex-1 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarProducto}
                className="flex-[2] py-2.5 rounded-lg bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {productoEnEdicion ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
