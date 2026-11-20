// Verifica que `npm ci` pueda usar package-lock.json (lo que necesitan Docker y CI).
// Lo ejecuta lint-staged cuando cambian package.json o package-lock.json.
// Ignora los argumentos que lint-staged agrega (rutas de archivos).
import { spawnSync } from 'node:child_process';
import process from 'node:process';

// Comando fijo (sin datos externos); se ejecuta en shell para resolver npm/npm.cmd en Windows.
const result = spawnSync('npm ci --dry-run --ignore-scripts --no-audit --no-fund', {
  encoding: 'utf8',
  shell: true,
});

if (result.error || result.status !== 0) {
  const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`
    .split('\n')
    .filter((line) => line.includes('npm error') && line.trim() !== 'npm error')
    .slice(0, 6)
    .join('\n');
  process.stderr.write(
    [
      'package-lock.json no está sincronizado para `npm ci`.',
      detail || result.error?.message || '',
      'Regenéralo con `npm run lock` (Linux, vía Docker) y vuelve a intentar el commit.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}
