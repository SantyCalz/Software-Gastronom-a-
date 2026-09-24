// Configuración central del negocio (plantilla gastronómica reutilizable).
//
// Para adaptar el sistema a un nuevo local en menos de 5 minutos:
//   1. Cambiá nombre, subtitulo y rubro acá.
//   2. Reemplazá las categorías y productos en src/data/mockData.ts
//      (ver el bloque "CÓMO PERSONALIZAR LA CARTA" al inicio de ese archivo).
//   3. Ajustá los modificadores base (MODIFICADORES_BASE) al nuevo menú.
//
// Campos reservados para la siguiente iteración (tickets impresos):
// logoUrl, moneda y sloganTicket ya están definidos pero aún no se
// renderizan: el logo usa el icono default y los precios usan '$'.
export const COMERCIO_CONFIG = {
  nombre: 'CoffeePOS',
  subtitulo: 'Café de Especialidad & Pastelería Artesanal',
  sloganTicket: 'Gracias por visitarnos · ¡Que tengas un gran día!',
  rubro: 'cafeteria', // cafeteria | restaurante | bar | panaderia
  moneda: '$',
  logoUrl: '/logo.svg', // o componente de icono default
  modificadoresHabilitados: true, // muestra u oculta leches/extras y notas
  mesasHabilitadas: true, // muestra u oculta el modo Salón con mesas
  descuentoEfectivoHabilitado: true, // 10% off pagando en efectivo
  descuentoEfectivoPorcentaje: 10,
};
