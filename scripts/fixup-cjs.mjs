// Mark the CJS build output as CommonJS so require() works from a
// "type": "module" package root.
import { writeFileSync } from 'node:fs';
writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{"type":"commonjs"}\n');
console.log('dist/cjs/package.json written');
