import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// ✅ StrictMode reabilitado para detecção de bugs em desenvolvimento
// O double-render em development é intencional e ajuda a encontrar problemas

// [DEBUG] Expor supabase para console debugging
import { supabase } from './lib/supabase';
(window as any).supabase = supabase;

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);








