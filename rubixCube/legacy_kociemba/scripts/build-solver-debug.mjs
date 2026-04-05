import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), '..');
const outputDirectory = path.join(projectRoot, '.solver-debug');
const tscEntrypoint = require.resolve('typescript/lib/tsc.js');

fs.rmSync(outputDirectory, { recursive: true, force: true });

const compilerResult = spawnSync(
  process.execPath,
  [
    tscEntrypoint,
    path.join(projectRoot, 'src', 'logic', 'cubeLogic.ts'),
    path.join(projectRoot, 'src', 'algorithms', 'legacyKociemba.ts'),
    '--outDir',
    outputDirectory,
    '--module',
    'ESNext',
    '--target',
    'ES2022',
    '--moduleResolution',
    'bundler',
    '--esModuleInterop',
    '--skipLibCheck',
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
  },
);

if (compilerResult.status !== 0) {
  process.exit(compilerResult.status ?? 1);
}

const solverOutputPath = path.join(outputDirectory, 'algorithms', 'legacyKociemba.js');
const solverOutput = fs
  .readFileSync(solverOutputPath, 'utf8')
  .replace("'../logic/cubeLogic'", "'../logic/cubeLogic.js'");

fs.writeFileSync(solverOutputPath, solverOutput);
console.log(`Solver debug bundle written to ${outputDirectory}`);
