// DropZone: a provisional drop target for a CIM PDF, with a keyboard-reachable
// "choose a file" link that opens a hidden file input. Disabled = sunken + the reason as the
// sub line; drops are ignored (and never let the browser open the file).
import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { LinkButton } from './LinkButton';
import type { ForceState } from './types';

export interface DropZoneProps {
  label: string;
  sub: string;
  chooseLabel: string;
  disabledReason: string | null;
  onFile: (f: File) => void;
  /** Kit page only: any value renders the drag-over state. */
  force?: ForceState;
}

export function DropZone({ label, sub, chooseLabel, disabledReason, onFile, force }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [over, setOver] = useState(false);
  const disabled = disabledReason !== null;

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current += 1;
    if (!disabled) setOver(true);
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
  };
  const onDragLeave = () => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setOver(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const cls = ['k-drop'];
  if ((over || force !== undefined) && !disabled) cls.push('k-drop--over');
  if (disabled) cls.push('k-drop--disabled');

  return (
    <div
      className={cls.join(' ')}
      role="group"
      aria-label={label}
      aria-disabled={disabled ? true : undefined}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Upload size={16} className="k-drop__icon" aria-hidden="true" />
      <span className="k-drop__label t-body">
        {label}{' '}
        <LinkButton role="body" disabled={disabled} onClick={() => inputRef.current?.click()}>
          {chooseLabel}
        </LinkButton>
      </span>
      <span className="k-drop__sub t-meta">{disabled ? disabledReason : sub}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file && !disabled) onFile(file);
        }}
      />
    </div>
  );
}
