import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router-dom';

import './styles/tokens.css';
import './styles/base.css';

import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';

/*
 * Pick the routing strategy the host environment can actually support.
 *
 *   http(s)          → BrowserRouter, clean paths (/blocks/SF/floors/1F)
 *   file://          → HashRouter, the History API is unavailable
 *   opaque origin    → MemoryRouter
 *
 * The last case covers sandboxed preview frames and srcdoc documents, where
 * `location.origin` is the string "null": `history.pushState` throws a
 * SecurityError and React Router's `new URL(path, origin)` throws
 * "Invalid base URL". MemoryRouter keeps the history in memory and never
 * touches the address bar, so the app runs normally there.
 */
function pickRouter() {
  const { protocol, origin } = window.location;

  if (protocol === 'http:' || protocol === 'https:') {
    try {
      window.history.pushState({}, '', window.location.href);
      return BrowserRouter;
    } catch {
      /* sandboxed despite an http origin — fall through */
    }
  }

  try {
    // Both routers build URLs against the origin; an opaque origin rejects it.
    void new URL('/', origin);
    return HashRouter;
  } catch {
    return MemoryRouter;
  }
}

const Router = pickRouter();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <App />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
