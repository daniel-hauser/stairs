import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const inputPath = path.join(repoRoot, 'stairs-geometry-config.json');
const reactOutPath = path.join(repoRoot, 'stairs-r3f', 'src', 'constants', 'geometryConfig.ts');

const raw = fs.readFileSync(inputPath, 'utf8');
const config = JSON.parse(raw);
const asJson = JSON.stringify(config, null, 2);

const reactFile = `/* Auto-generated from stairs-geometry-config.json. Do not edit directly. */\nexport const GEOMETRY_CONFIG = ${asJson} as const;\n`;

fs.writeFileSync(reactOutPath, reactFile, 'utf8');

console.log('Generated geometry config output:');
console.log(`- ${reactOutPath}`);
