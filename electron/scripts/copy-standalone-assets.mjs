// Next standalone output omits static assets; copy them next to server.js.
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const renderer = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'renderer');
const target = path.join(renderer, '.next', 'standalone', 'renderer');
if (!existsSync(target)) throw new Error(`Standalone output not found: ${target}`);
cpSync(path.join(renderer, '.next', 'static'), path.join(target, '.next', 'static'), { recursive: true });
if (existsSync(path.join(renderer, 'public'))) cpSync(path.join(renderer, 'public'), path.join(target, 'public'), { recursive: true });
console.log('Copied static assets into', path.relative(process.cwd(), target));
