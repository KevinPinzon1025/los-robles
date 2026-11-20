// Regenera package-lock.json dentro de Linux (node:22-alpine).
// npm en Windows omite dependencias opcionales de Linux (p. ej. @emnapi/* de rolldown),
// lo que rompe `npm ci` en Docker y en CI. Uso: npm run lock
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const args = [
  'run',
  '--rm',
  '-v',
  `${process.cwd()}:/repo`,
  '-w',
  '/repo',
  '-e',
  'HUSKY=0',
  'node:22-alpine',
  'npm',
  'install',
  '--package-lock-only',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
];

const result = spawnSync('docker', args, { stdio: 'inherit' });
if (result.error) {
  process.stderr.write(`No se pudo ejecutar Docker: ${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
