import { StrictMode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js'); });
  } else {
    void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(
      registrations.map((registration) => registration.unregister()),
    ));
  }
}

// Explicit URL table; App remains a single persistent layout so route changes
// do not reset authentication, cart, wishlist, or modal state.
const pagePaths = [
  'home',
  'shop',
  'search',
  'custom',
  'wishlist',
  'cart',
  'profile',
  'account',
  'notifications',
  'notification',
  'admin',
  'Onboarding',
  'signup',
  'signup/onboarding',
  'signup/loading',
  'example/shop',
];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={null} />
          {pagePaths.map((path) => <Route key={path} path={path} element={null} />)}
          <Route path="*" element={null} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
