import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // TODO: StrictMode temporariamente desabilitado para debug do timing do AuthProvider
  // Reabilitar após resolver issues de double-render durante init do auth
  // StrictMode ajuda a detectar bugs, então deve ser reabilitado em produção
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);








