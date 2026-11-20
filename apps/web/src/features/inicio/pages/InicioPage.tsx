import { Badge } from '../../../shared/components/ui/Badge.js';
import { Button } from '../../../shared/components/ui/Button.js';
import { Card } from '../../../shared/components/ui/Card.js';
import { Spinner } from '../../../shared/components/ui/Spinner.js';
import { useHealth } from '../../sistema/useHealth.js';

export function InicioPage() {
  const health = useHealth();
  const online = !health.isError && health.data?.status === 'ok';
  const status = health.isPending
    ? 'Comprobando la API…'
    : online
      ? 'API en línea'
      : 'API no disponible';

  return (
    <Card className="relative overflow-hidden border-brand-200 bg-white p-8 sm:p-16">
      <div className="relative z-10 max-w-2xl">
        <h1 className="text-balance text-5xl leading-none font-extrabold tracking-tight sm:text-7xl">
          Reserva tu cancha
        </h1>
        <div aria-live="polite" role="status" className="mt-5">
          <Badge tone={health.isPending ? 'neutral' : online ? 'success' : 'danger'}>
            {health.isPending ? (
              <Spinner className="size-3" />
            ) : (
              <span aria-hidden="true" className="size-2 rounded-full bg-current" />
            )}
            {status}
          </Badge>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <span
            tabIndex={0}
            title="Próximamente"
            aria-describedby="proximamente"
            className="group relative rounded-md"
          >
            <Button disabled variant="primary">
              Iniciar sesión
            </Button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-full left-0 mt-2 hidden rounded bg-brand-950 px-2 py-1 text-xs text-white group-hover:block group-focus-visible:block"
            >
              Próximamente
            </span>
          </span>
          <span
            tabIndex={0}
            title="Próximamente"
            aria-describedby="proximamente"
            className="group relative rounded-md"
          >
            <Button disabled variant="secondary">
              Crear cuenta
            </Button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-full left-0 mt-2 hidden rounded bg-brand-950 px-2 py-1 text-xs text-white group-hover:block group-focus-visible:block"
            >
              Próximamente
            </span>
          </span>
          <span id="proximamente" className="sr-only">
            Próximamente
          </span>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -bottom-44 hidden size-96 rotate-[-24deg] rounded-[40%] border-[18px] border-brand-100 bg-brand-50 sm:block"
      >
        <div className="absolute inset-9 rounded-[35%] border-2 border-brand-200" />
      </div>
    </Card>
  );
}
