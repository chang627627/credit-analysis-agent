// Caret: the drafting caret, the app's single looping animation (P-06).
// Mounted only at the write point of the running section. Reduced motion stops it (kit.css).
export function Caret() {
  return <span className="k-caret" aria-hidden="true" data-pattern="P-06" />;
}
