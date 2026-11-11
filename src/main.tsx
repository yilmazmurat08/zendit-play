import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// Inter is bundled into the app (latin + latin-ext covers Turkish) - no font download from the internet.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-ext-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-ext-800.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// A failed background request must never surface as an "unhandled rejection" crash report or a
// frozen screen: log it and carry on. Screens show their own error messages for the calls they await.
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Zendit: unhandled rejection', event.reason);
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

