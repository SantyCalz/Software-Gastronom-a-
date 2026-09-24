import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import type {
  ArqueoCaja,
  Categoria,
  ConfigCobro,
  DesglosePago,
  Egreso,
  Fichaje,
  Mesa,
  ModificadorGlobal,
  Producto,
  Pedido,
  TurnoCaja,
  Usuario,
} from '../types';
import {
  productos as productosMock,
  categorias as categoriasMock,
  MODIFICADORES_BASE as modificadoresMock,
  CATEGORIAS_BEBIDA,
} from '../data/mockData';
import { COMERCIO_CONFIG } from '../config/comercio';
import { generarId } from '../utils/ids';
import { calcularDescuento } from '../utils/descuentos';

// Context value type
type AppContextValue = {
  // Pedidos
  pedidos: Pedido[];
  agregarPedido: (pedido: Omit<Pedido, 'id' | 'fechaCreacion'>) => void;
  actualizarPedidoEstado: (pedidoId: string, nuevoEstado: Pedido['estado']) => void;
  eliminarPedido: (pedidoId: string) => void;

  // Mesas (cuentas abiertas de salón)
  mesas: Mesa[];
  marcharComanda: (
    mesaNumero: number,
    items: Pedido['items'],
    total: number,
  ) => Pedido | null;
  cobrarMesa: (
    mesaNumero: number,
    metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto',
    desglose?: DesglosePago,
  ) => boolean;
  anularMesa: (mesaNumero: number, motivo?: string) => boolean;
  agregarMesa: () => Mesa;
  eliminarMesa: (
    mesaNumero: number,
  ) => { ok: true } | { ok: false; error: string };

  // Turno de caja
  turnoCaja: TurnoCaja | null;
  abrirTurno: (usuarioId: string, montoInicial: number) => void;
  /**
   * @deprecated Legacy sin mantener: calcula sobre ingresosEfectivo /
   * ingresosDigitales del turno (siempre en 0). Todo el flujo debe usar
   * `cerrarTurnoConArqueo`, que deriva el efectivo de los pedidos cobrados.
   * Se conserva solo por compatibilidad de tipos; no invocar.
   */
  cerrarTurno: (montoDeclarado: number) => void;
  registrarEgreso: (monto: number, motivo: string) => Egreso | null;

  // Productos y categorías
  productos: Producto[];
  categorias: Categoria[];
  crearCategoria: (
    nombre: string,
  ) => { ok: true; categoria: Categoria } | { ok: false; error: string };
  toggleProductoDisponible: (productoId: string) => void;
  agregarProducto: (producto: Omit<Producto, 'id'>) => void;
  actualizarProducto: (
    productoId: string,
    cambios: Partial<Omit<Producto, 'id'>>,
  ) => void;
  eliminarProducto: (productoId: string) => void;

  // Usuario y autenticación
  usuarioActual: Usuario | null;
  setUsuarioActual: (usuario: Usuario | null) => void;
  rolActual: 'admin' | 'cajero' | 'barista';
  seleccionarUsuarioPorRol: (rol: 'admin' | 'cajero' | 'barista') => void;
  iniciarSesion: (pin: string) => Usuario | null;
  cerrarSesion: () => void;

  // Empleados administrables
  empleados: Usuario[];
  agregarEmpleado: (
    datos: Omit<Usuario, 'id' | 'activo'>,
  ) => ResultadoEmpleado;
  actualizarEmpleado: (
    empleadoId: string,
    cambios: Partial<Omit<Usuario, 'id'>>,
  ) => ResultadoEmpleado;
  desactivarEmpleado: (empleadoId: string) => ResultadoBaja;

  // Asistencia del personal
  fichajes: Fichaje[];
  marcarFichaje: (tipo: 'entrada' | 'salida') => Fichaje | null;
  obtenerEmpleadoPorPin: (pin: string) => Usuario | null;
  ficharPorPin: (pin: string, tipo: 'entrada' | 'salida') => Fichaje | null;

  // Arqueos de caja
  arqueos: ArqueoCaja[];
  cerrarTurnoConArqueo: (montoContado: number) => ArqueoCaja | null;

  // Egresos de caja
  egresos: Egreso[];
  anularPedido: (pedidoId: string, motivo: string) => boolean;

  // Políticas de cobro (descuento por pago en efectivo)
  configCobro: ConfigCobro;
  actualizarConfigCobro: (
    cambios: Partial<
      Pick<ConfigCobro, 'descuentoEfectivoHabilitado' | 'descuentoEfectivoPorcentaje'>
    >,
  ) => void;

  // Modificadores globales con recargo (precios editables por el dueño)
  modificadores: ModificadorGlobal[];
  actualizarModificador: (
    id: string,
    cambios: Partial<
      Pick<ModificadorGlobal, 'etiqueta' | 'etiquetaTicket' | 'recargo'>
    >,
  ) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const CLAVE_PRODUCTOS = 'coffeepos:productos:v2';
const CLAVE_PEDIDOS = 'coffeepos:pedidos';
const CLAVE_TURNO = 'coffeepos:turno';
const CLAVE_USUARIO = 'coffeepos:usuario';
const CLAVE_FICHAJES = 'coffeepos:fichajes';
const CLAVE_ARQUEOS = 'coffeepos:arqueos';
const CLAVE_MODIFICADORES = 'coffeepos:modificadores';
const CLAVE_EGRESOS = 'coffeepos:egresos';
const CLAVE_EMPLEADOS = 'coffeepos:empleados:v1';

// Semilla inicial: solo el administrador. El resto del personal se crea
// y gestiona de forma dinámica desde el Panel de Administración.
const USUARIOS: Usuario[] = [
  { id: 'user-1', nombre: 'Admin CoffeePOS', pin: '1234', rol: 'admin', activo: true },
];

type ResultadoEmpleado =
  | { ok: true; empleado: Usuario }
  | { ok: false; error: string };

type ResultadoBaja = { ok: true } | { ok: false; error: string };

type EgresoCrudo = Omit<Egreso, 'fechaHora'> & { fechaHora: string };

const parsearEgresos = (crudo: string | null): Egreso[] | null => {
  if (!crudo) return null;
  try {
    const parseados: unknown = JSON.parse(crudo);
    if (Array.isArray(parseados)) {
      return (parseados as EgresoCrudo[]).map(egreso => ({
        ...egreso,
        fechaHora: new Date(egreso.fechaHora),
      }));
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarEgresos = (): Egreso[] => {
  try {
    return parsearEgresos(localStorage.getItem(CLAVE_EGRESOS)) ?? [];
  } catch {
    // localStorage no disponible → arrancar vacío
    return [];
  }
};

const CLAVE_COBRO = 'coffeepos:config-cobro';

const parsearConfigCobro = (crudo: string | null): ConfigCobro | null => {
  if (!crudo) return null;
  try {
    const parsed: unknown = JSON.parse(crudo);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'descuentoEfectivoHabilitado' in parsed &&
      'descuentoEfectivoPorcentaje' in parsed
    ) {
      const c = parsed as ConfigCobro;
      return {
        descuentoEfectivoHabilitado: c.descuentoEfectivoHabilitado === true,
        descuentoEfectivoPorcentaje:
          Number.isFinite(c.descuentoEfectivoPorcentaje) &&
          c.descuentoEfectivoPorcentaje >= 0
            ? Math.min(90, Math.round(c.descuentoEfectivoPorcentaje))
            : 10,
      };
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarConfigCobro = (): ConfigCobro => {
  const semilla: ConfigCobro = {
    descuentoEfectivoHabilitado: COMERCIO_CONFIG.descuentoEfectivoHabilitado,
    descuentoEfectivoPorcentaje: COMERCIO_CONFIG.descuentoEfectivoPorcentaje,
  };
  try {
    return parsearConfigCobro(localStorage.getItem(CLAVE_COBRO)) ?? semilla;
  } catch {
    return semilla;
  }
};

const CLAVE_CATEGORIAS = 'coffeepos:categorias';

const slugCategoria = (nombre: string): string =>
  nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'categoria';

const parsearCategorias = (crudo: string | null): Categoria[] | null => {
  if (!crudo) return null;
  try {
    const parseados: unknown = JSON.parse(crudo);
    if (
      Array.isArray(parseados) &&
      parseados.length > 0 &&
      parseados.every(
        item =>
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          'nombre' in item,
      )
    ) {
      return (parseados as Categoria[]).map(c => ({
        ...c,
        icono: typeof c.icono === 'string' ? c.icono : 'Coffee',
      }));
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarCategorias = (): Categoria[] => {
  try {
    return (
      parsearCategorias(localStorage.getItem(CLAVE_CATEGORIAS)) ??
      categoriasMock
    );
  } catch {
    // localStorage no disponible → semilla inicial
    return categoriasMock;
  }
};

const PIN_EMPLEADO = /^\d{4}$/;

const pinEnUso = (
  lista: Usuario[],
  pin: string,
  excluirId?: string,
): boolean =>
  lista.some(
    u =>
      u.activo &&
      u.id !== excluirId &&
      String(u.pin).trim() === String(pin).trim(),
  );

// La baja se bloquea si es el último administrador activo
const motivoBloqueoBaja = (
  lista: Usuario[],
  objetivo: Usuario,
): string | null => {
  if (
    objetivo.rol === 'admin' &&
    !lista.some(
      u => u.id !== objetivo.id && u.rol === 'admin' && u.activo,
    )
  ) {
    return 'No se puede desactivar al último administrador activo.';
  }
  return null;
};

const parsearEmpleados = (crudo: string | null): Usuario[] | null => {
  if (!crudo) return null;
  try {
    const parseados: unknown = JSON.parse(crudo);
    if (
      Array.isArray(parseados) &&
      parseados.length > 0 &&
      parseados.every(
        item =>
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          'pin' in item &&
          'rol' in item,
      )
    ) {
      return (parseados as Usuario[]).map(u => ({
        ...u,
        activo: u.activo ?? true,
      }));
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarEmpleados = (): Usuario[] => {
  try {
    return (
      parsearEmpleados(localStorage.getItem(CLAVE_EMPLEADOS)) ??
      USUARIOS.map(u => ({ ...u }))
    );
  } catch {
    // localStorage no disponible → semilla inicial
    return USUARIOS.map(u => ({ ...u }));
  }
};

// Los pedidos viajan como JSON: hay que revivir los Date al cargarlos
type PedidoCrudo = Omit<Pedido, 'fechaCreacion'> & { fechaCreacion: string };

const parsearPedidos = (crudo: string | null): Pedido[] | null => {
  if (!crudo) return null;
  try {
    const parseados: unknown = JSON.parse(crudo);
    if (Array.isArray(parseados)) {
      return (parseados as PedidoCrudo[]).map(pedido => ({
        ...pedido,
        fechaCreacion: new Date(pedido.fechaCreacion),
      }));
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarPedidos = (): Pedido[] => {
  try {
    return parsearPedidos(localStorage.getItem(CLAVE_PEDIDOS)) ?? [];
  } catch {
    // localStorage no disponible → arrancar vacío
    return [];
  }
};

type TurnoCrudo = Omit<TurnoCaja, 'fechaApertura' | 'fechaCierre'> & {
  fechaApertura: string;
  fechaCierre?: string;
};

const parsearTurno = (crudo: string | null): TurnoCaja | null => {
  if (!crudo) return null;
  try {
    const turno = JSON.parse(crudo) as TurnoCrudo;
    if (turno && typeof turno.id === 'string') {
      return {
        ...turno,
        fechaApertura: new Date(turno.fechaApertura),
        fechaCierre: turno.fechaCierre ? new Date(turno.fechaCierre) : undefined,
      };
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarTurno = (): TurnoCaja | null => {
  try {
    return parsearTurno(localStorage.getItem(CLAVE_TURNO));
  } catch {
    // localStorage no disponible → sin turno
    return null;
  }
};

const parsearUsuario = (crudo: string | null): Usuario | null => {
  if (!crudo) return null;
  try {
    const usuario = JSON.parse(crudo) as Usuario;
    if (usuario && typeof usuario.id === 'string') {
      return usuario;
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarUsuario = (): Usuario | null => {
  try {
    return parsearUsuario(localStorage.getItem(CLAVE_USUARIO));
  } catch {
    // Sin sesión guardada
    return null;
  }
};

type FichajeCrudo = Omit<Fichaje, 'fechaHora'> & { fechaHora: string };

const parsearFichajes = (crudo: string | null): Fichaje[] | null => {
  if (!crudo) return null;
  try {
    const parseados: unknown = JSON.parse(crudo);
    if (Array.isArray(parseados)) {
      return (parseados as FichajeCrudo[]).map(ficha => ({
        ...ficha,
        fechaHora: new Date(ficha.fechaHora),
      }));
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarFichajes = (): Fichaje[] => {
  try {
    return parsearFichajes(localStorage.getItem(CLAVE_FICHAJES)) ?? [];
  } catch {
    // localStorage no disponible → arrancar vacío
    return [];
  }
};

type ArqueoCrudo = Omit<ArqueoCaja, 'fecha'> & { fecha: string };

const parsearArqueos = (crudo: string | null): ArqueoCaja[] | null => {
  if (!crudo) return null;
  try {
    const parseados: unknown = JSON.parse(crudo);
    if (Array.isArray(parseados)) {
      return (parseados as ArqueoCrudo[]).map(arqueo => ({
        ...arqueo,
        fecha: new Date(arqueo.fecha),
      }));
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarArqueos = (): ArqueoCaja[] => {
  try {
    return parsearArqueos(localStorage.getItem(CLAVE_ARQUEOS)) ?? [];
  } catch {
    // localStorage no disponible → arrancar vacío
    return [];
  }
};

const parsearModificadores = (
  crudo: string | null,
): ModificadorGlobal[] | null => {
  if (!crudo) return null;
  try {
    const parseados: unknown = JSON.parse(crudo);
    if (
      Array.isArray(parseados) &&
      parseados.length > 0 &&
      parseados.every(
        item =>
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          'grupo' in item &&
          'etiqueta' in item &&
          'recargo' in item,
      )
    ) {
      return parseados as ModificadorGlobal[];
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarModificadores = (): ModificadorGlobal[] => {
  try {
    return (
      parsearModificadores(localStorage.getItem(CLAVE_MODIFICADORES)) ??
      modificadoresMock
    );
  } catch {
    // localStorage no disponible → valores base de la carta
    return modificadoresMock;
  }
};

const CLAVE_MESAS = 'coffeepos:mesas:v1';
// Clave anterior (sin versión): solo se lee una vez para migrar las cuentas
// abiertas al nuevo formato; la persistencia siempre escribe en CLAVE_MESAS.
const CLAVE_MESAS_LEGADA = 'coffeepos:mesas';

// 12 mesas fijas como semilla (se crean al abrir la primera comanda si faltan)
const MESAS_BASE: Mesa[] = Array.from({ length: 12 }, (_, i) => ({
  id: `mesa-${i + 1}`,
  numero: i + 1,
  estado: 'libre',
  pedidosIds: [],
  totalAcumulado: 0,
}));

const parsearMesas = (crudo: string | null): Mesa[] | null => {
  if (!crudo) return null;
  try {
    const parseados: unknown = JSON.parse(crudo);
    if (
      Array.isArray(parseados) &&
      parseados.length > 0 &&
      parseados.every(
        item =>
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          'numero' in item &&
          'pedidosIds' in item,
      )
    ) {
      return (parseados as Mesa[]).map(m => ({
        id: String(m.id),
        numero: Number(m.numero),
        estado: m.estado === 'ocupada' ? 'ocupada' : 'libre',
        pedidosIds: Array.isArray(m.pedidosIds)
          ? m.pedidosIds.map(String)
          : [],
        totalAcumulado: Number(m.totalAcumulado) || 0,
        aperturaHora:
          typeof m.aperturaHora === 'string' ? m.aperturaHora : undefined,
      }));
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

const cargarMesas = (): Mesa[] => {
  try {
    return (
      parsearMesas(localStorage.getItem(CLAVE_MESAS)) ??
      parsearMesas(localStorage.getItem(CLAVE_MESAS_LEGADA)) ??
      MESAS_BASE.map(m => ({ ...m, pedidosIds: [] }))
    );
  } catch {
    // localStorage no disponible → mesas libres
    return MESAS_BASE.map(m => ({ ...m, pedidosIds: [] }));
  }
};

// Chequeo mínimo de forma: al menos un elemento con id, nombre y precio
const parseadoEsValido = (items: unknown[]): boolean =>
  items.length > 0 &&
  items.every(
    item =>
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'nombre' in item &&
      'precio' in item,
  );

/**
 * Carga inicial de productos:
 * 1) Intenta leer localStorage (semilla v2 de la carta).
 * 2) Si está vacío, es `null`, no es un array o tiene JSON inválido,
 *    carga por defecto los productos de `src/data/mockData.ts`.
 */
const parsearProductos = (crudo: string | null): Producto[] | null => {
  if (!crudo) return null;
  try {
    const parseados: unknown = JSON.parse(crudo);
    if (Array.isArray(parseados) && parseadoEsValido(parseados)) {
      return parseados as Producto[];
    }
  } catch {
    // JSON corrupto → se ignora
  }
  return null;
};

// Normaliza el catálogo: todo producto sin flag explícito hereda la
// personalización según su categoría (bebidas sí, comidas no)
const normalizarProductos = (lista: Producto[]): Producto[] =>
  lista.map(producto => ({
    ...producto,
    personalizable:
      producto.personalizable ??
      CATEGORIAS_BEBIDA.includes(producto.categoriaId),
  }));

const cargarProductosIniciales = (): Producto[] => {
  try {
    return normalizarProductos(
      parsearProductos(localStorage.getItem(CLAVE_PRODUCTOS)) ?? productosMock,
    );
  } catch {
    // localStorage no disponible → datos de la carta
    return normalizarProductos(productosMock);
  }
};export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Estado de pedidos (persistidos en localStorage)
  const [pedidos, setPedidos] = useState<Pedido[]>(cargarPedidos);

  // Estado del turno de caja (persistido en localStorage)
  const [turnoCaja, setTurnoCaja] = useState<TurnoCaja | null>(cargarTurno);

  // Mesas del salón (cuentas abiertas, persistidas en localStorage)
  const [mesas, setMesas] = useState<Mesa[]>(cargarMesas);

  // Persistir mesas en localStorage ante cada cambio (y limpiar la
  // clave legada tras la migración a v1)
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_MESAS, JSON.stringify(mesas));
      localStorage.removeItem(CLAVE_MESAS_LEGADA);
    } catch {
      // Sin persistencia disponible
    }
  }, [mesas]);

  // Sincronización multi-pestaña de mesas
  useEffect(() => {
    const sincronizarMesas = (e: StorageEvent) => {
      if (e.key !== CLAVE_MESAS) return;
      try {
        const lista = parsearMesas(e.newValue);
        if (lista) setMesas(lista);
      } catch {
        // Evento corrupto → se ignora
      }
    };
    window.addEventListener('storage', sincronizarMesas);
    return () => window.removeEventListener('storage', sincronizarMesas);
  }, []);

  // Estado de productos: localStorage → mockData si está vacío o es null
  const [productos, setProductos] = useState<Producto[]>(cargarProductosIniciales);

  // Persistir productos en localStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos));
    } catch {
      // Sin persistencia disponible (modo privado, cuota llena, etc.)
    }
  }, [productos]);

  // Persistir pedidos en localStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(pedidos));
    } catch {
      // Sin persistencia disponible
    }
  }, [pedidos]);

  // Persistir turno de caja en localStorage ante cada cambio
  useEffect(() => {
    try {
      if (turnoCaja) {
        localStorage.setItem(CLAVE_TURNO, JSON.stringify(turnoCaja));
      } else {
        localStorage.removeItem(CLAVE_TURNO);
      }
    } catch {
      // Sin persistencia disponible
    }
  }, [turnoCaja]);

  // Sincronización multi-pestaña: si otra pestaña modifica localStorage
  // (ej. el cajero cobra en /pos), esta pestaña actualiza su estado
  // automáticamente sin recargar. El evento 'storage' solo se dispara
  // en las demás pestañas, nunca en la que escribió.
  useEffect(() => {
    const sincronizar = (e: StorageEvent) => {
      try {
        if (e.key === CLAVE_PEDIDOS) {
          const lista = parsearPedidos(e.newValue);
          if (lista) setPedidos(lista);
        } else if (e.key === CLAVE_TURNO) {
          setTurnoCaja(parsearTurno(e.newValue));
        } else if (e.key === CLAVE_PRODUCTOS) {
          const lista = parsearProductos(e.newValue);
          if (lista) setProductos(lista);
        } else if (e.key === CLAVE_FICHAJES) {
          const lista = parsearFichajes(e.newValue);
          if (lista) setFichajes(lista);
        } else if (e.key === CLAVE_ARQUEOS) {
          const lista = parsearArqueos(e.newValue);
          if (lista) setArqueos(lista);
        } else if (e.key === CLAVE_EGRESOS) {
          const lista = parsearEgresos(e.newValue);
          if (lista) setEgresos(lista);
        } else if (e.key === CLAVE_EMPLEADOS) {
          const lista = parsearEmpleados(e.newValue);
          if (lista) setEmpleados(lista);
        } else if (e.key === CLAVE_USUARIO) {
          setUsuarioActual(parsearUsuario(e.newValue));
        }
      } catch {
        // Evento corrupto → se ignora
      }
    };
    window.addEventListener('storage', sincronizar);
    return () => window.removeEventListener('storage', sincronizar);
  }, []);

  const [categorias, setCategorias] =
    useState<Categoria[]>(cargarCategorias);

  // Persistir categorías en localStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_CATEGORIAS, JSON.stringify(categorias));
    } catch {
      // Sin persistencia disponible
    }
  }, [categorias]);

  // Sincronización multi-pestaña de categorías
  useEffect(() => {
    const sincronizarCategorias = (e: StorageEvent) => {
      if (e.key !== CLAVE_CATEGORIAS) return;
      try {
        const lista = parsearCategorias(e.newValue);
        if (lista) setCategorias(lista);
      } catch {
        // Evento corrupto → se ignora
      }
    };
    window.addEventListener('storage', sincronizarCategorias);
    return () => window.removeEventListener('storage', sincronizarCategorias);
  }, []);

  // Crear categoría (nombre único, id slug). Falla si está vacío o duplicado.
  const crearCategoria = useCallback(
    (
      nombre: string,
    ): { ok: true; categoria: Categoria } | { ok: false; error: string } => {
      const limpio = nombre.trim();
      if (limpio === '') {
        return { ok: false, error: 'El nombre de la categoría es obligatorio.' };
      }
      if (
        categorias.some(
          c => c.nombre.trim().toLowerCase() === limpio.toLowerCase(),
        )
      ) {
        return { ok: false, error: 'Ya existe una categoría con ese nombre.' };
      }
      let base = slugCategoria(limpio);
      let id = base;
      let n = 2;
      while (categorias.some(c => c.id === id)) {
        id = `${base}-${n}`;
        n += 1;
      }
      const categoria: Categoria = { id, nombre: limpio, icono: 'Coffee' };
      setCategorias(prev => [...prev, categoria]);
      return { ok: true, categoria };
    },
    [categorias],
  );

  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(
    cargarUsuario,
  );

  // Persistir sesión en localStorage
  useEffect(() => {
    try {
      if (usuarioActual) {
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuarioActual));
      } else {
        localStorage.removeItem(CLAVE_USUARIO);
      }
    } catch {
      // Sin persistencia disponible
    }
  }, [usuarioActual]);

  // Empleados administrables (semilla inicial: USUARIOS)
  const [empleados, setEmpleados] = useState<Usuario[]>(cargarEmpleados);

  // Persistir empleados en localStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_EMPLEADOS, JSON.stringify(empleados));
    } catch {
      // Sin persistencia disponible
    }
  }, [empleados]);

  // Integridad de sesión: si el usuario activo fue desactivado o eliminado,
  // se cierra su sesión automáticamente
  useEffect(() => {
    if (
      usuarioActual &&
      !empleados.some(u => u.id === usuarioActual.id && u.activo)
    ) {
      setUsuarioActual(null);
      setRolActual('cajero');
    }
  }, [empleados, usuarioActual]);

  // Registro de asistencia (fichajes de entrada/salida)
  const [fichajes, setFichajes] = useState<Fichaje[]>(cargarFichajes);

  // Persistir fichajes en localStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_FICHAJES, JSON.stringify(fichajes));
    } catch {
      // Sin persistencia disponible
    }
  }, [fichajes]);

  // Histórico de arqueos de caja
  const [arqueos, setArqueos] = useState<ArqueoCaja[]>(cargarArqueos);

  // Persistir arqueos en localStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_ARQUEOS, JSON.stringify(arqueos));
    } catch {
      // Sin persistencia disponible
    }
  }, [arqueos]);

  // Historial de egresos de caja
  const [egresos, setEgresos] = useState<Egreso[]>(cargarEgresos);

  // Persistir egresos en localStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_EGRESOS, JSON.stringify(egresos));
    } catch {
      // Sin persistencia disponible
    }
  }, [egresos]);

  // Modificadores globales con recargo (precios editables por el dueño)
  const [modificadores, setModificadores] =
    useState<ModificadorGlobal[]>(cargarModificadores);

  // Persistir modificadores en localStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_MODIFICADORES, JSON.stringify(modificadores));
    } catch {
      // Sin persistencia disponible
    }
  }, [modificadores]);
  const [rolActual, setRolActual] = useState<'admin' | 'cajero' | 'barista'>(
    () => cargarUsuario()?.rol ?? 'cajero',
  );

  // Agregar nuevo pedido
  const agregarPedido = useCallback(
    (pedido: Omit<Pedido, 'id' | 'fechaCreacion'>) => {
      const nuevoPedido: Pedido = {
        ...pedido,
        id: generarId('pedido'),
        fechaCreacion: new Date(),
      };
      setPedidos(prev => [...prev, nuevoPedido]);
    },
    [],
  );

  // Actualizar estado de pedido
  const actualizarPedidoEstado = useCallback(
    (pedidoId: string, nuevoEstado: Pedido['estado']) => {
      setPedidos(prev =>
        prev.map(pedido =>
          pedido.id === pedidoId ? { ...pedido, estado: nuevoEstado } : pedido,
        ),
      );
    },
    [],
  );

  // Eliminar pedido
  const eliminarPedido = useCallback((pedidoId: string) => {
    setPedidos(prev => prev.filter(pedido => pedido.id !== pedidoId));
  }, []);

  // Abrir turno de caja
  const abrirTurno = useCallback(
    (usuarioId: string, montoInicial: number) => {
      const nuevoTurno: TurnoCaja = {
        id: generarId('turno'),
        usuarioId,
        fechaApertura: new Date(),
        fechaCierre: undefined,
        montoInicial,
        ingresosEfectivo: 0,
        ingresosDigitales: 0,
        egresosTotales: 0,
        montoDeclarado: 0,
        diferencia: 0,
        estado: 'abierto',
      };
      setTurnoCaja(nuevoTurno);
    },
    [],
  );

  /**
   * @deprecated Ver tipo `AppContextValue`: usar `cerrarTurnoConArqueo`.
   */
  const cerrarTurno = useCallback(
    (montoDeclarado: number) => {
      if (!turnoCaja) return;

      const montoActual =
        turnoCaja.ingresosEfectivo + turnoCaja.ingresosDigitales -
        turnoCaja.egresosTotales;
      const diferencia = montoDeclarado - montoActual;

      const turnoCerrado: TurnoCaja = {
        ...turnoCaja,
        fechaCierre: new Date(),
        montoDeclarado,
        diferencia,
        estado: 'cerrado',
      };
      setTurnoCaja(turnoCerrado);
    },
    [turnoCaja],
  );

  // Registrar egreso de caja con motivo (resta del esperado en el arqueo).
  // Devuelve el egreso creado o null si no hay turno abierto.
  const registrarEgreso = useCallback(
    (monto: number, motivo: string): Egreso | null => {
      if (!turnoCaja || turnoCaja.estado !== 'abierto') return null;
      const egreso: Egreso = {
        id: generarId('egreso'),
        monto,
        motivo: motivo.trim(),
        fechaHora: new Date(),
        usuarioId: usuarioActual?.id,
        usuarioNombre: usuarioActual?.nombre ?? '—',
        turnoId: turnoCaja.id,
      };
      setEgresos(prev => [egreso, ...prev]);
      setTurnoCaja(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          egresosTotales: prev.egresosTotales + monto,
        };
      });
      return egreso;
    },
    [turnoCaja, usuarioActual],
  );

  // Anulación auditada: el pedido sale del tablero y de la facturación,
  // pero queda en el historial con motivo y responsable.
  const anularPedido = useCallback(
    (pedidoId: string, motivo: string): boolean => {
      let aplicado = false;
      setPedidos(prev =>
        prev.map(pedido => {
          if (pedido.id !== pedidoId || pedido.estado === 'anulado') {
            return pedido;
          }
          aplicado = true;
          return {
            ...pedido,
            estado: 'anulado' as const,
            motivoAnulacion: motivo.trim(),
            anuladoPor: usuarioActual?.nombre ?? '—',
            fechaAnulacion: new Date(),
          };
        }),
      );
      return aplicado;
    },
    [usuarioActual],
  );

  // Alternar disponibilidad de producto
  const toggleProductoDisponible = useCallback(
    (productoId: string) => {
      setProductos(prev =>
        prev.map(producto =>
          producto.id === productoId
            ? { ...producto, disponible: !producto.disponible }
            : producto,
        ),
      );
    },
    [],
  );

  // Agregar producto al catálogo
  const agregarProducto = useCallback((producto: Omit<Producto, 'id'>) => {
    const nuevo: Producto = {
      ...producto,
      id: generarId('prod'),
    };
    setProductos(prev => [...prev, nuevo]);
  }, []);

  // Actualizar producto existente
  const actualizarProducto = useCallback(
    (productoId: string, cambios: Partial<Omit<Producto, 'id'>>) => {
      setProductos(prev =>
        prev.map(producto =>
          producto.id === productoId ? { ...producto, ...cambios } : producto,
        ),
      );
    },
    [],
  );

  // Eliminar producto del catálogo
  const eliminarProducto = useCallback((productoId: string) => {
    setProductos(prev => prev.filter(producto => producto.id !== productoId));
  }, []);

  // Seleccionar usuario por rol (acceso rápido, solo activos)
  const seleccionarUsuarioPorRol = useCallback(
    (rol: 'admin' | 'cajero' | 'barista') => {
      const usuario =
        empleados.find(u => u.rol === rol && u.activo) ?? null;
      setUsuarioActual(usuario);
      if (usuario) {
        setRolActual(usuario.rol);
      }
    },
    [empleados],
  );

  // Iniciar sesión con PIN (solo empleados activos).
  // Devuelve el usuario o null si el PIN no existe o está inactivo.
  const iniciarSesion = useCallback(
    (pin: string): Usuario | null => {
      const normalizado = String(pin).trim();
      const usuario =
        empleados.find(
          u => u.activo && String(u.pin).trim() === normalizado,
        ) ?? null;
      if (usuario) {
        setUsuarioActual(usuario);
        setRolActual(usuario.rol);
      }
      return usuario;
    },
    [empleados],
  );

  // Cerrar sesión (vuelve al rol base sin privilegios de admin)
  const cerrarSesion = useCallback(() => {
    setUsuarioActual(null);
    setRolActual('cajero');
  }, []);

  // Alta de empleado con validaciones (PIN 4 dígitos único entre activos)
  const agregarEmpleado = useCallback(
    (datos: Omit<Usuario, 'id' | 'activo'>): ResultadoEmpleado => {
      const pin = String(datos.pin).trim();
      if (!PIN_EMPLEADO.test(pin)) {
        return {
          ok: false,
          error: 'El PIN debe tener exactamente 4 dígitos.',
        };
      }
      if (pinEnUso(empleados, pin)) {
        return {
          ok: false,
          error: 'Ese PIN ya está en uso por otro empleado activo.',
        };
      }
      const empleado: Usuario = {
        ...datos,
        id: generarId('user'),
        pin,
        activo: true,
      };
      setEmpleados(prev => [...prev, empleado]);
      return { ok: true, empleado };
    },
    [empleados],
  );

  // Editar empleado (nombre, PIN, rol o reactivar)
  const actualizarEmpleado = useCallback(
    (
      empleadoId: string,
      cambios: Partial<Omit<Usuario, 'id'>>,
    ): ResultadoEmpleado => {
      const actual = empleados.find(u => u.id === empleadoId);
      if (!actual) return { ok: false, error: 'Empleado no encontrado.' };
      if (cambios.pin !== undefined) {
        const pin = String(cambios.pin).trim();
        if (!PIN_EMPLEADO.test(pin)) {
          return {
            ok: false,
            error: 'El PIN debe tener exactamente 4 dígitos.',
          };
        }
        if (pinEnUso(empleados, pin, empleadoId)) {
          return {
            ok: false,
            error: 'Ese PIN ya está en uso por otro empleado activo.',
          };
        }
      }
      if (cambios.activo === false) {
        const bloqueo = motivoBloqueoBaja(empleados, actual);
        if (bloqueo) return { ok: false, error: bloqueo };
      }
      const nombreFinal =
        cambios.nombre !== undefined ? cambios.nombre.trim() : actual.nombre;
      if (nombreFinal === '') {
        return { ok: false, error: 'El nombre no puede estar vacío.' };
      }
      const actualizado: Usuario = {
        ...actual,
        ...cambios,
        pin:
          cambios.pin !== undefined ? String(cambios.pin).trim() : actual.pin,
        nombre: nombreFinal,
      };
      setEmpleados(prev =>
        prev.map(u => (u.id === empleadoId ? actualizado : u)),
      );
      return { ok: true, empleado: actualizado };
    },
    [empleados],
  );

  // Baja lógica: nunca se elimina, solo se desactiva
  const desactivarEmpleado = useCallback(
    (empleadoId: string): ResultadoBaja => {
      const objetivo = empleados.find(u => u.id === empleadoId);
      if (!objetivo) return { ok: false, error: 'Empleado no encontrado.' };
      if (!objetivo.activo) return { ok: true };
      if (usuarioActual && objetivo.id === usuarioActual.id) {
        return {
          ok: false,
          error: 'No podés desactivar tu propio usuario con la sesión iniciada.',
        };
      }
      const bloqueo = motivoBloqueoBaja(empleados, objetivo);
      if (bloqueo) return { ok: false, error: bloqueo };
      setEmpleados(prev =>
        prev.map(u => (u.id === empleadoId ? { ...u, activo: false } : u)),
      );
      return { ok: true };
    },
    [empleados, usuarioActual],
  );

  // Registrar fichaje de entrada/salida del usuario activo.
  // Devuelve el fichaje creado o null si no hay sesión iniciada.
  const marcarFichaje = useCallback(
    (tipo: 'entrada' | 'salida'): Fichaje | null => {
      if (!usuarioActual) return null;
      const fichaje: Fichaje = {
        id: generarId('fichaje'),
        usuarioId: usuarioActual.id,
        usuarioNombre: usuarioActual.nombre,
        rol: usuarioActual.rol,
        tipo,
        fechaHora: new Date(),
      };
      setFichajes(prev => [...prev, fichaje]);
      return fichaje;
    },
    [usuarioActual],
  );

  // Buscar empleado por PIN sin alterar la sesión activa (kiosco de fichaje)
  const obtenerEmpleadoPorPin = useCallback(
    (pinIngresado: string): Usuario | null => {
      const normalizado = String(pinIngresado).trim();
      return (
        empleados.find(
          u => u.activo && String(u.pin).trim() === normalizado,
        ) ?? null
      );
    },
    [empleados],
  );

  // Fichar por PIN para un empleado específico sin cambiar el usuario activo
  const ficharPorPin = useCallback(
    (pin: string, tipo: 'entrada' | 'salida'): Fichaje | null => {
      const empleado =
        empleados.find(
          u => u.activo && String(u.pin).trim() === String(pin).trim(),
        ) ?? null;
      if (!empleado) return null;
      const fichaje: Fichaje = {
        id: generarId('fichaje'),
        usuarioId: empleado.id,
        usuarioNombre: empleado.nombre,
        rol: empleado.rol,
        tipo,
        fechaHora: new Date(),
      };
      setFichajes(prev => [...prev, fichaje]);
      return fichaje;
    },
    [empleados],
  );

  // Cierre ciego de turno con arqueo: calcula el efectivo esperado a partir
  // de las ventas en efectivo desde la apertura, registra la diferencia
  // (contado − esperado), guarda el arqueo en el histórico y cierra el turno.
  // Devuelve el arqueo creado o null si no hay turno abierto.
  const cerrarTurnoConArqueo = useCallback(
    (montoContado: number): ArqueoCaja | null => {
      if (!turnoCaja || turnoCaja.estado !== 'abierto') return null;

      const apertura = new Date(turnoCaja.fechaApertura).getTime();
      // Efectivo del turno: pedidos 100% en efectivo más la fracción en
      // efectivo de los pedidos mixtos. La porción digital no entra en caja.
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

      const efectivoEsperado =
        turnoCaja.montoInicial + ventasEfectivo - turnoCaja.egresosTotales;
      const diferencia = montoContado - efectivoEsperado;
      const resultado: ArqueoCaja['resultado'] =
        Math.abs(diferencia) < 0.005
          ? 'exacta'
          : diferencia > 0
            ? 'sobrante'
            : 'faltante';

      const arqueo: ArqueoCaja = {
        id: generarId('arqueo'),
        turnoId: turnoCaja.id,
        fecha: new Date(),
        usuarioId: turnoCaja.usuarioId,
        usuarioNombre:
          empleados.find(u => u.id === turnoCaja.usuarioId)?.nombre ?? '—',
        montoInicial: turnoCaja.montoInicial,
        ventasEfectivo,
        egresos: turnoCaja.egresosTotales,
        efectivoEsperado,
        montoContado,
        diferencia,
        resultado,
      };

      setArqueos(prev => [...prev, arqueo]);
      setTurnoCaja({
        ...turnoCaja,
        fechaCierre: new Date(),
        montoDeclarado: montoContado,
        diferencia,
        estado: 'cerrado',
      });
      return arqueo;
    },
    [turnoCaja, pedidos],
  );

  // Marchar: crea el pedido de la ronda (no cobrado) y lo acumula en la mesa.
  // La cocina lo ve en el KDS en tiempo real; la mesa queda ocupada.
  const marcharComanda = useCallback(
    (
      mesaNumero: number,
      items: Pedido['items'],
      total: number,
    ): Pedido | null => {
      if (items.length === 0) return null;
      const pedido: Pedido = {
        id: generarId('pedido'),
        mesaNumero,
        tipoServicio: 'salon',
        estado: 'pendiente',
        cobrado: false,
        items,
        total,
        fechaCreacion: new Date(),
        usuarioId: usuarioActual?.id,
        usuarioNombre: usuarioActual?.nombre,
      };
      setPedidos(prev => [...prev, pedido]);
      setMesas(prev => {
        const existe = prev.find(m => m.numero === mesaNumero);
        if (!existe) {
          const nueva: Mesa = {
            id: `mesa-${mesaNumero}`,
            numero: mesaNumero,
            estado: 'ocupada',
            pedidosIds: [pedido.id],
            totalAcumulado: total,
            aperturaHora: new Date().toISOString(),
          };
          return [...prev, nueva];
        }
        return prev.map(m =>
          m.numero === mesaNumero
            ? {
                ...m,
                estado: 'ocupada' as const,
                pedidosIds: [...m.pedidosIds, pedido.id],
                totalAcumulado: m.totalAcumulado + total,
                aperturaHora: m.aperturaHora ?? new Date().toISOString(),
              }
            : m,
        );
      });
      return pedido;
    },
    [usuarioActual],
  );

  // Cobrar y cerrar mesa: marca cobrados los pedidos no anulados con el
  // método elegido (registra la venta contable) y libera la mesa.
  // Pago mixto: sin descuento por efectivo (precio de lista) y con desglose
  // obligatorio que debe sumar exacto al total de la cuenta; se prorratea
  // por ronda (la última absorbe el redondeo) para conservar el arqueo.
  const cobrarMesa = useCallback(
    (
      mesaNumero: number,
      metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto',
      desglose?: DesglosePago,
    ): boolean => {
      const mesa = mesas.find(m => m.numero === mesaNumero);
      if (!mesa) {
        if (import.meta.env.DEV) {
          console.warn('cobrarMesa: mesa no encontrada:', mesaNumero);
        }
        return false;
      }
      if (mesa.estado !== 'ocupada') {
        if (import.meta.env.DEV) {
          console.warn('cobrarMesa: la mesa no está ocupada:', mesaNumero);
        }
        return false;
      }
      const ids = new Set(mesa.pedidosIds);
      const elegibles = pedidos.filter(
        p => ids.has(p.id) && p.estado !== 'anulado',
      );
      if (elegibles.length === 0) {
        if (import.meta.env.DEV) {
          console.warn('cobrarMesa: mesa sin rondas cobrables:', mesaNumero);
        }
        return false;
      }
      const bruto = elegibles.reduce((acc, p) => acc + p.total, 0);
      // Pago mixto: valida el desglose antes de tocar el estado
      if (metodoPago === 'mixto') {
        const valido =
          desglose !== undefined &&
          Number.isFinite(desglose.efectivo) &&
          Number.isFinite(desglose.digital) &&
          desglose.efectivo > 0 &&
          desglose.digital > 0 &&
          desglose.efectivo + desglose.digital === bruto &&
          (desglose.metodoDigital === 'tarjeta' ||
            desglose.metodoDigital === 'transferencia');
        if (!valido) {
          if (import.meta.env.DEV) {
            console.warn(
              'cobrarMesa: desglose mixto inválido para la mesa:',
              mesaNumero,
            );
          }
          return false;
        }
      }
      const { descuento } = calcularDescuento(bruto, metodoPago, configCobro);
      // Distribuye el descuento proporcionalmente (el último absorbe el
      // redondeo) para que la suma cierre exacta al neto cobrado.
      let repartido = 0;
      const dPorPedido = new Map<string, number>();
      elegibles.forEach((p, idx) => {
        const esUltimo = idx === elegibles.length - 1;
        const d =
          descuento > 0 && bruto > 0
            ? esUltimo
              ? descuento - repartido
              : Math.round((p.total * descuento) / bruto)
            : 0;
        repartido += d;
        dPorPedido.set(p.id, d);
      });
      // Prorrateo del desglose mixto por ronda (la última absorbe el
      // redondeo): la suma de fracciones de todas las rondas es exacta.
      let repEf = 0;
      let repDig = 0;
      const ePorPedido = new Map<string, DesglosePago>();
      if (metodoPago === 'mixto' && desglose) {
        elegibles.forEach((p, idx) => {
          const esUltimo = idx === elegibles.length - 1;
          const ef =
            bruto > 0 && !esUltimo
              ? Math.round((p.total * desglose.efectivo) / bruto)
              : desglose.efectivo - repEf;
          const dig =
            bruto > 0 && !esUltimo
              ? Math.round((p.total * desglose.digital) / bruto)
              : desglose.digital - repDig;
          repEf += ef;
          repDig += dig;
          ePorPedido.set(p.id, {
            efectivo: ef,
            digital: dig,
            metodoDigital: desglose.metodoDigital,
          });
        });
      }
      setPedidos(prev =>
        prev.map(p => {
          if (!ids.has(p.id) || p.estado === 'anulado') return p;
          const d = dPorPedido.get(p.id) ?? 0;
          const e = ePorPedido.get(p.id);
          return {
            ...p,
            cobrado: true,
            metodoPago,
            ...(e
              ? { desglosePago: e }
              : {}),
            ...(d > 0
              ? {
                  subtotalBruto: p.total,
                  descuentoMonto: d,
                  total: p.total - d,
                }
              : {}),
            usuarioId: usuarioActual?.id ?? p.usuarioId,
            usuarioNombre: usuarioActual?.nombre ?? p.usuarioNombre,
          };
        }),
      );
      setMesas(prev =>
        prev.map(m =>
          m.numero === mesaNumero
            ? {
                ...m,
                estado: 'libre' as const,
                pedidosIds: [],
                totalAcumulado: 0,
                aperturaHora: undefined,
              }
            : m,
        ),
      );
      return true;
    },
    [mesas, pedidos, usuarioActual],
  );

  // Anular mesa: marca anulados sus pedidos activos no cobrados y libera
  // la mesa. No suma dinero a caja (quedan solo para auditoría).
  // Permitido con caja cerrada: resuelve mesas huérfanas sin turno ficticio.
  const anularMesa = useCallback(
    (mesaNumero: number, motivo?: string): boolean => {
      const mesa = mesas.find(m => m.numero === mesaNumero);
      if (!mesa) {
        if (import.meta.env.DEV) {
          console.warn('anularMesa: mesa no encontrada:', mesaNumero);
        }
        return false;
      }
      if (mesa.estado !== 'ocupada') {
        return false;
      }
      const ids = new Set(mesa.pedidosIds);
      const motivoFinal =
        (motivo ?? '').trim() || 'Cuenta anulada desde el POS';
      setPedidos(prev =>
        prev.map(p =>
          ids.has(p.id) && p.estado !== 'anulado'
            ? {
                ...p,
                estado: 'anulado' as const,
                motivoAnulacion: motivoFinal,
                anuladoPor: usuarioActual?.nombre ?? '—',
                fechaAnulacion: new Date(),
              }
            : p,
        ),
      );
      setMesas(prev =>
        prev.map(m =>
          m.numero === mesaNumero
            ? {
                ...m,
                estado: 'libre' as const,
                pedidosIds: [],
                totalAcumulado: 0,
                aperturaHora: undefined,
              }
            : m,
        ),
      );
      if (import.meta.env.DEV) {
        console.log('Mesa anulada y liberada:', mesaNumero);
      }
      return true;
    },
    [mesas, usuarioActual],
  );

  // Alta de mesa: crea correlativamente la siguiente (Mesa 13, 14...)
  // en estado libre, sin pedidos. Devuelve la mesa creada.
  const agregarMesa = useCallback((): Mesa => {
    const siguiente =
      mesas.length === 0
        ? 1
        : Math.max(...mesas.map(m => m.numero)) + 1;
    const nueva: Mesa = {
      id: `mesa-${siguiente}`,
      numero: siguiente,
      estado: 'libre',
      pedidosIds: [],
      totalAcumulado: 0,
    };
    setMesas(prev =>
      prev.some(m => m.numero === siguiente) ? prev : [...prev, nueva],
    );
    return nueva;
  }, [mesas]);

  // Baja de mesa con validación defensiva: solo si está libre, sin rondas
  // ni saldo pendiente. Si está ocupada se rechaza con mensaje explicativo.
  const eliminarMesa = useCallback(
    (
      mesaNumero: number,
    ): { ok: true } | { ok: false; error: string } => {
      const mesa = mesas.find(m => m.numero === mesaNumero);
      if (!mesa) return { ok: false, error: 'Mesa no encontrada.' };
      if (
        mesa.estado !== 'libre' ||
        mesa.pedidosIds.length > 0 ||
        mesa.totalAcumulado > 0
      ) {
        return {
          ok: false,
          error: `La Mesa ${mesaNumero} está ocupada. Cobrá o anulá la cuenta antes de eliminarla.`,
        };
      }
      setMesas(prev => prev.filter(m => m.numero !== mesaNumero));
      return { ok: true };
    },
    [mesas],
  );

  // Actualizar etiqueta o recargo de un modificador global
  const actualizarModificador = useCallback(
    (
      id: string,
      cambios: Partial<
        Pick<ModificadorGlobal, 'etiqueta' | 'etiquetaTicket' | 'recargo'>
      >,
    ) => {
      setModificadores(prev =>
        prev.map(m => {
          if (m.id !== id) return m;
          const recargo =
            cambios.recargo === undefined ||
            !Number.isFinite(cambios.recargo) ||
            cambios.recargo < 0
              ? m.recargo
              : Math.round(cambios.recargo);
          return {
            ...m,
            etiqueta:
              cambios.etiqueta?.trim() !== undefined &&
              cambios.etiqueta?.trim() !== ''
                ? cambios.etiqueta.trim()
                : m.etiqueta,
            etiquetaTicket:
              cambios.etiquetaTicket?.trim() !== undefined &&
              cambios.etiquetaTicket?.trim() !== ''
                ? cambios.etiquetaTicket.trim()
                : m.etiquetaTicket,
            recargo,
          };
        }),
      );
    },
    [],
  );

  // Políticas de cobro (descuento por pago en efectivo)
  const [configCobro, setConfigCobro] = useState<ConfigCobro>(cargarConfigCobro);

  // Persistir políticas en localStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_COBRO, JSON.stringify(configCobro));
    } catch {
      // Sin persistencia disponible
    }
  }, [configCobro]);

  // Sincronización multi-pestaña de políticas de cobro
  useEffect(() => {
    const sincronizarCobro = (e: StorageEvent) => {
      if (e.key !== CLAVE_COBRO) return;
      try {
        const cfg = parsearConfigCobro(e.newValue);
        if (cfg) setConfigCobro(cfg);
      } catch {
        // Evento corrupto → se ignora
      }
    };
    window.addEventListener('storage', sincronizarCobro);
    return () => window.removeEventListener('storage', sincronizarCobro);
  }, []);

  // Actualizar políticas con validación (porcentaje 0–90)
  const actualizarConfigCobro = useCallback(
    (
      cambios: Partial<
        Pick<ConfigCobro, 'descuentoEfectivoHabilitado' | 'descuentoEfectivoPorcentaje'>
      >,
    ) => {
      setConfigCobro(prev => {
        const porcentaje =
          cambios.descuentoEfectivoPorcentaje === undefined ||
          !Number.isFinite(cambios.descuentoEfectivoPorcentaje)
            ? prev.descuentoEfectivoPorcentaje
            : Math.min(
                90,
                Math.max(0, Math.round(cambios.descuentoEfectivoPorcentaje)),
              );
        return {
          descuentoEfectivoHabilitado:
            cambios.descuentoEfectivoHabilitado ??
            prev.descuentoEfectivoHabilitado,
          descuentoEfectivoPorcentaje: porcentaje,
        };
      });
    },
    [],
  );

  const valor: AppContextValue = {
    pedidos,
    agregarPedido,
    actualizarPedidoEstado,
    eliminarPedido,
    turnoCaja,
    abrirTurno,
    cerrarTurno,
    registrarEgreso,
    productos,
    categorias,
    toggleProductoDisponible,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    usuarioActual,
    setUsuarioActual,
    rolActual,
    seleccionarUsuarioPorRol,
    iniciarSesion,
    cerrarSesion,
    fichajes,
    marcarFichaje,
    obtenerEmpleadoPorPin,
    ficharPorPin,
    empleados,
    agregarEmpleado,
    actualizarEmpleado,
    desactivarEmpleado,
    arqueos,
    cerrarTurnoConArqueo,
    modificadores,
    actualizarModificador,
    egresos,
    anularPedido,
    mesas,
    marcharComanda,
    cobrarMesa,
    anularMesa,
    agregarMesa,
    eliminarMesa,
    configCobro,
    actualizarConfigCobro,
    crearCategoria,
  };

  return (
    <AppContext.Provider value={valor}>
      {children}
    </AppContext.Provider>
  );
};