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
const ADDENDUM = 'V2 three-pane addendum';
const OWNER = 'Owner request';
const ON_3P = '2026-10-20';

export const PENDING: PendingPattern[] = [
  {
    id: 'P-01',
    type: 'interaction',
    name: 'Countersignature line with ink: the foot of the memo\'s Decision card',
    description:
      'The memo\'s Decision card ends in the signature lines: the agent\'s pre-signed /s/ line beside the reviewer line, which stays an empty 2px accent line while the agent loop is suspended at the gate. The line is the record, not a control: the verbs directly above it sign, and signing draws a fixed-size ink stroke on this line once, in view. After the decision the same card shows the sealed record (ink, /auto/ or REJECTED, the quote with its provenance, the routed line). A policy signature writes /auto/ and never ink. V1 decided in a separate gate card with buttons and drew its signature block after the decision.',
    evidence: 'V2 spec §8 and §7.3; THREE-PANE.md R2.2; V1 Signature Block and countersign stamp (CLAUDE.md, UI elevation pass)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-signatureline',
  },
  {
    id: 'P-02',
    type: 'interaction',
    name: 'Two-press A: the first A brings the Decision card into view; the next A signs',
    description:
      'A signs at once only while the reviewer line of the memo\'s Decision card is on screen on the live file. Otherwise the first A scrolls the memo to the card (from another route it opens the live file first), focuses the primary verb and announces "Countersign is focused. Press A again to sign."; the next A signs. Clicking the primary itself signs at once. The agent panel\'s "Decision →" link, "Go to decision" and the composer\'s refusal link only bring the card into view and never sign, and the palette has no sign command. In V1, A countersigned at once whenever the gate card was mounted, wherever it was scrolled.',
    evidence: 'V2 spec §8; THREE-PANE.md R2.3 and §6.4 keyboard map; V1 A/R shortcut guards (CLAUDE.md, gotchas)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: null,
  },
  {
    id: 'P-03',
    type: 'layout',
    name: 'Flags marked where they sit in the memo',
    description:
      'A flag is marked on the figure or covenant row it concerns: a status glyph before the label and the value in bad-ink, or the Breach label on the covenant row. A flag with no row (for example "Earnings are highly sensitive to commodity prices", or a low-confidence reading) is one marked line at the foot of its card. There are no notes blocks and no margin column, and the agent panel only says that something needs a look ("1 covenant breached · Covenants →"), never the flag\'s sentence. J and K step through the flagged rows in the memo. Revised twice on owner feedback: notes in a side margin column left empty gaps, and notes as messages in the agent panel put data in the middle pane. V1 listed flags as pills inside the gate card, away from the figures they were about.',
    evidence: 'V2 spec §1 pillar 2; THREE-PANE.md R2.1, R2.2 and §5.6; owner feedback during the V2 build (CLAUDE.md, V2 rejected patterns)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-memocard',
  },
  {
    id: 'P-04',
    type: 'component',
    name: 'Evidence classes: Quoted / Derived / Not in the CIM / Model output',
    description:
      'One classifier gives every memo figure exactly one evidence class: Quoted with a paragraph cite into the CIM ("CIM para 2"), Derived with its formula and operand cites, "Not in the CIM · extraction model" when no CIM sentence states it (R4.3; it was "Unquoted · extracted"), or Model output. V1 made a figure citable only when it appeared in the document, and said nothing about the rest.',
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
      "Every gate prints the clean-approval policy's four checks and their results, eligible or not, and the top-bar policy switch is ink when on, never the accent, so the accent stays reserved for the reviewer line. V1 showed the policy trace only while it auto-countersigned.",
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
    name: 'Source on the memo pane\'s right edge: push when the pane is 1064px or wider, overlay below',
    description:
      'The CIM opens from a horizontal "Source CIM · n quoted" toggle at the right end of the doc bar, or from any paragraph cite, on the right edge of the memo pane, so the chain reads agent panel, memo, evidence. Push or overlay is decided by the memo pane\'s own width, not the viewport: a pushed 360px column when the pane is 1064px or wider, an overlay under the doc bar below that. In drawer mode the source and the agent drawer close each other. Revised on owner feedback: the first version used a 40px vertical spine whose rotated label was unreadable.',
    evidence: 'V2 spec §3 Source pane; THREE-PANE.md §1.7; V1 document panel and width guard (CLAUDE.md, backlog #3)',
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
      'The Signed over list on the memo\'s Decision card states how many counted notes you opened by an explicit action (Show row, Show in memo, Amend term, a cite, J and K). It is a fact on the record, never a gate: signing is never blocked on it, and nothing is inferred from scrolling.',
    evidence: 'V2 spec §8 and §9.1 GateState.opened; human-oversight hook in the spirit of EU AI Act Art. 14 (CLAUDE.md)',
    proposedBy: BY,
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-decisioncard',
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
      'The plan auto-start countdown and the clean-approval countdown arm only while the live file is on screen and the tab is visible. The plan countdown also requires the plan prompt on screen: it arms only while the agent panel is shown, hiding the panel holds it, and a plan that never armed waits, unheld, until the panel is shown. Leaving the file or hiding the tab holds them, and the hold prints its reason. This closes the review finding that an auto-countersign could fire off screen.',
    evidence: 'V2 spec §8, §9.2 #3 and critique resolution log; THREE-PANE.md §1.5 and R2.1; WCAG 2.2 SC 2.2.1 Timing Adjustable',
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
      'Desk, Book and Ledger move from top-bar tabs into a 216px sidebar of NavItems. No counts (owner feedback: a badge is a promise that something needs you): only the Desk carries a small accent dot, and only while a file waits on the reviewer at plan review or the countersignature; in the rail the dot rides the icon square\'s corner with a paper ring. The Book\'s monitor items stay on the Book screen. The active row is ink on --sunken with a 2px ink left rule, never the accent. Below 1100px it folds to a 64px icon rail, and beside an open agent panel it rails itself below 1400px without overwriting the stored choice (P-22). The top bar keeps the section name and the global controls.',
    evidence: 'Owner request during the V2 build (2026-10-17); V1 shipped a sidebar rail',
    proposedBy: 'Owner request',
    proposedDate: ON,
    status: 'awaiting',
    kitAnchor: '#board-tabs',
  },
  {
    id: 'P-22',
    type: 'layout',
    name: 'Three-pane case file: navigation, a command-and-control agent panel, the memo',
    description:
      'A case file opens in three panes: the sidebar; the agent panel, which only commands and reports (P-27); and the memo, which holds everything shown: the header, the section cards, the Decision card after step 5, the stress test, the exhibits, the appendix and the source CIM on its right edge. The sidebar rails itself beside an open panel below 1400px without overwriting the stored choice; the panel is collapsible (persisted) in column mode and a drawer below 1024px, and it reveals itself only at plan review. Pane changes are instant, never animated. The Desk, Book and Ledger stay full width with no panel. Revised on owner feedback: the first three-pane build put step records, flags and the decision in the middle pane, so the reviewer could not tell whether to read the middle or the right.',
    evidence: 'Dropbox Dash https://mobbin.com/screens/f7b146fb-ea9a-4596-a37a-3f72b340ea1e; Mistral Le Chat https://mobbin.com/screens/76e16697-0e20-4bfc-8162-e93d6f1fc8ff; Langdock https://mobbin.com/screens/579fb137-50fa-42d0-9222-4970f35648d5 (THREE-PANE.md §11); owner revision R2 (THREE-PANE.md)',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'awaiting',
    kitAnchor: '#board-agentpanel',
  },
  {
    id: 'P-23',
    type: 'interaction',
    name: 'One Decision card, in the memo after step 5',
    description:
      'The decision lives in one place: the Decision card, its own memo card right after step 5 Recommendation and before the stress test. In order: Signed over (Show row), the reviewer note (Draft from notes and the provenance chip; optional to countersign, required to return or reject), the amendment summary, the call directly above the verbs ("The agent recommends" with the agent\'s own token, the question and a one-sentence reason), the verbs in one horizontal row that may wrap (never a vertical list) with a one-line consequence under each, the attestation and the policy line, then the signature lines. After the decision the same card shows the sealed record, with no verbs and no note field. The agent panel holds one line pointing here ("Your countersignature is needed · Decision →"); the composer and the palette never decide. Moved on owner request: the first three-pane build docked the card in the agent panel.',
    evidence: 'Owner revision R2, 2026-10-20 (THREE-PANE.md R2.2: the countersign moves to the right too); the owner-approved decision panel above one row of verbs (CLAUDE.md, V2 section)',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'awaiting',
    kitAnchor: '#board-decisioncard',
  },
  {
    id: 'P-24',
    type: 'interaction',
    name: 'Links from the agent panel into the memo',
    description:
      'A panel line\'s trailing link ("Covenants →", "Decision →", "Record →") scrolls the memo to that card and plays one v2-flash on its head or the exact row; under reduced motion a static sunken highlight holds for 1200 ms instead. The memo never links back into the panel: each card keeps its own Record (tool args in, data out, reasoning) in its footer. No connector lines are drawn across panes, and nothing else moves.',
    evidence: 'THREE-PANE.md R2.1, §2.6 and §5.9; concept-agent-workspace research (claims tethered to evidence, without its leader lines)',
    proposedBy: ADDENDUM,
    proposedDate: ON_3P,
    status: 'awaiting',
    kitAnchor: '#board-memocard',
  },
  {
    id: 'P-25',
    type: 'interaction',
    name: 'Composer that takes instructions',
    description:
      'The agent panel\'s one-line composer ("Ask or instruct") starts and steers the run, not only answers questions (backlog #7): draft (also "draft without peer benchmarks"), start drafting, skip or include peer benchmarks, hold, stop, stress, questions. Parsing is deterministic and conservative, Enter sends and Shift+Enter adds a line. Any composer use holds a running countdown. Typed sign, return, reject, amend and note are refused with a pointer into the memo ("Decide in the memo: Decision →", or the covenant row). Answers are short, clip to two lines and link to the card they concern. Flat, with no glass and no kbd hint chips (both rejected earlier). Revised on owner feedback: the field is one frame with the round send button inside it (quiet while there is nothing to send, accent once there is a draft), the frame takes the focus ring, and no full-width rule crosses the panel foot (it never lined up with the sidebar\'s). As in Claude Code, the conversation runs top-down and the plan is a message in it; only the composer is pinned to the foot.',
    evidence: 'THREE-PANE.md §4 and R2.1; backlog #7 (CLAUDE.md); input model "upload to ingest, chat to steer" (CLAUDE.md, key product decisions)',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'awaiting',
    kitAnchor: '#board-composer',
  },
  {
    id: 'P-26',
    type: 'layout',
    name: 'Memo sections as cards: step eyebrow, title, one-line takeaway, labelled blocks, a quiet record footer',
    description:
      'Every memo section is its own paper card on the canvas, 16px apart: a step eyebrow ("Step 1 of 5 · Document Intelligence"), a real title, a one-line takeaway written by the model (facts only in steps 1 to 4, never the call), labelled blocks with the flagged figure marked where it sits, any row-less flag as one marked line at the foot, and ONE quiet footer line ("Document Intelligence · 94% · 1.1 s") with a collapsed Record disclosure holding the tool\'s args in, data out and reasoning. Titles use the 18px t-figure-lg role, which no in-card figure uses any more; a dedicated 18/600 title role would be a one-line token addition if preferred. Each card is its own container, so tables stack by the section\'s real width. Asked for by the owner: sections 1 to 4 read as one blob. Revised on owner feedback (THREE-PANE R3): no skeleton cards. Before Start drafting the memo is its header alone; a card appears when its step starts (it rises in once with the drafting line and caret) and writes itself in when the step returns (takeaway, blocks, table rows, flag lines, record line, one stagger apart), and the pane follows the card being written until the reviewer scrolls. A skipped optional step has no card.',
    evidence: 'LangChain usage https://mobbin.com/screens/86925057-b5b9-4c85-9787-9dcbee1d7b76; Exa usage https://mobbin.com/screens/279d5948-258a-4519-b3e3-c15a746d8b9c (THREE-PANE.md §5, §11, R2.2 and R3)',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'awaiting',
    kitAnchor: '#board-memocard',
  },
  {
    id: 'P-27',
    type: 'ia',
    name: 'Command-and-control agent panel: one-line status, links into the memo, no data',
    description:
      'The agent panel never displays data and holds no decision. It holds only one-line status from the agent ("Drafting the memo for Project Cobalt.", "Testing covenants", "Covenants tested", "4 covenants breached", "Your countersignature is needed"), each with an optional status glyph and an optional link that scrolls the memo to the card it concerns; the plan prompt above the composer ("I\'ll draft 5 steps. Peer benchmarks is optional." with Start drafting, Skip peers, Cancel and the countdown); the reviewer\'s questions and instructions with short answers; and the composer. Every number, list, table, record, reason, attestation and consequence lives in the memo. The head reads only the agent and the file, with the collapse chevron. The reference model is the owner\'s: Claude Code, whose conversation carries short status lines while the work product sits in the artifact. The first three-pane build showed step records, confidences, flag sentences and the decision card in this pane.',
    evidence: 'Owner revision R2, 2026-10-20 (THREE-PANE.md R2, R2.1 and R2.4 AgentPanelView); Claude Code conversation and artifact split',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'awaiting',
    kitAnchor: '#board-agentpanel',
  },
  {
    id: 'P-28',
    type: 'token',
    name: 'Brand mark: a signature written on a line, on the accent tile',
    description:
      'The Countersign mark is a 20px tile in the accent (aubergine) with rounded corners (rx 5 of 20) carrying a short handwritten signature stroke above a fainter signature line, both in on-accent strokes at 1.5. It reads the product name literally: the second signature on the line. It replaces the Unicode half-filled square glyph, which rendered as a crude black box. Kit BrandMark (sidebar and kit page), the V1 header, empty state and agent avatar, the design-system page and the new favicon all use the same drawing. Identity, not an icon: Lucide stays the icon system.',
    evidence: 'Owner feedback ("this icon is so ugly"); four options shown side by side, the owner chose option A',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'approved',
    kitAnchor: null,
    ownerNote: 'Chosen by the owner from four options (A, signature on a line).',
  },
  {
    id: 'P-29',
    type: 'token',
    name: 'Accent: aubergine, quieter than every status colour',
    description:
      'The one accent (fills and state strokes, hover, accent text, wash) is aubergine. Owner principle: the accent must read weaker than approve, escalate and decline, so the status stays the loudest colour on the page. Measured as OKLCH chroma, aubergine is 0.094, below every status ink and mark (0.106 to 0.186); white on it is 10.92:1. Path: the teal sat 11.5 dE from the approve green, so the primary verb read as approve; the blues (signature blue and cobalt) were as colourful as the decline red and looked very obvious; steel and dusk violet were also tried. Aubergine also reads as higher-end. V1 keeps its Graphite & Teal identity.',
    evidence: 'Owner feedback ("the theme color cyan is too close to the approve color green"; the blue "looks very obvious"; the accent "should be weaker than the approved, escalate and decline state"); several options compared on the Decision card elements',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'approved',
    kitAnchor: null,
    ownerNote: 'Chosen by the owner (aubergine, after teal, blues, steel and dusk violet).',
  },
  {
    id: 'P-30',
    type: 'interaction',
    name: 'Armed Return and Reject: a first press asks for the reason, the second decides',
    description:
      'On the memo\'s Decision card a first press of Return for revision or Reject memo (click, S or R) never acts. It arms that verb: the auto-countersign countdown holds, the card comes into view if it was off screen, and focus moves to the reviewer note so text already typed is reviewed (selected after a click; the caret at its end after S or R, so a reflexive key types one letter instead of replacing the note). While armed the note label asks the verb\'s question ("Why reject it? · on the record", "What should the agent revise? · quoted in Revision 2"), the armed button reads its commit label ("Reject now", "Return with note", no wider than the resting labels so the verb row keeps its two lines at phone width) with the commit chord (Cmd or Ctrl Enter from the note, where letters type), the only chip left (A and the other refusal key cannot act from the note, so their chips drop), its consequence caption stays, and a quiet Cancel link joins the same verb row (still one horizontal row; at phone width it may wrap on its own, it is not a verb). A second press of the same verb commits when the note has text; on an empty note it stays armed, keeps the reviewer in the note and shows a calm one-line hint ("Write a reason first."), never a red alert. The second press must be its own gesture: a press within 500 ms of arming (a double-click) never commits, and a key press while neither the armed verb nor the note is on screen only brings them back. The other refusal verb re-arms to it; Cancel or Esc in the card disarms; while a verb is armed A never signs (it focuses the primary); clicking the primary (or Enter, Space on it) still signs at once and the note goes on the record as the countersign note. Before, a note always armed both verbs silently: a stray R after an optional countersign note rejected the memo for good with that note as the reason, and pressing a verb before writing raised a red alert every time.',
    evidence: 'Mobbin audit of destructive confirmations (inline two-step confirm on the control itself, reason field before a refusal); THREE-PANE.md R4',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'approved',
    kitAnchor: '#board-decisioncard',
    ownerNote: 'Owner asked for it (Mobbin audit fix 1)',
  },
  {
    id: 'P-31',
    type: 'copy',
    name: 'Honest auto-countersign: session only, and the rule stated in words',
    description:
      'Auto-countersign is the one setting that lets the machine sign, and Settings says every setting lasts until a refresh. It now does: the policy starts off on every load and is never stored, and a value an earlier build saved is removed once on load, so a forgotten On can never sign a memo after a refresh. Settings shows the policy as a readable rule instead of a loose description: "If the agent recommends APPROVE · no flags · first pass · every key figure at 90% or above → countersign after a visible 5 s countdown you can hold. Everything else waits for you." The top-bar switch wears the kit Tip (P-15) with the same rule in one line, so "clean" is never left undefined. Both sentences are built in the model from the constants the eligibility check reads (policyChecks, the 90% threshold, the 5 s countdown), never hand-restated numbers, and the note a policy signature writes onto the record quotes the same four terms ("Auto-countersigned · clean-approval policy (APPROVE · no flags · first pass · every key figure at 90% or above)"). The narrow-width More menu item and the palette command keep their one-line labels. Before, the policy persisted in browser storage while Settings said it did not, and the switch never said what clean meant.',
    evidence: 'Mobbin audit of the case file, fix 2 (verified: state/gate.ts persisted v2.autonomy while the Settings intro said settings last until a refresh); THREE-PANE.md R4.2',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'approved',
    kitAnchor: '#board-switch',
    ownerNote: 'Owner asked for it (Mobbin audit fix 2)',
  },
  {
    id: 'P-32',
    type: 'component',
    name: 'Covenant inputs the CIM does not state, marked where they are tested and on the record',
    description:
      'Interest coverage, fixed-charge coverage and liquidity are stated in no sample CIM, yet they are three of the four covenant-tested actuals behind the call. Their evidence class now reads "Not in the CIM · extraction model" everywhere it shows. In the Covenant compliance table each Actual traces to its Financials row (a kit LinkButton in the row\'s own ink with a quiet hairline underline, tone inherit; the trace scrolls and flashes the row once, no connector lines), and an Actual the CIM does not state carries one t-meta line under it, "Not in CIM" (the short form, since the column is 88px); that row tops its cells (kit TableRow align \'start\'), so the Actual\'s value stays on its neighbours\' line. The Financials foot line counts and names them ("3 of 4 covenant tests use figures the CIM does not state (interest coverage, fixed-charge coverage and liquidity); they come from the extraction model."). The Decision card\'s Signed over closes with ONE quiet info item, "3 covenant inputs are not stated in the CIM · Show in memo": not a flag, never counted in "you opened n of N", and it changes neither the auto-countersign policy nor any engine decision. Following its link during an auto-countersign countdown holds the countdown first. The sealed caption adds "signed with 3 inputs not stated in the CIM" ("decided with" on a rejection, whose list reads "Notes on the record", never "Signed over"). Before, the Actual showed no sign it had no source, the only signal was a Financials foot line asking the reviewer to verify the figures against a CIM that does not contain them, and the Decision card never mentioned it.',
    evidence: 'Mobbin audit of the case file, fix 3 (verified: evidence.ts labelled these figures "Unquoted · extracted" in all three sample deals; CovenantRow had no evidence field; SPEC.md made the evidence check info only); THREE-PANE.md R4.3',
    proposedBy: OWNER,
    proposedDate: ON_3P,
    status: 'approved',
    kitAnchor: '#board-decisioncard',
    ownerNote: 'Owner asked for it (Mobbin audit fix 3)',
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
  { name: 'the ¶ citation mark', note: 'Rejected by the owner in the V2 build: citations read "CIM para 2" in words (P-04).' },
  { name: 'recommendation at the top of the memo', note: 'Rejected by the owner in the V2 build: the recommendation is step 5, at the foot of the memo, and the header seal states only who signed.' },
  { name: 'side margin column of notes', note: 'Rejected by the owner in the V2 build: it left empty gaps beside short sections (P-03).' },
  { name: 'top-bar tabs, the demo pace menu and a Compare V1 link in the top bar', note: 'Rejected by the owner in the V2 build: navigation lives in the sidebar (P-21); the top bar is the section name, the auto-countersign switch and search.' },
  { name: 'dark mode', note: 'Rejected by the owner for V2: light only, no theme toggle.' },
  { name: 'cross-pane connector lines (the concept-panel tether)', note: 'Judged too fancy in the concept panel; trace links scroll and flash instead (P-24).' },
  {
    name: 'data in the agent panel',
    note: 'Rejected by the owner (2026-10-20): step records, confidences, durations, flag sentences, the plan step list and file details in the middle pane left the reviewer unsure whether to read the middle or the right. The panel is command and control only (P-27); everything shown lives in the memo.',
  },
  {
    name: 'decision card in the agent panel',
    note: 'Rejected by the owner (2026-10-20): the countersign moves to the right too. The whole decision is the memo\'s Decision card after step 5 (P-23); the panel holds one line that links to it.',
  },
];
