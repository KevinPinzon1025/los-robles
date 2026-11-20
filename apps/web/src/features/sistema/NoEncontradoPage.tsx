import { Link } from 'react-router';
import { Card } from '../../shared/components/ui/Card.js';

export function NoEncontradoPage() {
  return (
    <Card className="p-8 sm:p-16">
      <p className="font-semibold text-brand-800">Error 404</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Página no encontrada</h1>
      <Link
        to="/"
        className="mt-6 inline-block rounded-sm font-semibold text-brand-800 underline underline-offset-4"
      >
        Volver al inicio
      </Link>
    </Card>
  );
}
