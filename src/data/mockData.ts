// CÓMO PERSONALIZAR LA CARTA PARA UN NUEVO LOCAL (menos de 5 minutos):
//   1. Reemplazá `categorias` por las secciones del nuevo comercio
//      (cada una con id único, nombre e icono de lucide-react).
//   2. Reemplazá `productos` por su catálogo (nombre, descripción,
//      precio, categoriaId existente, disponible y modificadores).
//   3. Si el rubro no usa personalización de bebidas, actualizá
//      CATEGORIAS_BEBIDA con las categorías que abren el modal del POS
//      (o marcá producto por producto con el flag `personalizable`).
//   4. Ajustá MODIFICADORES_BASE (leches y extras con sus recargos).
//   5. Cambiá nombre y subtítulo en src/config/comercio.ts.
// Los IDs de categorías y productos deben ser únicos y estables:
// el POS, la cocina y el historial los referencian por id.
import type { Categoria, ModificadorGlobal, Producto } from '../types';

// Carta del local: 5 secciones gastronómicas
export const categorias: Categoria[] = [
  { id: 'cafeteria', nombre: 'Cafetería', icono: 'Coffee' },
  { id: 'tes', nombre: 'Tés & Infusiones', icono: 'Leaf' },
  { id: 'frias', nombre: 'Bebidas Frías', icono: 'CupSoda' },
  { id: 'pasteleria', nombre: 'Pastelería Dulce', icono: 'Croissant' },
  { id: 'tostados', nombre: 'Tostados & Salados', icono: 'Sandwich' },
];

// Categorías que abren el modal de personalización en el POS (bebidas)
export const CATEGORIAS_BEBIDA = ['cafeteria', 'tes', 'frias'];

// Precios base de modificadores globales (editables por el dueño en /admin)
export const MODIFICADORES_BASE: ModificadorGlobal[] = [
  { id: 'entera', grupo: 'leche', etiqueta: 'Entera', etiquetaTicket: 'Leche entera', recargo: 0 },
  { id: 'descremada', grupo: 'leche', etiqueta: 'Descremada', etiquetaTicket: 'Leche descremada', recargo: 0 },
  { id: 'almendras', grupo: 'leche', etiqueta: 'Almendras', etiquetaTicket: 'Leche de almendras', recargo: 300 },
  { id: 'avena', grupo: 'leche', etiqueta: 'Avena', etiquetaTicket: 'Leche de avena', recargo: 400 },
  { id: 'sin-crema', grupo: 'extra', etiqueta: 'Sin crema', etiquetaTicket: 'Sin crema', recargo: 0 },
  { id: 'sin-sirope', grupo: 'extra', etiqueta: 'Sin sirope', etiquetaTicket: 'Sin sirope', recargo: 0 },
  { id: 'extra-shot', grupo: 'extra', etiqueta: 'Extra shot espresso', etiquetaTicket: 'Extra shot espresso', recargo: 400 },
];

// Productos de la carta con ingredientes y opciones para el cliente
export const productos: Producto[] = [
  // Cafetería
  {
    id: 'espresso-simple',
    categoriaId: 'cafeteria',
    nombre: 'Espresso Simple',
    descripcion:
      'Shot simple de café arábica de especialidad, molienda fina y extracción de 25 segundos.',
    precio: 25,
    imagen: '',
    disponible: true,
    modificadores: [
      'Notas de cata: chocolate y frutos secos',
      'Doble shot',
    ],
  },
  {
    id: 'espresso-doble',
    categoriaId: 'cafeteria',
    nombre: 'Espresso Doble',
    descripcion:
      'Doble shot de arábica de especialidad. Cuerpo intenso con crema dorada persistente.',
    precio: 35,
    imagen: '',
    disponible: true,
    modificadores: ['Notas de cata: chocolate y frutos secos'],
  },
  {
    id: 'latte-clasico',
    categoriaId: 'cafeteria',
    nombre: 'Latte Clásico',
    descripcion:
      'Espresso doble con leche vaporizada sedosa y fina capa de espuma. Granos arábica de Huila, Colombia.',
    precio: 45,
    imagen: '',
    disponible: true,
    modificadores: [
      'Opciones de leche: Entera, Descremada, Almendras, Avena',
      'Vainilla',
      'Caramelo',
      'Extra shot',
    ],
  },
  {
    id: 'capuchino',
    categoriaId: 'cafeteria',
    nombre: 'Capuchino Italiano',
    descripcion:
      'Espresso, leche vaporizada y abundante espuma espolvoreada con cacao amargo.',
    precio: 48,
    imagen: '',
    disponible: true,
    modificadores: [
      'Opciones de leche: Entera, Descremada, Almendras, Avena',
      'Cacao extra',
    ],
  },
  {
    id: 'flat-white',
    categoriaId: 'cafeteria',
    nombre: 'Flat White',
    descripcion:
      'Doble ristretto con leche microespumada aterciopelada en taza pequeña. Sabor intenso y cremoso.',
    precio: 50,
    imagen: '',
    disponible: true,
    modificadores: [
      'Opciones de leche: Entera, Descremada, Almendras, Avena',
    ],
  },
  // Tés & Infusiones
  {
    id: 'te-verde',
    categoriaId: 'tes',
    nombre: 'Té Verde Sencha',
    descripcion:
      'Hojas enteras de té verde japonés infusionado a 80°. Fresco y herbal, con notas vegetales y final dulzón.',
    precio: 35,
    imagen: '',
    disponible: true,
    modificadores: ['Miel', 'Limón', 'Jengibre'],
  },
  {
    id: 'earl-grey',
    categoriaId: 'tes',
    nombre: 'Earl Grey',
    descripcion:
      'Té negro de Ceilán aromatizado con bergamota natural. Intenso y cítrico, ideal con un toque de leche.',
    precio: 35,
    imagen: '',
    disponible: true,
    modificadores: ['Leche', 'Limón', 'Miel'],
  },
  {
    id: 'manzanilla',
    categoriaId: 'tes',
    nombre: 'Manzanilla con Naranja',
    descripcion:
      'Flores de manzanilla, cáscara de naranja y miel. Infusión calmante y digestiva.',
    precio: 32,
    imagen: '',
    disponible: true,
    modificadores: ['Miel extra'],
  },
  {
    id: 'chai-latte',
    categoriaId: 'tes',
    nombre: 'Chai Latte',
    descripcion:
      'Té negro especiado con canela, cardamomo, jengibre y clavo, coronado con leche vaporizada.',
    precio: 48,
    imagen: '',
    disponible: true,
    modificadores: [
      'Opciones de leche: Entera, Descremada, Almendras, Avena',
      'Extra canela',
    ],
  },
  // Bebidas Frías
  {
    id: 'frappe-vainilla',
    categoriaId: 'frias',
    nombre: 'Frappe de Vainilla',
    descripcion:
      'Espresso frío batido con leche, hielo y sirope natural de vainilla, coronado con crema.',
    precio: 55,
    imagen: '',
    disponible: true,
    modificadores: ['Crema batida', 'Sin crema', 'Extra café'],
  },
  {
    id: 'frappe-chocolate',
    categoriaId: 'frias',
    nombre: 'Frappe de Chocolate',
    descripcion:
      'Espresso frío, leche, hielo y salsa de chocolate belga, con crema batida y cacao.',
    precio: 58,
    imagen: '',
    disponible: true,
    modificadores: ['Crema batida', 'Chocolate extra'],
  },
  {
    id: 'limonada',
    categoriaId: 'frias',
    nombre: 'Limonada con Menta y Jengibre',
    descripcion:
      'Limones frescos exprimidos, menta machacada, jengibre y azúcar mascabo. Se sirve bien fría.',
    precio: 40,
    imagen: '',
    disponible: true,
    modificadores: ['Sin azúcar', 'Menta extra'],
  },
  {
    id: 'cold-brew',
    categoriaId: 'frias',
    nombre: 'Cold Brew Tonic',
    descripcion:
      'Café de filtrado en frío durante 18 horas, servido sobre tónica con hielo y rodaja de naranja.',
    precio: 52,
    imagen: '',
    disponible: true,
    modificadores: [
      'Notas de cata: cítricas y achocolatadas',
      'Sin tónica',
    ],
  },
  // Pastelería Dulce
  {
    id: 'medialuna',
    categoriaId: 'pasteleria',
    nombre: 'Medialuna de Manteca',
    descripcion:
      'Medialuna hojaldrada de masa madre con manteca y almíbar de naranja. Horneada cada mañana.',
    precio: 30,
    imagen: '',
    disponible: true,
    modificadores: ['Con jamón y queso', 'Con dulce de leche'],
  },
  {
    id: 'croissant',
    categoriaId: 'pasteleria',
    nombre: 'Croissant Francés',
    descripcion:
      'Hojaldre francés de 27 capas con manteca premium. Crujiente por fuera, suave por dentro.',
    precio: 38,
    imagen: '',
    disponible: true,
    modificadores: ['Relleno de chocolate', 'Relleno de almendras'],
  },
  {
    id: 'muffin',
    categoriaId: 'pasteleria',
    nombre: 'Muffin de Arándanos',
    descripcion:
      'Muffin esponjoso con arándanos frescos y crumble de avena. Receta con yogur natural.',
    precio: 42,
    imagen: '',
    disponible: true,
    modificadores: ['Tibio', 'Con manteca'],
  },
  {
    id: 'torta-chocolate',
    categoriaId: 'pasteleria',
    nombre: 'Torta Húmeda de Chocolate',
    descripcion:
      'Porción de bizcocho húmedo de cacao al 70% con ganache semiamargo y escamas de sal marina.',
    precio: 55,
    imagen: '',
    disponible: false,
    modificadores: ['Con crema', 'Porción grande'],
  },
  // Tostados & Salados
  {
    id: 'tostado-jq',
    categoriaId: 'tostados',
    nombre: 'Tostado de Jamón y Queso',
    descripcion:
      'Pan de campo tostado en manteca con jamón natural y queso tybo fundido. Se sirve con ensaladita verde.',
    precio: 60,
    imagen: '',
    disponible: true,
    modificadores: ['Pan integral', 'Queso extra', 'Sin ensalada'],
  },
  {
    id: 'avocado-toast',
    categoriaId: 'tostados',
    nombre: 'Avocado Toast',
    descripcion:
      'Pan de masa madre tostado con palta aplastada, huevo poché, semillas, oliva, limón y pimienta.',
    precio: 65,
    imagen: '',
    disponible: true,
    modificadores: ['Sin huevo', 'Doble palta', 'Pan sin gluten'],
  },
  {
    id: 'tostadas-queso',
    categoriaId: 'tostados',
    nombre: 'Tostadas con Queso Untable',
    descripcion:
      'Tres tostadas de pan integral con queso untable, mermelada de frutos rojos y manteca de maní.',
    precio: 45,
    imagen: '',
    disponible: true,
    modificadores: ['Mermelada light', 'Solo manteca de maní'],
  },
];
