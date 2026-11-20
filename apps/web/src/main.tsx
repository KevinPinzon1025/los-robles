import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from './app/router.js';
import { Providers } from './app/providers.js';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el punto de montaje de la aplicación.');

createRoot(root).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
