import { StrictMode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js'); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes><Route path="/admin" element={<App />} /><Route path="*" element={<App />} /></Routes>
    </BrowserRouter>
  </StrictMode>,
);
