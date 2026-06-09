import { useEffect, useRef } from 'react';
import type { AuditEntry, AuditKind } from '../hooks/useCreditAgent';

const KIND_ICON: Record<AuditKind, string> = {
  info: '•',
  tool: '⚙',
  result: '←',
  flag: '▲',
  human: '☑',
};

function fmt(t: number): string {
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

/** Chronological, timestamped record of every event — the traceability layer. */
export function AuditLog({ audit, onExport }: { audit: AuditEntry[]; onExport: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [audit]);

  return (
    <aside className="audit">
      <div className="audit__head">
        <span className="audit__tag">audit trail</span>
        <div className="audit__headright">
          {audit.length > 0 && (
            <button className="linkbtn" onClick={onExport} title="Download the run as JSON">
              ↓ export
            </button>
          )}
          <span className="audit__count">{audit.length}</span>
        </div>
      </div>
      <div className="audit__list">
        {audit.length === 0 ? (
          <p className="audit__empty">
            Every action the agent takes is logged here with a timestamp — the traceable record a
            regulated workflow needs.
          </p>
        ) : (
          audit.map((e) => (
            <div className={`audit__row audit__row--${e.kind}`} key={e.id}>
              <span className="audit__icon">{KIND_ICON[e.kind]}</span>
              <div className="audit__body">
                <span className="audit__time">{fmt(e.t)}</span>
                <span className="audit__label">{e.label}</span>
                {e.detail && <span className="audit__detail">{e.detail}</span>}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </aside>
  );
}
