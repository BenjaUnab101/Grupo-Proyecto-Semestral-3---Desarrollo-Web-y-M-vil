import SesionProvider from './context/SesionProvider.jsx';
import PaginaPrincipal from './pages/PaginaPrincipal.jsx';

// TEC-17: App solo monta la sesión demo y la página. Todo lo demás está en pages/.
export default function App() {
  return (
    <SesionProvider>
      <PaginaPrincipal />
    </SesionProvider>
  );
}
