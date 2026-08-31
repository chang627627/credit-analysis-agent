// ---------------------------------------------------------------------------
// draftNoteFor — compose a reviewer-note DRAFT from the evidence on record.
//
// The draft is deliberately an evidence summary, not a judgment: it restates
// the package's breaches, open flags and structure so the reviewer can edit it
// into their rationale (or sign it as-is — in which case the record says so:
// see NoteProvenance). Pure function over the ApprovalPackage; no React.
// ---------------------------------------------------------------------------

import type { ApprovalPackage } from './types';

/** First clause of a flag message ("Total Leverage 4.3x breaches the ≤ 4.0x covenant — …"). */
function clause(message: string): string {
  return message.split(' — ')[0].replace(/\.$/, '');
}

export function draftNoteFor(pkg: ApprovalPackage): string {
  // the reviewer's own send-back thread already renders separately at the gate —
  // quoting it back inside a fresh note would just echo the reviewer to themselves
  const flags = pkg.flags.filter((f) => !f.message.startsWith('Reviewer send-back'));
  const breaches = flags.filter((f) => f.severity === 'critical').map((f) => clause(f.message));
  const open = flags.filter((f) => f.severity !== 'critical' && f.needsHuman).map((f) => clause(f.message));

  const parts: string[] = [];
  if (breaches.length > 0) parts.push(`Breaches on record: ${breaches.join('; ')}.`);
  if (open.length > 0) parts.push(`Open items: ${open.join('; ')}.`);
  if (pkg.restructure) {
    parts.push(
      `Rev ${pkg.revision} proposes ${pkg.restructure.summary} — covenants pass on the revised structure.`,
    );
  }
  if (parts.length === 0) parts.push('No breaches or open flags; the covenant package passes on the filed figures.');
  parts.push(`Risk rating ${pkg.riskRating}; agent recommends ${pkg.recommendation.toUpperCase()}.`);
  return parts.join(' ');
}
