import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { aplicarTema, resolverTemaInicial } from './lib/theme';
import './index.css';

// Aplica el tema guardado antes del primer renderizado de React.
aplicarTema(resolverTemaInicial());

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
