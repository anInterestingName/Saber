import { rmSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const workspace = resolve(process.cwd());
const outputDirectory = resolve(workspace, 'dist');

if (!outputDirectory.startsWith(`${workspace}${sep}`)) {
  throw new Error(`Refusing to clean output outside workspace: ${outputDirectory}`);
}

rmSync(outputDirectory, {
  recursive: true,
  force: true,
  maxRetries: 3,
  retryDelay: 100,
});
