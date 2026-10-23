import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { app, utilityProcess, type UtilityProcess } from 'electron';

export type NextServer = {
  origin: string;
  /** Shared secret; the renderer proxy rejects requests that lack it. */
  token: string;
  stop: () => void;
};

const HOST = '127.0.0.1';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      server.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('No port'))));
    });
  });
}

async function waitUntilReady(origin: string, token: string, timeoutMs: number, exited: () => boolean) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (exited()) throw new Error('Renderer server exited during startup');
    try {
      const response = await fetch(`${origin}/api/health`, { headers: { 'x-coco-token': token } });
      if (response.ok) return;
    } catch {
      // Server is not listening yet.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Renderer server did not start within ${timeoutMs / 1000}s`);
}

/**
 * Start the Next.js renderer bound to loopback on a random port.
 * Packaged builds run the standalone server in an Electron utility process.
 * In development `scripts/dev.mjs` owns a long-lived `next dev` (HMR) and passes
 * its origin/token via env, so restarting Electron for main-process edits keeps it.
 */
export async function startNextServer(): Promise<NextServer> {
  const external = process.env.COCO_DEV_ORIGIN;
  if (external && !app.isPackaged) {
    const token = process.env.COCO_SESSION_TOKEN ?? '';
    await waitUntilReady(external, token, 120000, () => false);
    return { origin: external, token, stop: () => undefined };
  }

  const port = await freePort();
  const token = randomBytes(32).toString('hex');
  const origin = `http://${HOST}:${port}`;
  const env = { ...process.env, PORT: String(port), HOSTNAME: HOST, COCO_SESSION_TOKEN: token, NEXT_TELEMETRY_DISABLED: '1' };
  const appRoot = app.getAppPath();
  const standaloneServer = path.join(appRoot, 'renderer', '.next', 'standalone', 'renderer', 'server.js');
  const useStandalone = app.isPackaged || process.argv.includes('--standalone');

  let child: UtilityProcess | ChildProcess;
  let exited = false;
  if (useStandalone) {
    if (!existsSync(standaloneServer)) throw new Error('Missing renderer build. Run `npm run build:renderer` first.');
    const proc = utilityProcess.fork(standaloneServer, [], { env: { ...env, NODE_ENV: 'production' }, stdio: 'inherit', serviceName: 'CoCo Renderer' });
    proc.once('exit', () => { exited = true; });
    child = proc;
  } else {
    const nextBin = path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    const node = process.env.npm_node_execpath || 'node';
    const proc = spawn(node, [nextBin, 'dev', 'renderer', '--port', String(port), '--hostname', HOST], { cwd: appRoot, env, stdio: 'inherit' });
    proc.once('exit', () => { exited = true; });
    child = proc;
  }

  const stop = () => { if (!exited) child.kill(); };
  try {
    await waitUntilReady(origin, token, useStandalone ? 20000 : 90000, () => exited);
  } catch (error) {
    stop();
    throw error;
  }
  return { origin, token, stop };
}
