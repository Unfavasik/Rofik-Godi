import { StrictMode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {createRoot} from 'react-dom/client';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes><Route path="*" element={<App />} /></Routes>
    </BrowserRouter>
  </StrictMode>,
);
