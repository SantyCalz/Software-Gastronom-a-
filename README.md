# CoffeePOS

![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)
![Offline-First](https://img.shields.io/badge/Offline--First-100%25_garantizado-22C55E)

> **Sistema integral de gestión comercial gastronómica: autónomo, de latencia cero, sin backend ni costos recurrentes de suscripción.**

CoffeePOS es una aplicación de punto de venta y gestión para locales gastronómicos que corre íntegramente en el navegador del equipo. No depende de servidores externos ni de conexión a internet: si se corta la red, el local sigue tomando comandas, cobrando y cerrando caja con total normalidad. Los datos pertenecen al comercio y viven en su propio equipo.

---

## Mercados aplicables

| Comercio | Por qué encaja |
|---|---|
| **Cafeterías de especialidad** | Modificadores con recargo (leches vegetales, extras), salón + Take Away en un clic y carta digital QR para el cliente. |
| **Cervecerías artesanales / Bares de tapas** | Rondas acumuladas por mesa, cobro ágil, pagos mixtos (efectivo + digital) y tablero KDS para cocina/barra. |
| **Heladerías artesanales** | Venta visual rápida de mostrador, rotación de personal con reloj de fichaje y arqueo ciego estricto al cierre. |
| **Hamburgueserías y pizzerías al paso** | Despacho rápido a cocina, promociones con precio original tachado y modo Take Away. |
| **Food trucks y eventos** | Funcionamiento 100 % garantizado sin internet (offline real). |

---

## Funcionalidades clave

### Punto de Venta panorámico

- **3 paneles simétricos**: plano del salón, catálogo táctil por categorías y comanda lateral fija con totales en vivo.
- **Mesas dinámicas**: alta correlativa (`+ Nueva Mesa`) y baja desde el panel de administración con **validación defensiva** (una mesa ocupada no se puede eliminar hasta cobrar o anular su cuenta).
- **Salón vs. Take Away en un clic**, con marchado de rondas a cocina sin cobrar.
- **Motor de promociones**: sección destacada de combos con precio original tachado automáticamente y validación (el precio promo debe ser menor al de lista).
- **Categorías autogestionables** en caliente, sin recargar.

### Cobro flexible y pagos mixtos

| Método | Comportamiento |
|---|---|
| Efectivo | Aplica descuento configurable (0–90 %) solo si el **100 %** de la cuenta es en efectivo. |
| Tarjeta / MP-QR | Precio de lista, sin descuento. |
| **Mixto (dividido)** | Modal temático: monto en efectivo + saldo digital (tarjeta o MP/QR). Sin descuento; la fracción en efectivo ingresa a caja y la digital se computa como ingreso electrónico. |

Toda la imputación contable cuadra al centavo: el desglose mixto se prorratea por ronda y el arqueo, los KPIs y los CSV lo reflejan.

### Seguridad operacional de caja

- **Turnos estrictos**: sin turno abierto no se puede cobrar (bloqueo con atajo a apertura).
- **Egresos documentados**: monto y motivo obligatorios, con alerta explícita si el retiro deja saldo negativo.
- **Arqueo ciego**: el cajero ingresa el contado sin ver el esperado; el sistema revela **sobrante / faltante / caja exacta** y lo archiva en el histórico auditable.
- **Anulaciones auditadas**: siempre con motivo, responsable y fecha; salen de la facturación pero se conservan para auditoría.

### Pantalla de cocina (KDS Kanban)

Tablero Pendientes → En preparación → Listos con **tiempos en vivo**, alerta visual de urgencia (+15 min), modificadores y notas destacadas por ítem, y sección de **anulados por caja en tiempo real** para frenar preparación.

### Recursos humanos

- **Kiosco de fichaje con PIN** (teclado táctil y físico, sin cerrar la sesión del cajero).
- **Horas netas por jornada** por empleado, personal en turno ahora e historial completo.
- Gestión de empleados con roles (`admin` / `cajero` / `barista`), PIN único de 4 dígitos y **panel de administración protegido** (solo admin).

### Exportaciones contables

CSVs unificados en formato **RFC-4180 con BOM UTF-8** (apertura nativa en Excel y LibreOffice, sin re-tipeo):

| Informe | Contenido |
|---|---|
| Ventas y facturación | Fecha, hora, cajero, método (con desglose mixto), total, descuento, estado y motivo de anulación. |
| Movimientos de caja | Aperturas, arqueos con diferencia y egresos con responsable. |
| Catálogo / Stock | Precios, disponibilidad, promos y modificadores. |
| Asistencia | Entradas, salidas y horas netas por jornada. |

---

## Arquitectura y despliegue

| Aspecto | Detalle |
|---|---|
| Entorno | Navegador moderno. SPA local, cero latencia, cero dependencias de red en operación. |
| Persistencia | `localStorage` por **dominios aislados** (`pedidos`, `mesas:v1`, `turno`, `productos`, `categorías`, `fichajes`, `arqueos`, `egresos`, `empleados`, `sesión`, `políticas`, `modificadores`) con **parsers defensivos**: ante JSON corrupto o cuota llena, cada dominio cae a su semilla sin voltear la app. |
| Multi-pestaña | Sincronización por eventos `storage` (cobrar en una pestaña actualiza cocina y admin sin recargar). |
| Rutas | `/pos` (venta) · `/cocina` (KDS) · `/admin` (solo admin) · `/menu` (carta QR pública, sin navegación interna). |

### Instalación y desarrollo

```bash
npm install   # instala dependencias
npm run dev   # entorno de desarrollo
npm run build # chequeo de tipos (tsc) + build de producción
```

### Personalizar para un nuevo local (menos de 5 minutos)

1. Nombre y subtítulo en `src/config/comercio.ts`.
2. Categorías, productos y modificadores en `src/data/mockData.ts`.
3. Ajustar flags (`mesasHabilitadas`, `modificadoresHabilitados`, descuento por efectivo) en el mismo config.

---

*CoffeePOS — el local sigue facturando aunque se caiga internet.*
