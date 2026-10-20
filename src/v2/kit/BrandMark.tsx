// BrandMark: the Countersign mark (the owner's pick, option A): a signature written on a line, white
// on the accent tile (aubergine) with --r-sm-like corners (rx 5 of 20). Identity, not an icon: Lucide stays the icon
// system. 20px, aria-hidden (the wordmark beside it names the product). Colours come from kit.css
// (--accent tile, --on-accent strokes); public/favicon.svg is the same drawing with literal colours.
export function BrandMark() {
  return (
    <svg className="k-brand" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect className="k-brand__tile" width="20" height="20" rx="5" />
      <path className="k-brand__sig" d="M5 11.2c1.1-2.6 2.2-3.9 3-3.2.9.8-.6 4.4.4 4.6.9.2 1.6-2.6 2.6-2.4.8.2.4 2 1.3 2.1.6.1 1.2-.6 1.8-1.3" />
      <path className="k-brand__line" d="M5 14.6h10" />
    </svg>
  );
}
