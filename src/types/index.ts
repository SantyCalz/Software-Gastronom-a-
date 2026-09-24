export interface Categoria {
  id: string;
  nombre: string;
  icono: string;
}

export interface Producto {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  disponible: boolean;
  modificadores: string[];
  personalizable?: boolean;
  esPromocion?: boolean;
  precioOriginal?: number;
}

export interface ModificadorGlobal {
  id: string;
  grupo: 'leche' | 'extra';
  etiqueta: string;
  etiquetaTicket: string;
  recargo: number;
}

export interface ItemPedido {
  id: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  modificadores?: string[];
  nota?: string;
}

export interface DesglosePago {
  efectivo: number;
  digital: number;
  metodoDigital: 'tarjeta' | 'transferencia';
}

export interface Pedido {
  id: string;
  mesaNumero: number;
  tipoServicio: 'salon' | 'takeaway';
  estado: 'pendiente' | 'preparacion' | 'listo' | 'entregado' | 'anulado';
  items: ItemPedido[];
  total: number;
  metodoPago?: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  /** Solo en pago mixto: fracciones en efectivo y digital (suman `total`). */
  desglosePago?: DesglosePago;
  cobrado?: boolean;
  fechaCreacion: Date;
  usuarioId?: string;
  usuarioNombre?: string;
  motivoAnulacion?: string;
  anuladoPor?: string;
  fechaAnulacion?: Date;
  descuentoMonto?: number;
  subtotalBruto?: number;
}

export interface TurnoCaja {
  id: string;
  usuarioId: string;
  fechaApertura: Date;
  fechaCierre?: Date;
  montoInicial: number;
  ingresosEfectivo: number;
  ingresosDigitales: number;
  egresosTotales: number;
  montoDeclarado: number;
  diferencia: number;
  estado: 'abierto' | 'cerrado';
}

export interface Usuario {
  id: string;
  nombre: string;
  pin: string;
  rol: 'admin' | 'cajero' | 'barista';
  activo: boolean;
}

export interface Fichaje {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  rol: 'admin' | 'cajero' | 'barista';
  tipo: 'entrada' | 'salida';
  fechaHora: Date;
}

export interface ArqueoCaja {
  id: string;
  turnoId: string;
  fecha: Date;
  usuarioId: string;
  usuarioNombre: string;
  montoInicial: number;
  ventasEfectivo: number;
  egresos: number;
  efectivoEsperado: number;
  montoContado: number;
  diferencia: number;
  resultado: 'sobrante' | 'faltante' | 'exacta';
}

export interface Egreso {
  id: string;
  monto: number;
  motivo: string;
  fechaHora: Date;
  usuarioId?: string;
  usuarioNombre: string;
  turnoId?: string;
}

export interface Mesa {
  id: string;
  numero: number;
  estado: 'libre' | 'ocupada';
  pedidosIds: string[];
  totalAcumulado: number;
  aperturaHora?: string;
}

export interface ConfigCobro {
  descuentoEfectivoHabilitado: boolean;
  descuentoEfectivoPorcentaje: number;
}