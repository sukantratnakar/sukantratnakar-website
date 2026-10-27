#!/usr/bin/env node
/**
 * sukantratnakar.com — link check
 *
 * Checks, against a running copy of the site:
 *   - every URL in speaking.json
 *   - every URL and local link/image in the built pages (app/index.html, app/speaking.html)
 *   - every file under app/downloads/
 *   - /speaking.json
 * and reports anything that is not a 200 or has the wrong content type.
 * #fragments are checked too: the target page must contain that id.
 *
 *   node scripts/linkcheck.js                         # checks http://localhost:8082
 *   node scripts/linkcheck.js http://localhost:8091   # checks a preview
 *
 * Links to https://sukantratnakar.com/... are checked against the base URL, so a
 * preview is judged on its own files. Exit code 1 when anything fails.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const BASE = (process.argv[2] || 'http://localhost:8082').replace(/\/$/, '');
const OWN = /^https?:\/\/(www\.)?sukantratnakar\.com/;
const PAGES = ['index.html', 'speaking.html'];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

// Sites that refuse automated requests. Reported as "blocked", not as failures.
const BOT_WALLS = { 999: 'LinkedIn refuses bots', 403: 'site refuses bots' };
const BOT_WALL_HOSTS = /(^|\.)(linkedin\.com|amazon\.com)$/;

/* ---------- what to expect from a URL ---------- */
const stylesheets = new Set(); // URLs loaded by <link rel="stylesheet">, whatever their extension
function expectedType(u) {
  if (stylesheets.has(u)) return 'text/css';
  const ext = path.extname(new URL(u).pathname).toLowerCase();
  return ({
    '.pdf': 'application/pdf', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.js': 'javascript',
  })[ext] || 'text/html';
}

/* ---------- collect ---------- */
const found = new Map(); // url -> Set of where it was found
const add = (u, where) => {
  if (!/^https?:\/\//.test(u)) return;
  if (!found.has(u)) found.set(u, new Set());
  found.get(u).add(where);
};

// speaking.json: every string value that is a URL
(function walk(v, key) {
  if (typeof v === 'string') { if (/^https?:\/\//.test(v)) add(v, `speaking.json ${key}`); }
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], key ? `${key}.${k}` : k);
})(JSON.parse(fs.readFileSync(path.join(ROOT, 'speaking.json'), 'utf8')), '');

for (const page of PAGES) {
  const html = fs.readFileSync(path.join(APP, page), 'utf8');
  const where = `app/${page}`;
  // preconnect hints are origins, not pages
  const preconnect = new Set([...html.matchAll(/<link[^>]+rel="preconnect"[^>]+href="([^"]+)"/g)].map(m => m[1]));
  for (const m of html.matchAll(/<link[^>]+href="([^"]+)"[^>]+rel="stylesheet"|<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) {
    stylesheets.add((m[1] || m[2]).replace(/&amp;/g, '&'));
  }
  // absolute URLs anywhere (attributes and inline scripts); skip ones finished at runtime ('...' + id)
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>)\\]+/g)) {
    const after = html.slice(m.index + m[0].length, m.index + m[0].length + 4);
    if (/^'\s*\+/.test(after) || preconnect.has(m[0])) continue;
    add(m[0].replace(/&amp;/g, '&'), where);
  }
  // local href/src/srcset (not #, mailto:, tel:, or absolute)
  for (const m of html.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    const v = m[1].split(/\s+/)[0];
    if (/^(#|mailto:|tel:|https?:|data:|javascript:)/.test(v)) continue;
    add(new URL(v, `${BASE}/${page}`).href, where);
  }
}

for (const f of fs.readdirSync(path.join(APP, 'downloads'))) {
  if (!f.startsWith('.')) add(`${BASE}/downloads/${encodeURIComponent(f)}`, 'app/downloads/');
}
add(`${BASE}/speaking.json`, 'published source of truth');

/* ---------- check ---------- */
const pageCache = new Map();
async function get(u) {
  if (!pageCache.has(u)) {
    pageCache.set(u, (async () => {
      const res = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': UA, Accept: '*/*' }, signal: AbortSignal.timeout(20000) });
      const type = (res.headers.get('content-type') || '').split(';')[0].trim();
      const body = type.includes('html') ? await res.text() : (await res.arrayBuffer(), '');
      return { status: res.status, type, finalUrl: res.url, redirected: res.redirected, body };
    })());
  }
  return pageCache.get(u);
}

async function check(url) {
  const target = url.replace(OWN, BASE);
  const [noFrag, frag] = target.split('#');
  const r = { url, checked: target === url ? undefined : target, where: [...found.get(url)] };
  try {
    const res = await get(noFrag);
    Object.assign(r, { status: res.status, type: res.type });
    if (res.redirected) r.redirectedTo = res.finalUrl;
    const host = new URL(noFrag).hostname;
    if (res.status !== 200) {
      r.result = BOT_WALLS[res.status] && BOT_WALL_HOSTS.test(host) ? 'blocked' : 'FAIL';
      r.why = r.result === 'blocked' ? BOT_WALLS[res.status] : `HTTP ${res.status}`;
      return r;
    }
    const want = expectedType(noFrag);
    if (!res.type.includes(want) && !(want === 'text/html' && /^image\//.test(res.type))) {
      r.result = 'FAIL'; r.why = `content type ${res.type || '(none)'}, expected ${want}`; return r;
    }
    if (frag && res.body && !new RegExp(`\\sid=["']${frag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(res.body)) {
      r.result = 'FAIL'; r.why = `#${frag} not found on the page`; return r;
    }
    r.result = 'ok';
  } catch (e) {
    r.result = 'FAIL'; r.why = e.cause ? `${e.message}: ${e.cause.code || e.cause.message}` : e.message;
  }
  return r;
}

(async () => {
  const urls = [...found.keys()].sort();
  const results = [];
  for (let i = 0; i < urls.length; i += 6) {
    results.push(...await Promise.all(urls.slice(i, i + 6).map(check)));
  }
  const mark = { ok: 'ok     ', blocked: 'blocked', FAIL: 'FAIL   ' };
  console.log(`link check against ${BASE} — ${results.length} URLs\n`);
  for (const r of results.sort((a, b) => (a.result === 'ok') - (b.result === 'ok') || a.url.localeCompare(b.url))) {
    const extra = [r.status && `${r.status}`, r.type, r.why, r.checked && `checked as ${r.checked}`, r.redirectedTo && `→ ${r.redirectedTo}`]
      .filter(Boolean).join(' · ');
    console.log(`${mark[r.result]}  ${r.url}\n           ${extra}\n           in: ${r.where.join(', ')}`);
  }
  const n = k => results.filter(r => r.result === k).length;
  console.log(`\n${n('ok')} ok, ${n('blocked')} blocked by the site, ${n('FAIL')} failed`);
  process.exitCode = n('FAIL') ? 1 : 0;
})();
