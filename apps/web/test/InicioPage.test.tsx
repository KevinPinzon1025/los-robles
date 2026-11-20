import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InicioPage } from '../src/features/inicio/pages/InicioPage.js';
import { getHealth } from '../src/features/sistema/api.js';

vi.mock('../src/features/sistema/api.js', () => ({ getHealth: vi.fn() }));

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <InicioPage />
    </QueryClientProvider>,
  );
}

describe('InicioPage', () => {
  beforeEach(() => vi.resetAllMocks());

  it('renderiza el título y confirma una API saludable', async () => {
    vi.mocked(getHealth).mockResolvedValue({
      status: 'ok',
      version: '0.1.0',
      uptimeSeg: 10,
      dependencias: { db: 'up', rabbitmq: 'up' },
    });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Reserva tu cancha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(await within(screen.getByRole('status')).findByText('API en línea')).toBeInTheDocument();
  });

  it('indica que la API no está disponible si la consulta falla', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('Sin conexión'));
    renderPage();
    expect(
      await within(screen.getByRole('status')).findByText('API no disponible'),
    ).toBeInTheDocument();
  });
});
