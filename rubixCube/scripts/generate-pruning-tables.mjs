import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'pruning-tables.json');

function hasValidTables(tables) {
  return (
    tables &&
    Array.isArray(tables.flip) &&
    tables.flip.length === 2048 &&
    Array.isArray(tables.twist) &&
    tables.twist.length === 2187 &&
    Array.isArray(tables.slice) &&
    tables.slice.length === 495
  );
}

function loadExistingTables() {
  if (!fs.existsSync(OUTPUT_FILE)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return hasValidTables(parsed) ? parsed : null;
  } catch (error) {
    console.error('Existing pruning table file could not be read:', error);
    return null;
  }
}

function generateTables() {
  console.log('Generating Thistlethwaite Pruning Tables...');

  const existingTables = loadExistingTables();
  if (existingTables) {
    console.log(`Using existing pruning tables at: ${OUTPUT_FILE}`);
    return;
  }

  console.error(
    'No valid pruning tables were found. This script no longer writes placeholder tables because that breaks the deployed solver.'
  );
  process.exit(1);
}

generateTables();
