import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('main.tsx is running');

// Captura de erro global para depuração em produção
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: sans-serif; text-align: center;">
        <h1 style="font-weight: 900;">Erro Fatal de Carregamento</h1>
        <p style="font-weight: bold; color: #555;">O aplicativo não pôde ser iniciado.</p>
        <div style="margin-top: 20px; padding: 10px; background: #fee; border-radius: 8px; font-size: 12px; text-align: left; overflow: auto;">
          <strong>Erro:</strong> ${message}<br>
          <strong>Fonte:</strong> ${source}:${lineno}:${colno}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #000; color: #fff; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
          Tentar Novamente
        </button>
      </div>
    `;
  }
  return false;
};

try {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Elemento #root não encontrado no index.html');
  }
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (e: any) {
  console.error('Falha ao montar o React:', e);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red;"><h1>Erro na Montagem: ${e.message}</h1></div>`;
  }
}
