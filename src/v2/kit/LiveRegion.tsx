// LiveRegion: a polite, visually hidden status announcer. Always mounted so changes are read.
export interface LiveRegionProps {
  message: string | null;
}

export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div className="k-live v2-sr" aria-live="polite" role="status">
      {message ?? ''}
    </div>
  );
}
