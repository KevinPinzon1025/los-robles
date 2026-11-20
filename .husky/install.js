import process from 'node:process';
import { existsSync } from 'node:fs';

if (process.env.HUSKY !== '0' && process.env.NODE_ENV !== 'production' && existsSync('.git')) {
  const { default: husky } = await import('husky');
  const result = husky();
  if (result) {
    process.stderr.write(`Husky: ${result}\n`);
    process.exitCode = 1;
  }
}
