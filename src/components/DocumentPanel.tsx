import { useRef, useState } from 'react';
import type { Deal } from '../agent/mockData';
import type { ParsingState } from '../hooks/useCreditAgent';

/** The input column — upload a CIM or pick a recent deal, then read its document. */
export function DocumentPanel({
  document,
  deals,
  selectedId,
  onSelect,
  onUpload,
  parsing,
  active,
  disabled,
}: {
  document: Deal['document'];
  deals: { id: string; name: string; uploaded?: boolean }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUpload: (file: File) => void;
  parsing: ParsingState | null;
  active: boolean;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <aside className="doc">
      <div className="doc__tag">input · deal</div>

      <div
        className={`drop ${drag ? 'drop--over' : ''} ${parsing ? 'drop--parsing' : ''}`}
        role="button"
        aria-disabled={disabled}
        onClick={() => !disabled && !parsing && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !disabled) onUpload(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = '';
          }}
        />
        {parsing ? (
          <div className="drop__parsing">
            <span className="spinner" />
            <div>
              <strong>Extracting financials…</strong>
              <span>{parsing.name}</span>
            </div>
          </div>
        ) : (
          <>
            <span className="drop__icon">⬆</span>
            <strong>Drop a CIM (PDF)</strong>
            <span>
              or click to browse · <em>extraction is simulated</em>
            </span>
          </>
        )}
      </div>

      <div className="deals">
        <div className="deals__label">Recent deals</div>
        {deals.map((d) => (
          <button
            key={d.id}
            className={`deal ${d.id === selectedId ? 'deal--active' : ''}`}
            onClick={() => onSelect(d.id)}
            disabled={disabled}
          >
            <span className="deal__name">{d.name}</span>
            {d.uploaded && <span className="deal__tag">uploaded</span>}
          </button>
        ))}
      </div>

      <h2 className="doc__title">{document.title}</h2>
      <dl className="doc__meta">
        <div>
          <dt>Borrower</dt>
          <dd>{document.borrower}</dd>
        </div>
        <div>
          <dt>Facility</dt>
          <dd>{document.facility}</dd>
        </div>
      </dl>
      <div className={`doc__body ${active ? 'doc__body--scanning' : ''}`}>
        {document.body.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </aside>
  );
}
