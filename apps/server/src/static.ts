import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

/** Serves the built web client from `root`; never a file outside it. */
export const staticFiles = (root: string) => async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return void res.writeHead(405, { Allow: 'GET, HEAD' }).end();
  let file: string;
  try {
    const { pathname } = new URL(req.url ?? '/', 'http://host');
    file = resolve(root, `.${decodeURIComponent(pathname === '/' ? '/index.html' : pathname)}`);
  } catch {
    return void res.writeHead(400).end();
  }
  // Encoded slashes and dots (%2F..%2F) survive URL parsing, so check the resolved path itself.
  if (!file.startsWith(resolve(root) + sep)) return void res.writeHead(404).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      // Vite puts a content hash in every file name under assets/, so those never change.
      'Cache-Control': file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found (run npm run build for the web client)');
  }
};
