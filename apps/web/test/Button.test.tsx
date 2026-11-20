import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Button } from '../src/shared/components/ui/Button.js';

it('muestra un spinner y deshabilita el botón si está cargando', () => {
  render(<Button loading>Guardar</Button>);
  expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
});
