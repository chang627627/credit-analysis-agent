// ---------------------------------------------------------------------------
// Countersign V2 · the pending-review queue (spec §12). Every new pattern V2
// introduces is listed here for the owner to approve or reject; the kit page
// renders this table at #pending. A primitive that embodies a pattern carries
// data-pattern="P-NN", and guard C21 requires an entry with that id here.
// Text rules: no em dashes, no colour literals.
// ---------------------------------------------------------------------------

export interface PendingPattern {
  id: string;                    // 'P-01' (also used in data-pattern="P-01")
  type: 'interaction' | 'layout' | 'component' | 'token' | 'ia' | 'motion' | 'copy';
  name: string;
  description: string;           // what, why, and how it differs from V1; no em dashes, no hex
  evidence: string;              // mobbin_url / DESIGN.md / research reference
  proposedBy: string;            // 'V2 spec · case-file'
  proposedDate: string;          // '2026-10-17'
  status: 'awaiting' | 'approved' | 'rejected';
  kitAnchor: string | null;      // '#board-signatureline'
  ownerNote?: string;            // owner's reason when approved/rejected
}

const BY = 'V2 spec · case-file';
const ON = '2026-10-17';

export const PENDING: PendingPattern[] = [
  {
    id: 'P-01',
    type: 'interaction',
    name: 'Countersignature line with ink, inside the gate',
    description:
      "The decision is a signature line at the foot of the memo it governs: the agent's pre-signed /s/ line beside an empty 2px reviewer line, and the agent loop is suspended on that line's Promise. Signing draws a fixed-size ink stroke once; a policy signature writes /auto/ and never ink. V1 decided in a separate gate card with buttons and drew its signature block after the decision.",
    evidence: 'V2 spec §8 and §7.3; V1 Signature Block and countersign stamp (CLAUDE.md, UI elevation pass)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-signatureline',
  },
  {
    id: 'P-02',
    type: 'interaction',
    name: 'Two-press sign: the first A brings the line into view',
    description:
      'The first press of A (or the palette\'s Countersign) only scrolls the reviewer line into view and focuses it; the next press signs. Nobody signs a line they cannot see. In V1, A countersigned at once whenever the gate card was mounted, wherever it was scrolled.',
    evidence: 'V2 spec §8 and §7.6 keyboard map; V1 A/R shortcut guards (CLAUDE.md, gotchas)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: null,
  },
  {
    id: 'P-03',
    type: 'layout',
    name: 'Margin notes aligned to their section by grid rows',
    description:
      'Each engine flag becomes a note in the margin cell of the grid row of the section it concerns, beside the figure it questions. Counted notes are washed in their meaning colour and stepped with J and K. V1 listed flags as pills inside the gate card, away from the figures they were about.',
    evidence: 'V2 spec §1 pillar 2 and §7.2 DOM contract; review-margin convention of document editors',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-marginnote',
  },
  {
    id: 'P-04',
    type: 'component',
    name: 'Evidence classes: Quoted ¶ / Derived / Unquoted / Model output',
    description:
      'One classifier gives every memo figure exactly one evidence class: Quoted with a ¶ cite into the CIM, Derived with its formula and operand cites, Unquoted (extracted) when no CIM sentence states it, or Model output. V1 made a figure citable only when it appeared in the document, and said nothing about the rest.',
    evidence: 'V2 spec §1 pillar 1 and §9.4 evidenceFor; V1 click-through provenance (CLAUDE.md, backlog #3)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-evidencetag',
  },
  {
    id: 'P-05',
    type: 'component',
    name: 'Inline amend with redline on the covenant row',
    description:
      'Terms are amended in place on the covenant row: the threshold is a provisional link that becomes a small number input, and the committed change reads as a redline (old value struck, new value beside it), re-tested by the same decide rule. V1 amended terms in a separate block inside the gate card.',
    evidence: 'V2 spec §7.2 Covenant compliance and §8; V1 edit-before-approve (CLAUDE.md, 2026 conventions wave)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-amendfield',
  },
  {
    id: 'P-06',
    type: 'motion',
    name: "Drafting caret as the app's only loop",
    description:
      'A 2×14 accent caret blinks at the write point of the running section while the agent drafts. It is the one looping animation in V2, and it stops under reduced motion. V1 ran a streaming shimmer, a rotating seam and pulsing glows during a run.',
    evidence: 'V2 spec §4 Motion and §6 #28; V1 shimmer and live seam (CLAUDE.md, 2026 polish pass)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-caret',
  },
  {
    id: 'P-07',
    type: 'component',
    name: 'Signed cushion with a centred-tick meter on one ±50% scale',
    description:
      "Covenant distance prints as a signed cushion (+5.0%, −6.5%) on a 64px meter whose fill grows from a centre tick, on one ±50% scale shared by every covenant, so equal fills always mean equal distance. It replaces V1's HeadroomBar, whose bug the spec's Appendix B records as fixed.",
    evidence: 'V2 spec §6 #18 and Appendix A cushions; V1 HeadroomBar (CLAUDE.md, UI elevation pass)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-meter',
  },
  {
    id: 'P-08',
    type: 'interaction',
    name: 'Sealed file state: counted notes become "signed over"',
    description:
      'After a decision the file is sealed for the session as a snapshot of the memo as signed. Counted notes turn to signed over and keep their text, and the signature records how many of them you opened. V1 replaced the gate with an outcome banner, so the memo as signed left the screen.',
    evidence: 'V2 spec §1 pillar 4 and §9.1 CaseFileSnapshot; V1 outcome banner (CLAUDE.md)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: null,
  },
  {
    id: 'P-09',
    type: 'ia',
    name: 'Exhibits derived from attached stress tests',
    description:
      'Attaching a stress test files it as a numbered Exhibit at the foot of the memo, read back from the audit history by run, so the memo, the Ledger and the export cannot disagree. V1 attached the scenario to the audit trail only, not to the memo.',
    evidence: 'V2 spec §7.3 Exhibits and §9.4; V1 what-if scenarios attach to the record (CLAUDE.md, five gate/audit fixes)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: null,
  },
  {
    id: 'P-10',
    type: 'component',
    name: 'Policy checks printed on every gate + ink-coloured policy switch',
    description:
      "Every gate prints the clean-approval policy's four checks and their results, eligible or not, and the top-bar policy switch is ink when on, never teal, so the accent stays reserved for the reviewer line. V1 showed the policy trace only while it auto-countersigned.",
    evidence: 'V2 spec §3 top bar, §8 and §10 policy checks; V1 autonomy dial (CLAUDE.md, 2026 conventions wave)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-switch',
  },
  {
    id: 'P-11',
    type: 'motion',
    name: 'Auto-countersign countdown fills the reviewer line',
    description:
      'During the clean-approval policy\'s 5 s countdown the reviewer line fills from the left, once, while the doc bar prints the seconds left. The fill is a one-shot progress line inside the gate, and it resembles the previously rejected full-width progress line; the owner should judge it explicitly. Under reduced motion the fill is hidden and the countdown stays as text.',
    evidence: 'V2 spec §8 and §4 v2-fill; Previously rejected list on this page (full-width plan progress line)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-signatureline',
  },
  {
    id: 'P-12',
    type: 'layout',
    name: 'Source on demand from the doc bar (push ≥ 1432px, overlay below)',
    description:
      'The CIM opens from a horizontal "Source CIM · n quoted" toggle in the doc bar, or from any ¶ cite: as a pushed 360px column at 1432px and wider, or as an overlay below that. Revised on owner feedback: the first version used a 40px vertical spine whose rotated label was unreadable.',
    evidence: 'V2 spec §3 Source pane; V1 document panel and width guard (CLAUDE.md, backlog #3)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: null,
  },
  {
    id: 'P-13',
    type: 'copy',
    name: '"You opened n of N" tally (explicit actions only, never blocks)',
    description:
      'The Signed over list states how many counted notes you opened by an explicit action (Show row, Trace, a cite). It is a fact on the record, never a gate: signing is never blocked on it, and nothing is inferred from scrolling.',
    evidence: 'V2 spec §8 and §9.1 GateState.opened; human-oversight hook in the spirit of EU AI Act Art. 14 (CLAUDE.md)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: null,
  },
  {
    id: 'P-14',
    type: 'token',
    name: 'One structure line colour (1.46:1); control edges use ink-3 for WCAG 1.4.11',
    description:
      'All structure uses one hairline colour at 1.46:1 on paper. The boundary of a control a person must find (text field, checkbox, switch, filter chip, the amend input) uses ink-3 at 5.44:1 instead, to meet non-text contrast. This records that exception to the one-line rule.',
    evidence: 'WCAG 2.2 SC 1.4.11 Non-text Contrast; V2 spec §4 colour rules; 15 reference DESIGN.md files use 1px hairline card edges (CLAUDE.md)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-lines',
  },
  {
    id: 'P-15',
    type: 'component',
    name: 'Tooltip primitive replacing native title',
    description:
      "A Tip primitive shows a short label after 400 ms of hover, or at once on keyboard focus, dismisses on Esc and never reads its child's ref. Research preferred the native title attribute for its zero cost; the owner method asks for a primitive, so native title is banned in V2.",
    evidence: 'WCAG 2.2 SC 1.4.13 Content on Hover or Focus; V2 spec §6 #8 and guard C02',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-tip',
  },
  {
    id: 'P-16',
    type: 'ia',
    name: 'Desk list replaces the Deals board; the Agents screen is cut',
    description:
      "The Desk is one list of case files grouped by stage, replacing V1's Deals board. The Agents roster is cut as a screen and re-homed into Ledger actors, the Book's monitor cadence and the Desk stages.",
    evidence: 'V2 spec §7.1 and Appendix B; V1 DealsView and AgentsView (CLAUDE.md, backlog #6)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: null,
  },
  {
    id: 'P-17',
    type: 'ia',
    name: 'No toasts: every side effect is shown in place',
    description:
      'V2 has no toasts. An attached exhibit appears as an Exhibit row, a routed escalation as a line under the signature and a Book item, a sealed file as its seal row, and an export as the browser download. V1 confirmed side effects with toasts that disappeared.',
    evidence: 'V2 spec §3 Overlays; V1 Toasts (CLAUDE.md, 2026 polish pass)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: null,
  },
  {
    id: 'P-18',
    type: 'ia',
    name: 'Kit page served at /?kit instead of /kit',
    description:
      'The owner method asked for a live /kit. The app is a static build with no server rewrites, so the kit page is served at /?kit from the same entry, and V1 stays at /?v=1.',
    evidence: 'V2 spec §2 entry points; static Vercel deployment (CLAUDE.md, deploy)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: null,
  },
  {
    id: 'P-19',
    type: 'component',
    name: 'Inline confirm strip for run-discarding actions (Stop, Start anyway), never a modal',
    description:
      'Any action that would discard a live run (Stop, starting another file, re-running) opens a 44px confirm strip in place, with focus on the safe choice and Esc to cancel. Nothing is aborted silently, and no modal covers the memo.',
    evidence: 'V2 spec §2 Movement, §6 #34 and §10 confirm copy',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-confirmstrip',
  },
  {
    id: 'P-20',
    type: 'interaction',
    name: 'Countdowns only run where you can see them',
    description:
      'The plan auto-start countdown and the clean-approval countdown arm only while the live file is on screen and the tab is visible. Leaving the file or hiding the tab holds them, and the hold prints its reason. This closes the review finding that an auto-countersign could fire off screen.',
    evidence: 'V2 spec §8, §9.2 #3 and critique resolution log; WCAG 2.2 SC 2.2.1 Timing Adjustable',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-signatureline',
  },
  {
    id: 'P-21',
    type: 'layout',
    name: 'Sidebar navigation (owner request)',
    description:
      'Desk, Book and Ledger move from top-bar tabs into a 216px sidebar of NavItems with their live counts (Desk awaiting you in accent, Book open escalations in warn). The active row is ink on --sunken with a 2px ink left rule, never teal. Below 1100px it folds to a 64px icon rail. The top bar keeps the section name and the global controls.',
    evidence: 'Owner request during the V2 build (2026-10-17); V1 shipped a sidebar rail',
    proposedBy: 'Owner request',
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-tabs',
  },
];

export const REJECTED_BEFORE: { name: string; note: string }[] = [
  { name: 'serif document voice', note: 'Rejected in the UI elevation pass: one typeface everywhere.' },
  { name: 'dimming the stream at the gate', note: 'Rejected in the UI elevation pass.' },
  { name: 'full-width plan progress line', note: 'Rejected in the UI elevation pass. P-11 is the closest V2 pattern and is flagged for an explicit call.' },
  { name: 'teal left spine on the what-if panel', note: 'Rejected; replaced by a provisional hairline frame (scratchpad semantics).' },
  { name: 'sparklines / trend column', note: 'Shipped, then reverted by the owner: no need for the trend.' },
  { name: 'glass composer and composer kbd hints', note: 'Reverted on request in the 2026 polish pass.' },
  { name: 'view-transition theme reveal', note: 'Reverted on request: the theme switch stays instant.' },
  { name: 'vertical Source ¶ spine', note: 'Rejected by the owner in the V2 build: the rotated label and count read as overlapped. Replaced by a horizontal doc bar toggle (P-12).' },
  { name: 'stacked decision table (verbs in a column)', note: 'Rejected by the owner in the V2 build: verbs stay in one horizontal row, each with a one-line consequence beneath it.' },
  {
    name: 'filter bars, sortable columns, date pickers, donuts, pipeline totals, bulk acknowledge',
    note: 'Rejected in the Mobbin audits as scale-driven clutter for a book of 3 to 5 files.',
  },
];
