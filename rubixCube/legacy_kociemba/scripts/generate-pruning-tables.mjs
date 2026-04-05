import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), '..');
const outputDirectory = path.join(projectRoot, 'public', 'solver');
const outputPath = path.join(outputDirectory, 'pruning-tables.json');
const solverModulePath = pathToFileURL(
  path.join(projectRoot, '.solver-debug', 'algorithms', 'legacyKociemba.js'),
).href;

const startedAt = performance.now();
const { LegacyKociembaSolver } = await import(solverModulePath);
const solver = new LegacyKociembaSolver();
const pruningTables = solver.exportPruningTables();

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(pruningTables));

const elapsedMs = Math.round(performance.now() - startedAt);
const sizeKb = Math.round(fs.statSync(outputPath).size / 1024);

console.log(`Pruning tables written to ${outputPath} (${sizeKb} KB, ${elapsedMs} ms).`);
