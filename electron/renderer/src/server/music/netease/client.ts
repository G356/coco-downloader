import { randomBytes } from 'node:crypto';
import { eapi, eapiDecrypt, weapi } from './crypto';

const BASE = 'https://music.163.com';
const EAPI_BASE = 'https://interface.music.163.com';
const WEB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/3.1.19.204510';
const TIMEOUT_MS = 12000;

export class NeteaseError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
  }
}

// A stable anonymous visitor per process, like a browser profile would be.
const visitorCookie = [
  '__remember_me=true',
  `NMTID=${randomBytes(16).toString('hex')}`,
  `_ntes_nuid=${randomBytes(16).toString('hex')}`,
  'os=pc',
  'appver=3.1.19.204510',
].join('; ');

// The eapi header doubles as cookie, as the desktop client sends it.
const eapiHeader = {
  os: 'pc',
  appver: '3.1.19.204510',
  osver: 'Microsoft-Windows-11',
  requestId: '0',
  deviceId: randomBytes(16).toString('hex'),
  MUSIC_U: '',
};
const eapiCookie = Object.entries(eapiHeader).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('; ');

type Raw = Record<string, unknown>;

async function send(url: string, form: Record<string, string>, headers: Record<string, string>) {
  try {
    return await fetch(url, {
      method: 'POST',
      body: new URLSearchParams(form),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new NeteaseError(timedOut ? '网易云音乐请求超时，请稍后重试' : '无法连接网易云音乐，请检查网络', 504);
  }
}

function check<T>(body: (Raw & { code?: number; message?: string; msg?: string }) | null): T {
  if (!body) throw new NeteaseError('网易云音乐返回了无法解析的数据');
  if (Number(body.code) !== 200) throw new NeteaseError(String(body.message || body.msg || `网易云音乐接口错误（${body.code}）`));
  return body as T;
}

/**
 * POST to music.163.com. `crypto: 'weapi'` encrypts like the web client;
 * `'api'` sends a plain form. Paths are given without the /weapi or /api prefix.
 */
export async function neteaseRequest<T = Raw>(path: string, data: Raw = {}, options: { crypto?: 'weapi' | 'api' } = {}): Promise<T> {
  const mode = options.crypto ?? 'weapi';
  const form = mode === 'weapi' ? weapi({ ...data, csrf_token: '' }) : Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]));
  const response = await send(`${BASE}/${mode}${path}`, form, { 'User-Agent': WEB_UA, Referer: `${BASE}/`, Origin: BASE, Cookie: visitorCookie });
  if (!response.ok) throw new NeteaseError(`网易云音乐返回异常状态（${response.status}）`);
  return check<T>(await response.json().catch(() => null));
}

/** Desktop-client endpoint (e.g. /api/cloudsearch/pc). `uri` keeps its /api prefix. */
export async function neteaseEapi<T = Raw>(uri: string, data: Raw = {}): Promise<T> {
  const response = await send(`${EAPI_BASE}/eapi${uri.slice(4)}`, eapi(uri, { header: eapiHeader, e_r: true, ...data }), { 'User-Agent': DESKTOP_UA, Cookie: eapiCookie });
  if (!response.ok) throw new NeteaseError(`网易云音乐返回异常状态（${response.status}）`);
  const buffer = Buffer.from(await response.arrayBuffer());
  let body: Raw | null = null;
  try {
    body = JSON.parse(buffer.toString('utf8'));
  } catch {
    try { body = JSON.parse(eapiDecrypt(buffer)); } catch { body = null; }
  }
  return check<T>(body as never);
}
