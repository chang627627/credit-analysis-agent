// ---------------------------------------------------------------------------
// Hash router for V2 (spec §2). No server rewrites: every V2 screen lives under
// the location hash, so `/` serves the app and `/?v=1` / `/?kit` stay separate
// full page loads.
//
//   #/                      desk
//   #/file/<dealId>         case file
//   #/file/<dealId>?at=<a>  case file, scrolled to a row
//   #/book                  book
//   #/ledger                ledger
//   #/ledger?file=<dealId>  ledger filtered to one file
//   #/settings              settings (sidebar bottom)
//
// Every navigate() bumps navSeq, so navigating to the same URL re-scrolls.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';

export type FileAt =
  | 'recommendation' | 'financials' | 'risk' | 'peers' | 'covenants'
  | `revision-${number}` | 'exhibits' | 'stress' | 'signature' | 'monitoring';
export type Route =
  | { name: 'desk' }
  | { name: 'file'; dealId: string; at: FileAt | null }
  | { name: 'book' }
  | { name: 'ledger'; file: string | null }
  | { name: 'settings' };

const FIXED_AT: readonly string[] = [
  'recommendation',
  'financials',
  'risk',
  'peers',
  'covenants',
  'exhibits',
  'stress',
  'signature',
  'monitoring',
];

function parseAt(raw: string | null): FileAt | null {
  if (!raw) return null;
  if (FIXED_AT.includes(raw)) return raw as FileAt;
  if (/^revision-\d+$/.test(raw)) return raw as FileAt;
  return null;
}

function decode(part: string): string | null {
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

export function parseHash(hash: string): Route {
  const body = hash.replace(/^#/, '');
  const qAt = body.indexOf('?');
  const path = qAt >= 0 ? body.slice(0, qAt) : body;
  const query = new URLSearchParams(qAt >= 0 ? body.slice(qAt + 1) : '');
  const parts: string[] = [];
  for (const raw of path.split('/')) {
    if (!raw) continue;
    const p = decode(raw);
    if (p === null) return { name: 'desk' };
    parts.push(p);
  }
  if (parts.length === 0) return { name: 'desk' };
  if (parts[0] === 'file' && parts.length === 2 && parts[1]) {
    return { name: 'file', dealId: parts[1], at: parseAt(query.get('at')) };
  }
  if (parts[0] === 'book' && parts.length === 1) return { name: 'book' };
  if (parts[0] === 'settings' && parts.length === 1) return { name: 'settings' };
  if (parts[0] === 'ledger' && parts.length === 1) {
    const file = query.get('file');
    return { name: 'ledger', file: file ? file : null };
  }
  return { name: 'desk' };
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'desk':
      return '#/';
    case 'file':
      return `#/file/${encodeURIComponent(route.dealId)}${route.at ? `?at=${route.at}` : ''}`;
    case 'book':
      return '#/book';
    case 'ledger':
      return `#/ledger${route.file ? `?file=${encodeURIComponent(route.file)}` : ''}`;
    case 'settings':
      return '#/settings';
  }
}

/** Two routes are the same place when they serialise to the same hash. */
export function sameRoute(a: Route, b: Route): boolean {
  return toHash(a) === toHash(b);
}

interface RouterState {
  route: Route;
  navSeq: number;
}

export function useHashRoute(): { route: Route; navSeq: number; navigate: (to: Route) => void } {
  // Owner rule: a page load (refresh) always opens on the Desk. Every run lives in memory, so a
  // reload starts the session over, and step one is selecting the project. The address is reset
  // in place (no extra history entry, no hashchange) so back/forward and later links still work.
  const [state, setState] = useState<RouterState>(() => {
    const desk: Route = { name: 'desk' };
    const hash = toHash(desk);
    if (window.location.hash !== hash) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
    }
    return { route: desk, navSeq: 0 };
  });

  // back / forward / a typed URL: follow the hash (our own writes parse back to
  // the route we already hold, so they are ignored here)
  useEffect(() => {
    const onHash = () => {
      const next = parseHash(window.location.hash);
      setState((prev) => (sameRoute(prev.route, next) ? prev : { route: next, navSeq: prev.navSeq + 1 }));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((to: Route) => {
    const hash = toHash(to);
    if (window.location.hash !== hash) window.location.hash = hash;
    setState((prev) => ({ route: to, navSeq: prev.navSeq + 1 }));
  }, []);

  return { route: state.route, navSeq: state.navSeq, navigate };
}
