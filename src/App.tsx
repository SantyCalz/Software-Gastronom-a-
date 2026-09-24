import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import Navbar from './components/common/Navbar';
import MenuQR from './components/menu/MenuQR';
import POS from './components/pos/POS';
import Kitchen from './components/kitchen/Kitchen';
import AdminPanel from './components/admin/AdminPanel';

const AccesoDenegado: React.FC = () => (
  <div className="bg-stone-900 text-stone-100 flex items-center justify-center p-6 py-16">
    <div className="max-w-md w-full bg-stone-950 border border-stone-800 rounded-2xl p-8 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/40">
        <Lock className="h-6 w-6 text-red-400" />
      </span>
      <h1 className="text-xl font-bold text-stone-100">Acceso denegado</h1>
      <p className="mt-2 text-sm text-stone-400">
        Esta sección es solo para administradores. Iniciá sesión con un
        usuario admin para continuar.
      </p>
      <Link
        to="/pos"
        className="mt-6 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
      >
        Volver al Punto de Venta
      </Link>
    </div>
  </div>
);

// Solo el rol admin puede ver el panel; el resto recibe el cartel
const RutaAdmin: React.FC = () => {
  const { usuarioActual } = useAppContext();
  if (usuarioActual?.rol !== 'admin') {
    return <AccesoDenegado />;
  }
  return <AdminPanel />;
};

function ContenidoApp() {
  const location = useLocation();
  // La carta digital (/menu) es 100% de cara al cliente: sin Navbar
  const esMenuPublico = location.pathname === '/menu';

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      {!esMenuPublico && <Navbar />}
      <main className="flex-1">
        <Routes>
          {/* Redirecciona la raíz al POS o la ruta inicial que prefieras */}
          <Route path="/" element={<Navigate to="/pos" replace />} />

          <Route path="/menu" element={<MenuQR />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/cocina" element={<Kitchen />} />
          <Route path="/admin" element={<RutaAdmin />} />

          {/* Captura cualquier otra ruta no encontrada */}
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppProvider>
        <ContenidoApp />
      </AppProvider>
    </Router>
  );
}

export default App;
