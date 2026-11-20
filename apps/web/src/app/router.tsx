import { createBrowserRouter } from 'react-router';
import { AppLayout } from './layout/AppLayout.js';
import { InicioPage } from '../features/inicio/pages/InicioPage.js';
import { NoEncontradoPage } from '../features/sistema/NoEncontradoPage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <InicioPage /> },
      { path: '*', element: <NoEncontradoPage /> },
    ],
  },
]);
