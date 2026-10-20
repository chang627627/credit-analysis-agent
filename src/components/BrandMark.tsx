// The Countersign mark: a signature written on a line, on the teal tile. Identity, not an icon
// (Lucide is the icon system). Sized by its className; colours come from the theme tokens
// (--accent tile, --on-accent strokes), so it reads in light and dark.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={`brandmark${className ? ` ${className}` : ''}`} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect className="brandmark__tile" width="20" height="20" rx="5" />
      <path className="brandmark__sig" d="M5 11.2c1.1-2.6 2.2-3.9 3-3.2.9.8-.6 4.4.4 4.6.9.2 1.6-2.6 2.6-2.4.8.2.4 2 1.3 2.1.6.1 1.2-.6 1.8-1.3" />
      <path className="brandmark__line" d="M5 14.6h10" />
    </svg>
  );
}
