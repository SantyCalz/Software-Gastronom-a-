import type { ConfigCobro } from '../types';

// Descuento por pago en efectivo: fuente única de cálculo para el POS
// (visualización y cobro) y el contexto (distribución en cierre de mesa).
// Devuelve siempre { bruto, descuento, neto }; con el descuento apagado
// o método distinto de efectivo, descuento es 0 y neto equals bruto.
export const calcularDescuento = (
  bruto: number,
  metodoPago: string | undefined,
  cfg: ConfigCobro,
): { bruto: number; descuento: number; neto: number } => {
  if (!cfg.descuentoEfectivoHabilitado || metodoPago !== 'efectivo') {
    return { bruto, descuento: 0, neto: bruto };
  }
  const descuento = Math.round(
    (bruto * cfg.descuentoEfectivoPorcentaje) / 100,
  );
  return { bruto, descuento, neto: bruto - descuento };
};
