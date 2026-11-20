// Verifica que `npm ci` pueda usar el package-lock.json que se va a commitear.
// Lo ejecuta lint-staged cuando cambian package.json o package-lock.json.
//
// Revisa el contenido del índice de git (lo preparado para el commit), no el del
// directorio de trabajo: así detecta un package.json preparado sin su lockfile, o un
// lockfile corregido que quedó sin `git add`. Copia los manifiestos preparados a una
// carpeta temporal y ejecuta allí `npm ci --dry-run`.
// Ignora los argumentos que lint-staged agrega (rutas de archivos).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function fail(lines) {
  process.stderr.write([...lines, ''].join('\n'));
  process.exit(1);
}

// Manifiestos que npm necesita para validar el lockfile: raíz + workspaces.
const manifests = git(
  'ls-files',
  '--cached',
  '--',
  'package.json',
  'package-lock.json',
  'apps/*/package.json',
  'packages/*/package.json',
)
  .split('\n')
  .filter(Boolean);

if (!manifests.includes('package-lock.json')) {
  fail([
    'package-lock.json no está en el índice de git.',
    'Genéralo con `npm run lock` y agrégalo con `git add`.',
  ]);
}

const workdir = mkdtempSync(join(tmpdir(), 'losrobles-lock-'));
try {
  for (const file of manifests) {
    const target = join(workdir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, git('show', `:${file}`));
  }

  // Comando fijo (sin datos externos); se ejecuta en shell para resolver npm/npm.cmd en Windows.
  const result = spawnSync('npm ci --dry-run --ignore-scripts --no-audit --no-fund', {
    cwd: workdir,
    encoding: 'utf8',
    shell: true,
  });

  if (result.error || result.status !== 0) {
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`
      .split('\n')
      .filter((line) => line.includes('npm error') && line.trim() !== 'npm error')
      .slice(0, 6)
      .join('\n');
    fail([
      'El package-lock.json preparado para el commit no sirve para `npm ci`.',
      detail || result.error?.message || '',
      'Regenéralo con `npm run lock` (Linux, vía Docker), agrégalo con `git add package-lock.json` y vuelve a intentar.',
    ]);
  }
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
