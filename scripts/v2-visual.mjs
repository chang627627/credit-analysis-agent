#!/usr/bin/env node
// scripts/v2-visual.mjs: Countersign V2 visual + accessibility check (Playwright + axe).
// The rendering half of the guardrails: `npm run v2-check` greps the source, this drives the live
// app. Every V2 state below is reached from a fresh page load at each viewport (the agent is mocked
// and deterministic, so runs reproduce), then:
//   1. a full-page screenshot into .v2-visual/ (gitignored), plus report.json
//   2. axe-core: fail on serious or critical violations (moderate and minor are listed in the report)
//   3. layout: no horizontal page scroll · no scroll container that scrolls sideways · no visible
//      element cut by the viewport edge · the memo pane (.app-viz) and the Decision card
//      ([data-section="signature"]) keep a usable VISIBLE width · on a case file below 900px the
//      agent panel is the strip docked under the memo, wholly on screen with its composer
//      (THREE-PANE R4.13), and a column beside it from 900px · the driving clicks land (a control
//      that cannot be clicked at that width is a failure; the click is then dispatched so the state
//      is still reached and checked) · no page errors or console errors
// Exit 0 = every cell passes, 1 = failures, 2 = setup error.
//
// Usage: npm run v2-visual [-- options]
//   --url <base>         reuse a running server (e.g. http://localhost:5173) instead of starting one
//   --prod               vite build, then check the production bundle via vite preview
//   --only <a,b>         states to run (ids from the summary table)
//   --viewport <a,b>     viewports to run (phone, tablet, desktop)
//   --workers <n>        parallel pages (default 3)
//   --headed             show the browser
// Without --url the script starts its own Vite server from THIS checkout on a free port, so a
// server another worktree left on :5173 can never be checked by mistake.

import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.v2-visual');
const VITE = join(ROOT, 'node_modules', '.bin', 'vite');

// A 390px phone keeps the 64px rail, which leaves 326px for the memo pane; the Decision card sits
// inside the memo's 16px gutters (294px). Below these the memo and the decision are not usable.
const MIN_PANE_PX = 300;
const MIN_CARD_PX = 280;
// Below this viewport width a case file stacks: the memo over the agent strip (R4.13, state/panes.ts).
const STACK_BELOW_PX = 900;
const RUN_TIMEOUT_MS = 60_000;

const VIEWPORTS = [
  { id: 'phone', width: 390, height: 844 },
  { id: 'tablet', width: 768, height: 1024 },
  { id: 'desktop', width: 1440, height: 900 },
];

// Horizontal scrollers that are scrollers on purpose: [selector, why]. Anything else that scrolls
// sideways is a layout fault (content wider than its column).
const HSCROLL_OK = [
  ['.kp-matrix-wrap', 'kit page specimen matrix: overflow-x: auto by design (kitpage.css)'],
];

// ---- states: each one is reached from a fresh load of `path` --------------------------------------
const STATES = [
  { id: 'desk', label: 'Desk', drive: async () => {} },
  {
    // R4.12: the trash opens the kit Dialog (role alertdialog) over the Desk; checked open
    id: 'desk-remove',
    label: 'Desk · remove confirm (Dialog)',
    drive: async (d) => {
      await d.act(d.page.getByRole('button', { name: 'Remove Project Atlas', exact: true }), 'Remove Project Atlas (trash)');
      await d.page.getByRole('alertdialog').waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    id: 'atlas-plan',
    label: 'Atlas · plan (before drafting)',
    memo: true,
    drive: async (d) => {
      await d.selectFile('Project Atlas');
      await d.page.locator('.chat-plan').waitFor({ state: 'attached' });
      await d.page.locator('[data-section="header"]').waitFor({ state: 'attached' });
    },
  },
  {
    id: 'atlas-gate',
    label: 'Atlas · at the gate (ESCALATE)',
    memo: true,
    card: true,
    drive: async (d) => d.toGate('Project Atlas', 'ESCALATE'),
  },
  {
    id: 'cobalt-gate',
    label: 'Cobalt · at the gate (DECLINE)',
    memo: true,
    card: true,
    drive: async (d) => d.toGate('Project Cobalt', 'DECLINE'),
  },
  {
    id: 'meridian-sealed',
    label: 'Meridian · sealed record',
    memo: true,
    card: true,
    drive: async (d) => {
      await d.toGate('Project Meridian', 'APPROVE');
      await d.act(d.page.locator('[data-sign-primary] button'), 'Countersign (Decision card primary)');
      await d.page.locator('[data-decision][data-state="signed"]').waitFor({ state: 'attached', timeout: 10_000 });
    },
  },
  { id: 'book', label: 'Book (#/book)', drive: async (d) => d.hash('#/book', '.app-main') },
  { id: 'ledger', label: 'Ledger (#/ledger)', drive: async (d) => d.hash('#/ledger', '.app-main') },
  { id: 'settings', label: 'Settings (#/settings)', drive: async (d) => d.hash('#/settings', '.settings') },
  { id: 'kit', label: 'Kit page (/?kit)', path: '/?kit', shell: false, drive: async () => {} },
];

// ---- args -----------------------------------------------------------------------------------------
function parseArgs(argv) {
  const o = { url: null, prod: false, only: null, viewport: null, workers: 3, headed: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`${a} needs a value`);
      return v;
    };
    if (a === '--url') o.url = next().replace(/\/+$/, '');
    else if (a === '--prod') o.prod = true;
    else if (a === '--only') o.only = next().split(',');
    else if (a === '--viewport') o.viewport = next().split(',');
    else if (a === '--workers') o.workers = Math.max(1, Number(next()) || 1);
    else if (a === '--headed') o.headed = true;
    else if (a === '-h' || a === '--help') {
      console.log('npm run v2-visual [-- --url <base>] [--prod] [--only <ids>] [--viewport phone,tablet,desktop] [--workers n] [--headed]');
      process.exit(0);
    } else fail(`unknown option ${a}`);
  }
  return o;
}

function fail(msg) {
  console.error(`v2-visual: ${msg}`);
  process.exit(2);
}

// ---- server ---------------------------------------------------------------------------------------
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    p.stdout.on('data', (b) => (log += b));
    p.stderr.on('data', (b) => (log += b));
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}\n${log}`))));
  });
}

async function startServer(opts) {
  if (opts.url) {
    if (!(await reachable(opts.url))) fail(`nothing answers at ${opts.url}`);
    return { base: opts.url, stop: () => {}, log: () => '' };
  }
  if (opts.prod) {
    console.log('v2-visual: building the production bundle (vite build)…');
    await run(VITE, ['build', '--logLevel', 'warn']);
  }
  const port = await freePort();
  const args = opts.prod ? ['preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'] : ['--port', String(port), '--strictPort', '--host', '127.0.0.1'];
  const child = spawn(VITE, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (b) => (log += b));
  child.stderr.on('data', (b) => (log += b));
  const stop = () => {
    if (child.exitCode === null) child.kill('SIGTERM');
  };
  process.on('exit', stop);
  const base = `http://127.0.0.1:${port}`;
  const until = Date.now() + 30_000;
  while (Date.now() < until) {
    if (child.exitCode !== null) fail(`vite exited early:\n${log}`);
    if (await reachable(base)) return { base, stop, log: () => log };
    await new Promise((r) => setTimeout(r, 200));
  }
  stop();
  fail(`vite did not answer at ${base} within 30 s:\n${log}`);
}

// ---- driving --------------------------------------------------------------------------------------
function driver(page, notes) {
  const d = {
    page,
    /** a real click; if the control cannot be clicked at this width, record it and dispatch the click */
    async act(locator, label) {
      await locator.waitFor({ state: 'attached', timeout: 10_000 });
      try {
        await locator.click({ timeout: 3000 });
      } catch {
        notes.push(`not clickable: ${label}`);
        // the failed attempt may have scrolled an overflow:hidden pane sideways to reach the control;
        // undo that so the layout is measured as the reviewer would see it
        await page.evaluate(() => {
          for (const el of document.querySelectorAll('*')) {
            if (el.scrollLeft && /^(hidden|clip)$/.test(getComputedStyle(el).overflowX)) el.scrollLeft = 0;
          }
        });
        await locator.dispatchEvent('click');
      }
    },
    async hash(h, ready) {
      await page.evaluate((x) => {
        window.location.hash = x;
      }, h);
      await page.locator(ready).first().waitFor({ state: 'attached', timeout: 10_000 });
    },
    /** demo pace 4× (Settings; in memory for the session), then back to the Desk */
    async fast() {
      await d.hash('#/settings', '.settings');
      await d.act(page.getByRole('group', { name: 'Demo pace' }).getByRole('button', { name: '4×' }), 'Demo pace 4×');
      await d.hash('#/', '.app-main');
    },
    async selectFile(name) {
      await d.act(page.getByRole('button', { name: `Select ${name}`, exact: true }), `Select ${name}`);
    },
    async toGate(name, expected) {
      await d.fast();
      await d.selectFile(name);
      await d.act(page.locator('.chat-plan').getByRole('button', { name: /Start drafting/ }), 'Start drafting');
      await page.waitForFunction(() => document.title.includes('Awaiting your countersignature'), null, { timeout: RUN_TIMEOUT_MS });
      const card = page.locator('[data-section="signature"]');
      await card.waitFor({ state: 'attached', timeout: 10_000 });
      const text = await card.innerText();
      if (!new RegExp(`\\b${expected}\\b`).test(text)) notes.push(`expected the agent to recommend ${expected}; the Decision card does not say so`);
    },
  };
  return d;
}

/** wait for finite animations and the memo's follow-scroll to come to rest */
async function settle(page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const until = performance.now() + 4000;
    let quiet = 0;
    let last = '';
    while (performance.now() < until && quiet < 6) {
      await frame();
      const running = document
        .getAnimations()
        .filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).length;
      const scroll = [...document.querySelectorAll('*')]
        .filter((e) => e.scrollTop > 0 || e.scrollLeft > 0)
        .map((e) => `${e.scrollTop},${e.scrollLeft}`)
        .join('|');
      quiet = running === 0 && scroll === last ? quiet + 1 : 0;
      last = scroll;
    }
    if (document.fonts) await document.fonts.ready;
  });
}

// ---- layout probe (runs in the page) ---------------------------------------------------------------
function probe({ hscrollOk }) {
  const iw = window.innerWidth;
  const style = new Map();
  const cs = (el) => {
    let s = style.get(el);
    if (!s) {
      s = getComputedStyle(el);
      style.set(el, s);
    }
    return s;
  };
  const scroller = (el) => /^(auto|scroll)$/.test(cs(el).overflowX);
  const clips = (el) => cs(el).overflowX !== 'visible';
  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    if (cls.length) s += `.${cls.join('.')}`;
    for (const a of ['data-section', 'data-pattern', 'aria-label']) {
      const v = el.getAttribute(a);
      if (v) s += `[${a}="${v.slice(0, 32)}"]`;
    }
    const t = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    if (t) s += ` "${t.slice(0, 28)}${t.length > 28 ? '…' : ''}"`;
    return s;
  };
  // the part of el actually painted, horizontally: its rect cut by every clipping ancestor and the viewport
  const visibleX = (el) => {
    const r = el.getBoundingClientRect();
    let l = Math.max(r.left, 0);
    let rt = Math.min(r.right, iw);
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (!clips(a)) continue;
      const ar = a.getBoundingClientRect();
      l = Math.max(l, ar.left);
      rt = Math.min(rt, ar.right);
    }
    return { width: Math.round(r.width), visible: Math.max(0, Math.round(rt - l)) };
  };
  const hidden = (el) => {
    const s = cs(el);
    if (s.visibility === 'hidden' || s.display === 'contents') return true;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return true;
    if (s.clip && s.clip !== 'auto') return true;
    if (s.clipPath && s.clipPath !== 'none') return true;
    return false;
  };

  const se = document.scrollingElement || document.documentElement;
  const pageOverflowX = Math.max(se.scrollWidth, document.body.scrollWidth) - iw;

  const all = [...document.body.querySelectorAll('*')].filter((el) => !(el instanceof SVGElement && el.ownerSVGElement));

  // scroll containers that scroll sideways
  const hscroll = [];
  // (an element its ancestors clip to nothing is skipped: e.g. everything inside a 0px memo pane,
  // which the pane-width check already reports once)
  for (const el of all) {
    if (!scroller(el) || el.clientWidth <= 0) continue;
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    if (visibleX(el).visible === 0) continue;
    if (hscrollOk.some((sel) => el.matches(sel))) continue;
    hscroll.push(`${describe(el)} scrolls sideways (${el.scrollWidth}px of content in ${el.clientWidth}px)`);
  }

  // visible elements cut by the viewport edge (inside a scroller, overflow is the scroller's problem:
  // it is caught above when the scroller itself scrolls sideways)
  const cut = new Set();
  for (const el of all) {
    if (hidden(el)) continue;
    const r = el.getBoundingClientRect();
    const partial = (r.left < -1 && r.right > 0) || (r.right > iw + 1 && r.left < iw);
    if (!partial || visibleX(el).visible === 0) continue;
    let inScroller = false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (scroller(a)) {
        inScroller = true;
        break;
      }
    }
    if (!inScroller) cut.add(el);
  }
  // report only the outermost offenders
  const cutTop = [...cut].filter((el) => {
    for (let a = el.parentElement; a; a = a.parentElement) if (cut.has(a)) return false;
    return true;
  });
  const cutList = cutTop.map((el) => {
    const r = el.getBoundingClientRect();
    return `${describe(el)} spans ${Math.round(r.left)}..${Math.round(r.right)}px of a ${iw}px viewport`;
  });

  const viz = document.querySelector('.app-viz');
  const card = document.querySelector('[data-section="signature"]');
  // the agent panel: its layout, and whether it (and its composer) sits wholly inside the viewport
  const pane = document.querySelector('[data-chat-pane]');
  let panel = null;
  if (pane) {
    const r = pane.getBoundingClientRect();
    const field = pane.querySelector('textarea');
    const fr = field ? field.getBoundingClientRect() : null;
    panel = {
      layout: pane.getAttribute('data-layout'),
      onScreen: r.top >= 0 && r.bottom <= window.innerHeight + 1 && r.left >= 0 && r.right <= iw + 1 && r.height > 0,
      composer: !!fr && fr.height > 0 && fr.bottom <= window.innerHeight + 1,
      box: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
    };
  }
  return {
    iw,
    pageOverflowX,
    hscroll,
    cut: cutList,
    viz: viz ? visibleX(viz) : null,
    card: card ? visibleX(card) : null,
    panel,
  };
}

// ---- one cell: state × viewport -------------------------------------------------------------------
async function check(browser, base, state, vp) {
  const failures = [];
  const notes = [];
  const errors = [];
  const shot = join(OUT, `${state.id}@${vp.id}.png`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`page error: ${e.message.split('\n')[0]}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console error: ${m.text().split('\n')[0].slice(0, 160)}`);
  });
  let axeMinor = [];
  let axeAll = [];
  try {
    await page.goto(`${base}${state.path ?? '/'}`, { waitUntil: 'load' });
    await page.locator(state.shell === false ? '#root > *' : '.app-shell').first().waitFor({ state: 'attached', timeout: 20_000 });
    try {
      await state.drive(driver(page, notes));
    } catch (e) {
      failures.push(`could not reach the state: ${e.message.split('\n')[0]}`);
    }
    await settle(page);
    await page.screenshot({ path: shot, fullPage: true });

    const axe = await new AxeBuilder({ page }).analyze();
    const severe = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    for (const v of severe) {
      const at = v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' · ');
      failures.push(`axe ${v.id} (${v.impact}) ×${v.nodes.length}: ${at}${v.nodes.length > 3 ? ' · …' : ''}`);
    }
    axeMinor = axe.violations.filter((v) => !severe.includes(v)).map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}`);
    axeAll = axe.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 240) })) }));

    const L = await page.evaluate(probe, { hscrollOk: HSCROLL_OK.map((x) => x[0]) });
    if (L.pageOverflowX > 1) failures.push(`horizontal page scroll: content is ${L.pageOverflowX}px wider than the ${L.iw}px viewport`);
    if (state.memo) {
      if (!L.viz) failures.push('memo pane .app-viz is not rendered');
      else if (L.viz.visible < MIN_PANE_PX) failures.push(`memo pane .app-viz shows ${L.viz.visible}px (box ${L.viz.width}px; needs ${MIN_PANE_PX})`);
    }
    if (state.memo) {
      const want = L.iw < STACK_BELOW_PX ? 'strip' : 'column';
      if (!L.panel) failures.push('agent panel [data-chat-pane] is not rendered');
      else {
        if (L.panel.layout !== want) failures.push(`agent panel is "${L.panel.layout}" at ${L.iw}px (expected "${want}")`);
        if (!L.panel.onScreen) failures.push(`agent panel is not wholly on screen (${L.panel.box})`);
        if (!L.panel.composer) failures.push('the composer is not on screen');
      }
    }
    if (state.card) {
      if (!L.card) failures.push('Decision card [data-section="signature"] is not rendered');
      else if (L.card.visible < MIN_CARD_PX) failures.push(`Decision card shows ${L.card.visible}px (box ${L.card.width}px; needs ${MIN_CARD_PX})`);
    }
    for (const h of L.hscroll.slice(0, 3)) failures.push(h);
    if (L.hscroll.length > 3) failures.push(`…and ${L.hscroll.length - 3} more sideways scrollers`);
    for (const c of L.cut.slice(0, 3)) failures.push(`cut by the viewport edge: ${c}`);
    if (L.cut.length > 3) failures.push(`…and ${L.cut.length - 3} more elements cut by the viewport edge`);
  } catch (e) {
    failures.push(`check crashed: ${e.message.split('\n')[0]}`);
  } finally {
    await context.close();
  }
  failures.push(...notes, ...[...new Set(errors)].slice(0, 3));
  return { state: state.id, label: state.label, viewport: vp.id, size: `${vp.width}x${vp.height}`, pass: failures.length === 0, failures, axeMinor, axe: axeAll, screenshot: relative(ROOT, shot) };
}

// ---- report ---------------------------------------------------------------------------------------
function table(results, states, vps) {
  const cell = (r) => (!r ? '–' : r.pass ? 'pass' : `FAIL (${r.failures.length})`);
  const head = ['state', ...vps.map((v) => `${v.id} ${v.width}x${v.height}`)];
  const rows = states.map((s) => [s.id, ...vps.map((v) => cell(results.find((r) => r.state === s.id && r.viewport === v.id)))]);
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cols) => cols.map((c, i) => c.padEnd(w[i])).join('  ');
  console.log(`\n${line(head)}\n${w.map((n) => '-'.repeat(n)).join('  ')}`);
  for (const r of rows) console.log(line(r));
}

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const states = opts.only ? STATES.filter((s) => opts.only.includes(s.id)) : STATES;
  const vps = opts.viewport ? VIEWPORTS.filter((v) => opts.viewport.includes(v.id)) : VIEWPORTS;
  if (states.length === 0) fail(`--only matched no state (${STATES.map((s) => s.id).join(', ')})`);
  if (vps.length === 0) fail(`--viewport matched no viewport (${VIEWPORTS.map((v) => v.id).join(', ')})`);

  const server = await startServer(opts);
  let browser;
  try {
    browser = await chromium.launch({ headless: !opts.headed });
  } catch (e) {
    server.stop();
    fail(`could not launch Chromium (run \`npx playwright install chromium\` once): ${e.message.split('\n')[0]}`);
  }
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // warm-up: the dev server compiles and pre-bundles on the first visit (and may reload once)
  const warm = await browser.newPage();
  try {
    for (const p of ['/', '/?kit']) {
      await warm.goto(`${server.base}${p}`, { waitUntil: 'load', timeout: 60_000 });
      await warm.locator('#root > *').first().waitFor({ state: 'attached', timeout: 60_000 });
      await warm.waitForTimeout(1000);
    }
  } catch (e) {
    await browser.close();
    server.stop();
    fail(`the app did not load at ${server.base}: ${e.message.split('\n')[0]}\n${server.log()}`);
  }
  await warm.close();

  const started = Date.now();
  console.log(`v2-visual: ${states.length} states × ${vps.length} viewports against ${server.base}${opts.prod ? ' (production build)' : ''}`);
  const jobs = states.flatMap((s) => vps.map((v) => ({ s, v })));
  const results = await pool(jobs, opts.workers, async ({ s, v }) => {
    const r = await check(browser, server.base, s, v);
    console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${s.id} @ ${v.id}`);
    return r;
  });
  await browser.close();
  server.stop();

  table(results, states, vps);
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.log('\nFailures:');
    for (const r of failed) {
      console.log(`  ${r.state} @ ${r.viewport} ${r.size}  (${r.screenshot})`);
      for (const f of r.failures) console.log(`    - ${f}`);
    }
  }
  await writeFile(join(OUT, 'report.json'), JSON.stringify({ base: server.base, prod: opts.prod, minPanePx: MIN_PANE_PX, minCardPx: MIN_CARD_PX, results }, null, 2));
  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`\nv2-visual: ${results.length - failed.length}/${results.length} pass in ${secs} s · screenshots and report.json in ${relative(ROOT, OUT)}/`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
