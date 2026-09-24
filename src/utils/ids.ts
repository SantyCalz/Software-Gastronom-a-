// Genera IDs únicos: crypto.randomUUID() con fallback a timestamp+aleatorio
// (evita las colisiones de Date.now() en toques rápidos consecutivos)
export const generarId = (prefijo: string): string => {
  const cripto: Crypto | undefined =
    typeof crypto !== 'undefined' ? crypto : undefined;
  if (cripto && typeof cripto.randomUUID === 'function') {
    return `${prefijo}-${cripto.randomUUID()}`;
  }
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
};
