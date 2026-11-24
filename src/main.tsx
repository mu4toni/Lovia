import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary/ErrorBoundary';
import { telegramService } from './services/telegramService';
import './styles/global.css';
import './styles/scrapbook.css';

// Synchronous theme & accent restoration before render to avoid flash of default colors
const savedTheme = localStorage.getItem('lovia_theme');
if (savedTheme === 'light' || savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

const savedAccent = localStorage.getItem('lovia_accent_color') || 'strawberry';
document.documentElement.setAttribute('data-accent', savedAccent);

// Initialize Telegram Mini App SDK environment
telegramService.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
