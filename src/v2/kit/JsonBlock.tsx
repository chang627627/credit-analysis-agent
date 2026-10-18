// JsonBlock: a raw tool record (args in, data out) with a persistent CopyButton. No syntax colour.
// CopyButton: an IconButton xs that swaps Copy → Check after copying and announces "Copied".
import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { IconButton } from './IconButton';

const COPIED_HOLD_MS = 1200; // how long the confirmation glyph stays (state, not motion)

const stringify = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  try {
    const s = JSON.stringify(value, null, 2);
    return s === undefined ? String(value) : s;
  } catch {
    return String(value);
  }
};

export interface CopyButtonProps {
  text: string;
  label: string;
}

export function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = () => {
    const done = (ok: boolean) => {
      setCopied(ok);
      setMessage(ok ? 'Copied' : 'Copy failed');
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setCopied(false);
        setMessage('');
      }, COPIED_HOLD_MS);
    };
    const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clip) {
      done(false);
      return;
    }
    clip.writeText(text).then(
      () => done(true),
      () => done(false),
    );
  };

  return (
    <>
      <IconButton icon={copied ? Check : Copy} label={label} size="xs" onClick={copy} />
      <span className="v2-sr" aria-live="polite" role="status">
        {message}
      </span>
    </>
  );
}

export interface JsonBlockProps {
  label: string;
  count: string;
  value: unknown;
}

export function JsonBlock({ label, count, value }: JsonBlockProps) {
  const text = stringify(value);
  const name = label.replace(/[←→]/g, '').trim();
  return (
    <div className="k-json">
      <div className="k-json__head">
        <span className="t-label k-tone-ink2">{label}</span>
        <span className="t-meta k-tone-ink3">{count}</span>
        <span className="k-json__copy">
          <CopyButton text={text} label={name ? `Copy JSON · ${name}` : 'Copy JSON'} />
        </span>
      </div>
      <pre className="k-json__pre t-small" tabIndex={0} aria-label={label}>
        {text}
      </pre>
    </div>
  );
}
