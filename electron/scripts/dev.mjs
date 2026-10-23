// Development runner with hot reload everywhere:
//  - renderer: one long-lived `next dev` (React Fast Refresh / HMR)
//  - main process: `tsc --watch`; Electron restarts on change, `next dev` keeps running
//  - preload: rebuilt by the same watcher; the window reloads instead of restarting
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { watch } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const electronBinary = require('electron');
const log = (...parts) => console.log('\x1b[35m[coco]\x1b[0m', ...parts);

const freePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

const port = await freePort();
const token = randomBytes(32).toString('hex');
const origin = `http://127.0.0.1:${port}`;
const env = { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', COCO_SESSION_TOKEN: token, COCO_DEV_ORIGIN: origin, NEXT_TELEMETRY_DISABLED: '1' };
const children = new Set();
const run = (command, args, options = {}) => {
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit', ...options });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
};

// 1. Renderer with HMR.
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
// COCO_WEBPACK=1 falls back from Turbopack (e.g. platforms without native SWC bindings).
const bundler = process.env.COCO_WEBPACK ? ['--webpack'] : [];
const next = run(process.execPath, [nextBin, 'dev', 'renderer', '--port', String(port), '--hostname', '127.0.0.1', ...bundler]);
next.once('exit', code => { log(`next dev exited (${code})`); shutdown(code ?? 1); });

// 2. Main + preload compiler in watch mode.
const tscBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
run(process.execPath, [tscBin, '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'], { stdio: ['ignore', 'pipe', 'inherit'] })
  .stdout.on('data', chunk => {
    const textChunk = chunk.toString();
    if (/error TS/.test(textChunk)) process.stdout.write(textChunk);
    if (/Found 0 errors/.test(textChunk)) firstBuild();
  });

// 3. Electron, restarted on main changes.
let electron;
let restarting = false;
function startElectron() {
  electron = run(electronBinary, ['.'], { env: { ...env, COCO_DEV_RELOAD: '1' }, stdio: ['pipe', 'inherit', 'inherit'] });
  electron.once('exit', code => {
    if (restarting) { restarting = false; startElectron(); return; }
    log('Electron closed, stopping dev server');
    shutdown(code ?? 0);
  });
}

let started = false;
function firstBuild() {
  if (started) return;
  started = true;
  log(`renderer ${origin} (HMR)  ·  watching src/main and src/preload`);
  startElectron();
  const debounce = (fn, ms = 250) => { let timer; return () => { clearTimeout(timer); timer = setTimeout(fn, ms); }; };
  watch(path.join(root, 'dist', 'main'), { recursive: true }, debounce(() => {
    if (!electron || restarting) return;
    log('main process changed → restarting Electron');
    restarting = true;
    electron.kill();
  }));
  // Preload changes only need the page reloaded; main listens for this signal on stdin.
  watch(path.join(root, 'dist', 'preload'), { recursive: true }, debounce(() => {
    log('preload changed → reloading window');
    electron?.stdin?.write('reload\n');
  }));
}

function shutdown(code) {
  for (const child of children) child.kill();
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
