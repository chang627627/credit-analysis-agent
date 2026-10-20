// ---------------------------------------------------------------------------
// draftNoteFor — compose a reviewer-note DRAFT from the evidence on record.
//
// The draft is deliberately an evidence summary, not a judgment: it restates
// the package's breaches, open flags, structure and the decision rule's own
// reasons (thin headroom, a referral score — exceptions no flag carries) so the
// reviewer can edit it into their rationale (or sign it as-is — in which case
// the record says so: see NoteProvenance). Pure function over the
// ApprovalPackage; no React.
// ---------------------------------------------------------------------------

import type { ApprovalPackage } from './types';

/** First clause of a flag message ("Total Leverage 4.3x breaches the ≤ 4.0x covenant — …"). */
function clause(message: string): string {
  return message.split(' — ')[0].replace(/\.$/, '');
}

/** The figure a breach flag quotes ("Max Total Leverage 4.26x breaches …" → "4.26x"). */
function quotedActual(message: string): string | null {
  const m = message.match(/\s(\S+)\sbreaches\s/);
  return m ? m[1] : null;
}

export function draftNoteFor(pkg: ApprovalPackage): string {
  // the reviewer's own send-back thread already renders separately at the gate —
  // quoting it back inside a fresh note would just echo the reviewer to themselves
  const flags = pkg.flags.filter((f) => !f.message.startsWith('Reviewer send-back'));
  const reasons = pkg.decisionReasons ?? [];
  const reasonText = reasons.join(' ');
  // a breach the rule's reasons already state (with its headroom) is not repeated
  const breaches = flags
    .filter((f) => f.severity === 'critical')
    .filter((f) => {
      const a = quotedActual(f.message);
      return !(a && reasonText.includes(` ${a} `));
    })
    .map((f) => clause(f.message));
  const open = flags.filter((f) => f.severity !== 'critical' && f.needsHuman).map((f) => clause(f.message));

  const parts: string[] = [];
  if (breaches.length > 0) parts.push(`Breaches on record: ${breaches.join('; ')}.`);
  if (open.length > 0) parts.push(`Open items: ${open.join('; ')}.`);
  if (pkg.restructure) {
    parts.push(`Rev ${pkg.revision} proposes ${pkg.restructure.summary}.`);
  }
  if (reasons.length > 0) parts.push(`Decision rule: ${reasonText}`);
  // the "nothing to note" line only on a clean call — an exception or a hold always has reasons
  if (parts.length === 0) parts.push('No breaches or open flags; the covenant package passes on the filed figures.');
  parts.push(`Risk rating ${pkg.riskRating}; agent recommends ${pkg.recommendation.toUpperCase()}.`);
  return parts.join(' ');
}
