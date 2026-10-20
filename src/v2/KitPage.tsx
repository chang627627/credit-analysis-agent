// ---------------------------------------------------------------------------
// Countersign V2 · the live kit page (/?kit, spec §12, THREE-PANE.md §8).
// Built only from the real kit (./kit) and the model's formatters, words and
// FX_* fixtures, so the page cannot drift from the app. Popovers render open
// through `specimen`; hover, focus and active states through `force`. Token
// values and contrast ratios are read live from the tokens on <html>.
// The kit page is exempt from the one-primary rule of app routes; it still runs
// exactly one caret, inside the drafting-card specimen on the Caret board.
// THREE-PANE R2: the agent panel is command and control only (one-line status
// lines that link to memo cards, the plan prompt, the composer); every figure,
// record and the whole decision live in the memo, the decision in the Decision
// card after step 5. The specimens below follow that split.
// ---------------------------------------------------------------------------
import './kitpage.css';
import { Fragment, useEffect, useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, ArrowDown, ArrowUp, ArrowUpRight, Copy, Download, FileStack, FileText, RotateCcw, ScrollText, Search, X } from 'lucide-react';
import {
  AmendField,
  BrandMark,
  Button,
  Caret,
  Checkbox,
  Chip,
  Cite,
  ConfirmStrip,
  CopyButton,
  Disclosure,
  DropZone,
  EmptyNote,
  EvidenceTag,
  FilterChips,
  IconButton,
  JsonBlock,
  Kbd,
  KeyFigure,
  KeyFigures,
  LinkButton,
  LiveRegion,
  MarginNote,
  MemoCard,
  Menu,
  Meter,
  Palette,
  Redline,
  SectionHead,
  SignatureLine,
  Slider,
  StatusGlyph,
  StatusLabel,
  Switch,
  Table,
  Tabs,
  TextArea,
  TextInput,
  Tip,
  Token,
  NavItem,
} from './kit';
import type { ForceState, MeaningTone, PaletteCommand, StatusKey, TableColumn, TableRow } from './kit';
import {
  AUTO_COUNTDOWN_MS,
  COPY,
  FX_BOOK_BREACH,
  FX_DESK_ATLAS_GATE,
  FX_DESK_INITIAL,
  FX_FILE_ATLAS_GATE,
  FX_FILE_ATLAS_REV2,
  FX_FILE_RUNNING,
  FX_FILE_UPLOAD_GATE,
  FX_LEDGER_AFTER_ATLAS,
  FX_NOTES,
  FX_PANEL_ATLAS_GATE,
  FX_PANEL_ATLAS_REV2,
  FX_PANEL_COBALT_REJECTED,
  FX_PANEL_MERIDIAN_COUNTDOWN,
  FX_PANEL_NOT_STARTED,
  FX_PANEL_PLAN_REVIEW,
  FX_PANEL_RUNNING,
  FX_PANEL_SEALED,
  FX_STUB_EXTRACT,
  FX_SIG_ATLAS_AMENDED,
  FX_SIG_ATLAS_GATE,
  FX_SIG_ATLAS_REV2,
  FX_SIG_COBALT_GATE,
  FX_SIG_AUTO_SEALED,
  FX_SIG_MERIDIAN_COUNTDOWN,
  FX_SIG_REJECTED,
  FX_SIG_SEALED,
  FX_STRESS_ATLAS,
  FX_TOKENS,
  FX_TOPBAR,
  HOLD_CAPTION,
  IMPERATIVE,
  NOTE_CHIP,
  REJECTED_WORD,
  STATUS_WORD,
  contrastRatio,
  fmtDriverValue,
  fmtM,
  fmtPct,
  fmtRatio,
  fmtSpeed,
  fmtX,
  paletteFooter,
  plural,
} from './model';
import type {
  AgentPanelView,
  CovenantRow,
  CushionView,
  EvidenceView,
  FigureRow,
  FileView,
  KeyFigureView,
  NoteView,
  SectionAside,
  SectionFlagLine,
  SectionFooter,
  SectionView,
  SignatureView,
  ThreadLine,
} from './model';
import { PENDING, REJECTED_BEFORE } from './design-pending';
import type { PendingPattern } from './design-pending';

const noop = () => {};

// =============================================================================
// Fixture atoms (read once from the model's FX_* views)
// =============================================================================

type SecOf<K extends SectionView['kind']> = Extract<SectionView, { kind: K }>;
function sectionOf<K extends SectionView['kind']>(file: FileView, kind: K): SecOf<K> | null {
  for (const s of file.sections) if (s.kind === kind) return s as SecOf<K>;
  return null;
}

const GATE = FX_FILE_ATLAS_GATE;
const REC_SECTION = sectionOf(GATE, 'recommendation');
const REC = REC_SECTION?.body ?? null;
const KEYFIGS: KeyFigureView[] = REC?.keyFigures ?? [];
const FIN = sectionOf(GATE, 'financials');
const FIGURES: FigureRow[] = FIN?.body ?? [];
const STUB = FX_STUB_EXTRACT;
const RISK_SECTION = sectionOf(GATE, 'risk');
const RISK = RISK_SECTION?.body ?? null;
const PEERS_SECTION = sectionOf(GATE, 'peers');
const COV_SECTION = sectionOf(GATE, 'covenants');
const COVENANTS: CovenantRow[] = COV_SECTION?.body ?? [];
const REVISION = sectionOf(FX_FILE_ATLAS_REV2, 'revision');
const REC_REV2 = sectionOf(FX_FILE_ATLAS_REV2, 'recommendation');
const REDLINE = REVISION?.body?.redline ?? [];
const RISK_UPLOAD = sectionOf(FX_FILE_UPLOAD_GATE, 'risk');
const DRAFTING_SECTION = FX_FILE_RUNNING.sections.find((s) => s.drafting !== null) ?? null;

// MarginNote specimens (FX_NOTES). Under R2 no app screen renders a note box: a flag is marked on
// its memo row, or as one line at the foot of its card (SectionView.flagLines), and the agent panel
// only points at it ("1 covenant breached · Covenants →").
const NOTE_BREACH: NoteView = FX_NOTES.breach;
const NOTE_WATCH: NoteView = FX_NOTES.watch;
const NOTE_LOW: NoteView = FX_NOTES.low;
const NOTE_EVIDENCE: NoteView = FX_NOTES.evidence;
const NOTE_RESTRUCTURE: NoteView = FX_NOTES.restructure;
const NOTE_SIGNED_OVER: NoteView = FX_NOTES.signedOver;

const LEV_ROW = COVENANTS.find((c) => c.amend?.kind === 'leverage') ?? null;
const STATUS_KEYS = Object.keys(STATUS_WORD) as StatusKey[];
const TOKEN_KEYS = ['approve', 'escalate', 'decline', 'rejected'] as const;
const TOKEN_VARIANTS = ['solid', 'muted', 'struck'] as const;

// =============================================================================
// Boards (ids are the anchors the index and the pending table link to)
// =============================================================================

const B = {
  type: { id: 'board-type', name: 'Type roles' },
  colour: { id: 'board-colour', name: 'Colour roles' },
  lines: { id: 'board-lines', name: 'Lines' },
  radii: { id: 'board-radii', name: 'Radii · Spacing · Elevation' },
  motion: { id: 'board-motion', name: 'Motion' },
  button: { id: 'board-button', name: 'Button' },
  iconbutton: { id: 'board-iconbutton', name: 'IconButton · LinkButton · Kbd' },
  token: { id: 'board-token', name: 'Token · Chip' },
  status: { id: 'board-statusglyph', name: 'StatusGlyph · StatusLabel' },
  tip: { id: 'board-tip', name: 'Tip · Cite · EvidenceTag' },
  fields: { id: 'board-textarea', name: 'TextArea · AmendField · TextInput · Checkbox · Switch' },
  nav: { id: 'board-tabs', name: 'Tabs · Menu · Palette · FilterChips · ConfirmStrip' },
  meter: { id: 'board-meter', name: 'Meter' },
  table: { id: 'board-table', name: 'Table' },
  notes: { id: 'board-redline', name: 'Redline · MarginNote' },
  sechead: { id: 'board-sectionhead', name: 'SectionHead · Disclosure · JsonBlock' },
  memocard: { id: 'board-memocard', name: 'MemoCard · section cards' },
  panel: { id: 'board-agentpanel', name: 'Agent panel · command and control' },
  keyfig: { id: 'board-keyfigure', name: 'KeyFigure · KeyFigures' },
  slider: { id: 'board-slider', name: 'Slider' },
  decision: { id: 'board-decisioncard', name: 'Decision card (memo)' },
  sig: { id: 'board-signatureline', name: 'SignatureLine' },
  caret: { id: 'board-caret', name: 'Caret' },
  empty: { id: 'board-emptynote', name: 'EmptyNote · DropZone · LiveRegion' },
  pending: { id: 'pending', name: 'Pending review' },
  rejected: { id: 'rejected', name: 'Previously rejected' },
} as const;
const INDEX = Object.values(B);

// =============================================================================
// Live tokens
// =============================================================================

interface ColourToken { name: string; use: string; alpha?: boolean }
const COLOUR_GROUPS: { label: string; tokens: ColourToken[] }[] = [
  {
    label: 'Surfaces',
    tokens: [
      { name: '--canvas', use: 'App background behind the paper' },
      { name: '--paper', use: 'Memo sheet, top bar, tables, notes, menus' },
      { name: '--sunken', use: 'Table header, hover row, kbd, neutral chips, disabled fill' },
      { name: '--scrim', use: 'Flat overlay behind the palette (translucent)', alpha: true },
    ],
  },
  {
    label: 'Ink',
    tokens: [
      { name: '--ink', use: 'Primary text' },
      { name: '--ink-2', use: 'Secondary text' },
      { name: '--ink-3', use: 'Tertiary text, and the control edge (3:1 non-text)' },
    ],
  },
  { label: 'Line', tokens: [{ name: '--line', use: 'All structure; never a control edge' }] },
  {
    label: 'Accent',
    tokens: [
      { name: '--accent', use: 'The one primary fill, the open reviewer line, focus' },
      { name: '--accent-hover', use: 'Primary hover and pressed' },
      { name: '--accent-ink', use: 'Accent text: links, cites, LinkButton' },
      { name: '--accent-wash', use: 'Cited span, active menu and palette row, focus halo, flash' },
      { name: '--on-accent', use: 'Text on accent fills' },
    ],
  },
  {
    label: 'Meaning',
    tokens: [
      { name: '--good-ink', use: 'Pass text and glyphs' },
      { name: '--good-wash', use: 'APPROVE token fill' },
      { name: '--good-mark', use: 'Data marks only: meter fills, flip zones' },
      { name: '--warn-ink', use: 'Watch text and glyphs' },
      { name: '--warn-wash', use: 'ESCALATE token, watch and returned notes' },
      { name: '--warn-mark', use: 'Data marks only' },
      { name: '--bad-ink', use: 'Breach text and glyphs, field error' },
      { name: '--bad-wash', use: 'DECLINE token, breach notes, error halo' },
      { name: '--bad-mark', use: 'Data marks only' },
    ],
  },
];
const BACKGROUNDS = ['--paper', '--canvas', '--sunken'] as const;

const TYPE_ROLES = ['display', 'heading', 'body', 'strong', 'control', 'small', 'label', 'meta', 'eyebrow', 'figure', 'figure-lg', 'token'] as const;
type TypeRole = (typeof TYPE_ROLES)[number];
const TYPE_SAMPLE: Record<TypeRole, string> = {
  display: GATE.header.borrower,
  heading: FX_SIG_ATLAS_GATE.call?.title ?? COPY.countersignature,
  body: REC?.sentence ?? COPY.pendingRecommendation,
  strong: FIN?.takeaway?.text ?? COVENANTS[0]?.name ?? COPY.countersignature,
  control: FX_SIG_ATLAS_GATE.verbs?.primary ?? COPY.draftMemo,
  small: FIN?.flagLines[0]?.text ?? NOTE_BREACH.text,
  label: COPY.noteLabel,
  meta: FIN?.footer?.text ?? FX_SIG_SEALED.reviewer.caption,
  eyebrow: FIN?.eyebrow ?? COPY.eyebrow,
  figure: `${fmtX(4.26)} · ${fmtM(96.3)} · ${fmtPct(17.6)}`,
  'figure-lg': FIN?.heading ?? COPY.countersignature,
  token: FX_TOKENS.escalate.word,
};
const TYPE_USE: Record<TypeRole, string> = {
  display: 'One per screen',
  heading: 'The Decision card question, key-figure values, Ledger groups, brand',
  body: 'Memo prose, agent panel lines, UI copy, table cells',
  strong: 'Section takeaways, row subjects, signed-over items, /s/ lines',
  control: 'md buttons, tabs, menu rows',
  small: 'Memo flag lines, verb consequences, attestation, sub-lines, evidence tags',
  label: 'Block labels, column headers, field labels, sm buttons',
  meta: 'Card footer lines, timestamps, captions, simulated disclosures, Kbd, chips',
  eyebrow: 'Memo card step lines; at most one per region',
  figure: 'Every numeral in tables and prose',
  'figure-lg': 'Memo section titles only (no figure inside a memo card uses it)',
  token: 'APPROVE / ESCALATE / DECLINE / REJECTED only',
};

const RADII = [
  { name: '--r-xs', cls: 'kp-radius--xs', use: 'cite, kbd, checkbox, cited span' },
  { name: '--r-sm', cls: 'kp-radius--sm', use: 'buttons, inputs, chips' },
  { name: '--r-md', cls: 'kp-radius--md', use: 'paper, notes, tables, menus, palette' },
  { name: '--r-pill', cls: 'kp-radius--pill', use: 'tokens, switch, dots' },
] as const;
const SPACES = ['1', '2', '3', '4', '5', '6', '8', '10', '12'] as const;
const MOTION = [
  { name: '--ease-out', use: 'The one easing curve' },
  { name: '--dur-press', use: 'Pressed background' },
  { name: '--dur-1', use: 'Hover, colour, caption swap, rule recolour, chevron' },
  { name: '--dur-2', use: 'Section set, note enter, signature recede, disclosure unfold' },
  { name: '--dur-3', use: 'Ink stroke only' },
  { name: '--dur-flash', use: 'One-shot anchor and cite flash' },
  { name: '--dur-caret', use: 'The one loop: the drafting caret (not zeroed; the caret stops instead)' },
] as const;

const TOKEN_NAMES: string[] = [
  ...COLOUR_GROUPS.flatMap((g) => g.tokens.map((t) => t.name)),
  '--line-provisional',
  '--line-provisional-edge',
  '--line-provisional-active',
  ...RADII.map((r) => r.name),
  ...SPACES.map((s) => `--s-${s}`),
  '--shadow-pop',
  '--halo-focus',
  '--halo-error',
  ...MOTION.map((m) => m.name),
  ...TYPE_ROLES.flatMap((r) => [`--t-${r}-size`, `--t-${r}-lh`, `--t-${r}-weight`, `--t-${r}-track`]),
];

type Tokens = Record<string, string>;
const tv = (tokens: Tokens, name: string): string => tokens[name] || '–';
const ratioOf = (tokens: Tokens, fg: string, bg: string): string => {
  const a = tokens[fg];
  const b = tokens[bg];
  return a && b ? fmtRatio(contrastRatio(a, b)) : '–';
};
const px = (v: string): string => v.replace(/px$/, '');

// =============================================================================
// Layout pieces (kit page only; every primitive inside is the real kit)
// =============================================================================

function Board({ id, name, spec, action, children }: { id: string; name: string; spec: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="kp-board" aria-labelledby={`${id}-h`}>
      <div className="kp-board__head">
        <div className="kp-board__titles">
          <h2 id={`${id}-h`} className="t-heading">
            {name}
          </h2>
          <p className="kp-board__spec t-meta">{spec}</p>
        </div>
        {action ? <div className="kp-board__action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Group({ id, label, children }: { id?: string; label?: string; children: ReactNode }) {
  return (
    <div id={id} className="kp-group">
      {label ? <h3 className="kp-group__label t-label">{label}</h3> : null}
      {children}
    </div>
  );
}

function Grid({ size = 'base', children }: { size?: 'base' | 'wide' | 'full'; children: ReactNode }) {
  return <div className={size === 'base' ? 'kp-grid' : `kp-grid kp-grid--${size}`}>{children}</div>;
}

function Cell({ caption, block = false, children }: { caption: string; block?: boolean; children: ReactNode }) {
  return (
    <figure className="kp-cell">
      <div className={block ? 'kp-cell__spec kp-cell__spec--block' : 'kp-cell__spec'}>{children}</div>
      <figcaption className="kp-cell__cap t-meta">{caption}</figcaption>
    </figure>
  );
}

// =============================================================================
// Specimen helpers (render model views verbatim)
// =============================================================================

function EvidenceSpecimen({ ev }: { ev: EvidenceView }) {
  if (ev.cls === 'quoted') {
    return (
      <EvidenceTag cls="quoted" text={ev.text}>
        <Cite label={ev.paraLabel} onClick={noop} ariaLabel={`${ev.paraLabel} in the source`} />
      </EvidenceTag>
    );
  }
  if (ev.cls === 'derived') {
    return (
      <EvidenceTag cls="derived" text={ev.text}>
        {ev.formula.split(' ').map((part, i) => {
          const op = ev.operands.find((o) => o.text === part && o.markId !== null);
          return op ? (
            <Cite key={`${part}-${i}`} label={part} onClick={noop} ariaLabel={`${part} in the source`} />
          ) : (
            <span key={`${part}-${i}`}>{part}</span>
          );
        })}
      </EvidenceTag>
    );
  }
  return <EvidenceTag cls={ev.cls} text={ev.text} />;
}

function NoteSpecimen({ note, active = false }: { note: NoteView | null; active?: boolean }) {
  if (!note) return null;
  return (
    <MarginNote
      id={note.id}
      tone={note.tone}
      status={note.status}
      heading={note.heading}
      meta={note.meta}
      active={active}
      actions={note.actions.map((a) => ({ label: a.label, onClick: noop }))}
    >
      {note.text}
    </MarginNote>
  );
}

function KeyFigureSpecimen({ k, force }: { k: KeyFigureView; force?: ForceState }) {
  return (
    <KeyFigure
      label={k.label}
      value={k.value}
      sub={k.sub}
      caption={k.caption}
      tone={k.tone}
      dot={k.dot}
      evidence={k.evidenceText}
      onClick={noop}
      ariaLabel={k.ariaLabel}
      force={force}
    />
  );
}

function CushionCell({ c }: { c: CushionView }) {
  return (
    <span className="kp-cushion">
      <Meter kind="cushion" pct={c.pct} tone={c.tone} ariaLabel={`Cushion ${c.text}`} />
      <span className="t-figure">{c.text}</span>
    </span>
  );
}

const CONF_TONE: Record<'ink-3' | 'warn' | 'bad', string> = { 'ink-3': 'kp-ink3', warn: 'kp-warn', bad: 'kp-bad' };
/** An excluded optional step's aside, in the model's words (no excluded fixture carries one yet). */

/**
 * The aside right of a section eyebrow (THREE-PANE R2.2): a status label while the card is
 * drafting, excluded or stopped. A set card has no aside: its tool, confidence and duration are
 * the card's footer line.
 */
function AsideSpecimen({ aside }: { aside: SectionAside }) {
  if (aside.kind !== 'status') return null;
  return (
    <StatusLabel state={aside.state} role="label">
      {aside.text}
    </StatusLabel>
  );
}

/**
 * A set card's footer (THREE-PANE R2.2): ONE quiet t-meta line, the tool · confidence (in its
 * tone) · duration, then the collapsed "Record" disclosure (Disclosure lead), which unfolds the
 * tool's args in, data out and the reasoning under the whole line.
 */
function FooterSpecimen({ f, initiallyOpen = false }: { f: SectionFooter; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <Disclosure
      label={f.recordLabel}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      lead={
        <span className="t-meta">
          {`${f.tool} · `}
          <span className={CONF_TONE[f.confTone]}>{f.conf}</span>
          {` · ${f.duration}`}
        </span>
      }
    >
      <div className="kp-record">
        <JsonBlock label={f.record.argsLabel} count={f.record.argsCount} value={f.record.args} />
        <JsonBlock label={f.record.resultLabel} count={f.record.resultCount} value={f.record.result} />
        <p className="kp-prewrap t-small kp-ink2">{f.record.reasoning}</p>
      </div>
    </Disclosure>
  );
}

/** A card's row-less flags, one marked line each at its foot (no notes block, no box). */
function FlagLinesSpecimen({ lines }: { lines: SectionFlagLine[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className="kp-flaglines">
      {lines.map((l) => (
        <li key={l.id} className="kp-flagline" data-anchor={`kit-${l.anchorId}`}>
          <StatusLabel state={l.state} role="small">
            {l.text}
          </StatusLabel>
        </li>
      ))}
    </ul>
  );
}

/** A set card's foot, in order: its row-less flag lines, then the footer line. */
function CardFoot({ s }: { s: SectionView }) {
  return (
    <>
      <FlagLinesSpecimen lines={s.flagLines} />
      {s.footer ? <FooterSpecimen f={s.footer} /> : null}
    </>
  );
}

/** A section head rendered verbatim from a SectionView (eyebrow, title, takeaway, aside). */
function HeadSpecimen({ s, anchorId, aside, flashKey, highlighted }: { s: SectionView; anchorId: string; aside?: SectionAside | null; flashKey?: number; highlighted?: boolean }) {
  const a = aside === undefined ? s.aside : aside;
  return (
    <SectionHead
      eyebrow={s.eyebrow}
      heading={s.heading}
      takeaway={s.takeaway}
      aside={a ? <AsideSpecimen aside={a} /> : null}
      anchorId={anchorId}
      flashKey={flashKey}
      highlighted={highlighted}
    />
  );
}

/** A labelled block inside a memo card: t-label ink-2 label, 8px above its content. */
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kp-block">
      <p className="kp-block__label t-label">{label}</p>
      {children}
    </div>
  );
}

const FIG_COLUMNS: TableColumn[] = [
  { key: 'figure', label: 'Figure', width: '1fr' },
  { key: 'value', label: 'Value', width: '120px', align: 'end' },
  { key: 'source', label: 'Source', width: '200px' },
];
/** Financials rows: the model marks a breaching figure (glyph before the label, value in bad-ink). */
const figRows = (rows: FigureRow[], prefix: string): TableRow[] =>
  rows.map((f) => ({
    key: f.id,
    anchorId: `${prefix}-${f.anchorId}`,
    cells: {
      figure: (
        <span className="kp-figlabel">
          {f.mark ? <StatusGlyph state={f.mark} srLabel={STATUS_WORD[f.mark]} /> : null}
          <span>{f.label}</span>
        </span>
      ),
      value: <span className={f.valueTone === 'bad' ? 'kp-bad' : undefined}>{f.value}</span>,
      source: <EvidenceSpecimen ev={f.evidence} />,
    },
  }));

// =============================================================================
// Board 1 · Type roles
// =============================================================================

function TypeBoard({ tokens }: { tokens: Tokens }) {
  return (
    <Board id={B.type.id} name={B.type.name} spec="--t-<role>-size · -lh · -weight · -track · Inter 400/500/600 only · uppercase only through t-eyebrow and t-token">
      <div className="kp-types">
        {TYPE_ROLES.map((r) => (
          <div key={r} className="kp-type">
            <span className="kp-type__name t-label">{`t-${r}`}</span>
            <span className={`kp-type__sample t-${r}`}>{TYPE_SAMPLE[r]}</span>
            <span className="kp-type__meta t-meta">
              {`${px(tv(tokens, `--t-${r}-size`))}/${px(tv(tokens, `--t-${r}-lh`))} · ${tv(tokens, `--t-${r}-weight`)} · ${tv(tokens, `--t-${r}-track`)} · ${TYPE_USE[r]}`}
            </span>
          </div>
        ))}
      </div>
    </Board>
  );
}

// =============================================================================
// Board 2 · Colour roles (contrast read live from the tokens)
// =============================================================================

function ColourBoard({ tokens }: { tokens: Tokens }) {
  return (
    <Board id={B.colour.id} name={B.colour.name} spec="Contrast vs --paper · --canvas · --sunken, computed live from getComputedStyle(<html>) through the model's contrastRatio">
      {COLOUR_GROUPS.map((g) => (
        <Group key={g.label} label={g.label}>
          <div className="kp-colours">
            {g.tokens.map((t) => (
              <div key={t.name} className="kp-colour">
                <span className="kp-swatch" style={{ background: `var(${t.name})` }} aria-hidden="true" />
                <div className="kp-colour__text">
                  <span className="t-label">{t.name}</span>
                  <span className="t-meta kp-ink3">{tv(tokens, t.name)}</span>
                  <span className="t-small kp-ink2">{t.use}</span>
                  <span className="t-meta kp-ink2">
                    {t.alpha
                      ? 'Contrast · not a text colour'
                      : BACKGROUNDS.map((bg) => `${bg.slice(2)} ${ratioOf(tokens, t.name, bg)}`).join(' · ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Group>
      ))}
    </Board>
  );
}

// =============================================================================
// Board 3 · Lines
// =============================================================================

function LinesBoard({ tokens }: { tokens: Tokens }) {
  return (
    <Board id={B.lines.id} name={B.lines.name} spec="One structure colour (--line) · control edge --ink-3 · provisional tokens · state strokes 2px · 1.5px and 3px are banned">
      <Grid size="wide">
        <Cell caption="hairline · 1px solid --line · all structure">
          <span className="kp-linebox kp-line--hairline" />
        </Cell>
        <Cell caption="control edge · 1px solid --ink-3 · text field, checkbox, switch, filter chip (P-14)">
          <span className="kp-linebox kp-line--edge" />
        </Cell>
        <Cell caption={`provisional · --line-provisional · ${tv(tokens, '--line-provisional')} · stress frame, drop zone, amend trigger`}>
          <span className="kp-linebox kp-line--prov" />
        </Cell>
        <Cell caption={`provisional edge · --line-provisional-edge · ${tv(tokens, '--line-provisional-edge')} · the amend input`}>
          <span className="kp-linebox kp-line--prov-edge" />
        </Cell>
        <Cell caption={`provisional active · --line-provisional-active · ${tv(tokens, '--line-provisional-active')} · drag-over, focused amend input`}>
          <span className="kp-linebox kp-line--prov-active" />
        </Cell>
        <Cell caption="state · 2px --accent · the open reviewer line and the focus ring only">
          <span className="kp-linebox kp-line--state-accent" />
        </Cell>
        <Cell caption="state · 2px --ink · tab underline, active cite, cited span, linked note">
          <span className="kp-linebox kp-line--state-ink" />
        </Cell>
        <Cell caption="rejected rule · 1px --bad-ink">
          <span className="kp-linebox kp-line--rejected" />
        </Cell>
      </Grid>
    </Board>
  );
}

// =============================================================================
// Board 4 · Radii · Spacing · Elevation
// =============================================================================

function RadiiBoard({ tokens }: { tokens: Tokens }) {
  return (
    <Board id={B.radii.id} name={B.radii.name} spec="--r-xs/sm/md/pill · --s-1 to --s-12 on the 4px grid, no negative spacing · flat: --shadow-pop on overlays only, plus two field halos">
      <Group label="Radii">
        <Grid>
          {RADII.map((r) => (
            <Cell key={r.name} caption={`${r.name} · ${tv(tokens, r.name)} · ${r.use}`}>
              <span className={`kp-radius ${r.cls}`} />
            </Cell>
          ))}
        </Grid>
      </Group>
      <Group id="board-spacing" label="Spacing">
        <div className="kp-spacing">
          {SPACES.map((s) => (
            <div key={s} className="kp-spacerow">
              <span className="t-meta kp-ink3">{`--s-${s} · ${tv(tokens, `--s-${s}`)}`}</span>
              <span className={`kp-space kp-space--${s}`} />
            </div>
          ))}
        </div>
      </Group>
      <Group id="board-elevation" label="Elevation">
        <Grid size="wide">
          <Cell caption="flat · hairline frame, no shadow (sheet, notes, tables)">
            <span className="kp-elev kp-elev--flat" />
          </Cell>
          <Cell caption={`--shadow-pop · ${tv(tokens, '--shadow-pop')} · palette, menus, tooltips, source overlay`}>
            <span className="kp-elev kp-elev--pop" />
          </Cell>
          <Cell caption={`--halo-focus · ${tv(tokens, '--halo-focus')} · focused text field`}>
            <span className="kp-elev kp-elev--focus" />
          </Cell>
          <Cell caption={`--halo-error · ${tv(tokens, '--halo-error')} · field in error`}>
            <span className="kp-elev kp-elev--error" />
          </Cell>
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 5 · Motion
// =============================================================================

const MOTION_COLUMNS: TableColumn[] = [
  { key: 'token', label: 'Token', width: '120px' },
  { key: 'value', label: 'Live value', width: '200px' },
  { key: 'use', label: 'Use', width: '1fr' },
];

function MotionBoard({ tokens }: { tokens: Tokens }) {
  const [replay, setReplay] = useState(0);
  const rows: TableRow[] = MOTION.map((m) => ({
    key: m.name,
    cells: {
      token: <span className="t-label">{m.name}</span>,
      value: <span className="t-figure">{tv(tokens, m.name)}</span>,
      use: m.use,
    },
  }));
  return (
    <Board
      id={B.motion.id}
      name={B.motion.name}
      spec="Five keyframes: v2-enter, v2-flash, v2-ink, v2-fill (one-shot) and v2-caret (the one infinite loop) · durations come only from the tokens · Preview reduced motion zeroes them"
      action={
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setReplay((n) => n + 1)}>
          Replay
        </Button>
      }
    >
      <Table columns={MOTION_COLUMNS} rows={rows} caption="Motion tokens" stackBelow={760} />
      <Grid size="wide">
        <Cell caption="v2-enter · opacity 0→1, translateY(4px)→0 · --dur-2 · --ease-out · fill backwards">
          <span key={`enter-${replay}`} className="kp-anim kp-anim--enter t-small">
            {NOTE_BREACH?.heading ?? COPY.evidenceCheck}
          </span>
        </Cell>
        <Cell caption="v2-flash · background --accent-wash→transparent · --dur-flash">
          <span key={`flash-${replay}`} className="kp-anim kp-anim--flash t-small">
            {COVENANTS[0]?.name ?? COPY.countersignature}
          </span>
        </Cell>
        <Cell caption="v2-ink · stroke-dashoffset 1→0 · --dur-3 · --ease-out (the real SignatureLine)" block>
          <div className="kp-sig">
            <SignatureLine key={`ink-${replay}`} role="reviewer" state="signed" ink="animate" caption={null} />
          </div>
        </Cell>
        <Cell caption={`v2-fill · scaleX(0)→1 · --k-fill-ms set inline from AUTO_COUNTDOWN_MS (${AUTO_COUNTDOWN_MS} ms, policy, not motion) · hidden under reduced motion`} block>
          <div className="kp-sig">
            <SignatureLine key={`fill-${replay}`} role="reviewer" state="countdown" fillMs={AUTO_COUNTDOWN_MS} caption={null} />
          </div>
        </Cell>
      </Grid>
    </Board>
  );
}

// =============================================================================
// Board 6 · Button
// =============================================================================

interface BtnVariant { variant: 'primary' | 'secondary' | 'ghost' | 'danger'; label: string }
interface BtnState { id: string; force?: ForceState; disabled?: boolean }
const BTN_VARIANTS: BtnVariant[] = [
  { variant: 'primary', label: COPY.draftMemo },
  { variant: 'secondary', label: COPY.exportFile },
  { variant: 'ghost', label: COPY.stop },
  { variant: 'danger', label: IMPERATIVE.rejectLabel },
];
const BTN_STATES: BtnState[] = [
  { id: 'rest' },
  { id: 'hover', force: 'hover' },
  { id: 'focus', force: 'focus' },
  { id: 'active', force: 'active' },
  { id: 'disabled', disabled: true },
];
const BTN_SIZES = ['md', 'sm'] as const;

function ButtonBoard() {
  return (
    <Board id={B.button.id} name={B.button.name} spec="md 34 (t-control, icon 14) · sm 28 (t-label, icon 12) · primary --accent fill, hover --accent-hover · secondary paper + --line · ghost --ink-2 · danger --bad-ink, hover --bad-wash · disabled is a token swap, never opacity">
      <div className="kp-matrix-wrap">
        <div className="kp-matrix" role="group" aria-label="Button variants by size and state">
          <span className="t-meta kp-ink3">variant · size</span>
          {BTN_STATES.map((s) => (
            <span key={s.id} className="t-meta kp-ink3">
              {s.id}
            </span>
          ))}
          {BTN_VARIANTS.flatMap((v) =>
            BTN_SIZES.map((size) => (
              <Fragment key={`${v.variant}-${size}`}>
                <span className="t-meta kp-ink3">{`${v.variant} · ${size}`}</span>
                {BTN_STATES.map((s) => (
                  <span key={s.id} className="kp-matrix__cell">
                    <Button variant={v.variant} size={size} force={s.force} disabled={s.disabled} onClick={noop}>
                      {v.label}
                    </Button>
                  </span>
                ))}
              </Fragment>
            )),
          )}
        </div>
      </div>
      <Group label="With kbd · with icon · block">
        <Grid size="wide">
          <Cell caption="primary md + kbd (Kbd onAccent)">
            <Button variant="primary" kbd={FX_FILE_ATLAS_GATE.primary?.kbd ?? '⌘↵'} onClick={noop}>
              {COPY.draftMemo}
            </Button>
          </Cell>
          <Cell caption="ghost sm + icon + kbd (top-bar search)">
            <Button variant="ghost" size="sm" icon={Search} kbd={FX_TOPBAR.searchKbd} onClick={noop}>
              {COPY.search}
            </Button>
          </Cell>
          <Cell caption="secondary md + icon">
            <Button variant="secondary" icon={Download} onClick={noop}>
              {COPY.exportFile}
            </Button>
          </Cell>
          <Cell caption="secondary sm + icon">
            <Button variant="secondary" size="sm" icon={ArrowDown} onClick={noop}>
              {COPY.goToDrafting}
            </Button>
          </Cell>
          <Cell caption="secondary sm + icon, disabled">
            <Button variant="secondary" size="sm" icon={FileText} disabled onClick={noop}>
              {COPY.openRecord}
            </Button>
          </Cell>
          <Cell caption="block (fills its container)" block>
            <Button variant="secondary" block onClick={noop}>
              {COPY.startDrafting}
            </Button>
          </Cell>
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 7 · IconButton · LinkButton · Kbd
// =============================================================================

function IconLinkKbdBoard() {
  const [pressed, setPressed] = useState(true);
  return (
    <Board id={B.iconbutton.id} name={B.iconbutton.name} spec="IconButton ghost sm 28 (icon 16) / xs 24 (icon 14), always paired with a Tip · LinkButton --accent-ink, underline on hover · Kbd 18 tall, --sunken + --line, t-meta">
      <Group label="IconButton">
        <Grid>
          <Cell caption="sm · rest (hover for its Tip)">
            <IconButton icon={X} label="Close source" onClick={noop} />
          </Cell>
          <Cell caption="sm · hover">
            <IconButton icon={X} label="Close source" force="hover" onClick={noop} />
          </Cell>
          <Cell caption="sm · focus">
            <IconButton icon={X} label="Close source" force="focus" onClick={noop} />
          </Cell>
          <Cell caption="sm · active">
            <IconButton icon={X} label="Close source" force="active" onClick={noop} />
          </Cell>
          <Cell caption={`sm · pressed (aria-pressed=${String(pressed)}, click to toggle)`}>
            <IconButton icon={FileText} label={COPY.sourceToggle} pressed={pressed} onClick={() => setPressed((p) => !p)} />
          </Cell>
          <Cell caption="sm · disabled">
            <IconButton icon={X} label="Close source" disabled onClick={noop} />
          </Cell>
          <Cell caption="xs · rest (CopyButton size)">
            <IconButton icon={Copy} label={COPY.copyJson} size="xs" onClick={noop} />
          </Cell>
        </Grid>
      </Group>
      <Group id="board-linkbutton" label="LinkButton">
        <Grid>
          <Cell caption="body · rest">
            <LinkButton onClick={noop}>{COPY.openInLedger}</LinkButton>
          </Cell>
          <Cell caption="body · hover">
            <LinkButton force="hover" onClick={noop}>
              {COPY.openInLedger}
            </LinkButton>
          </Cell>
          <Cell caption="body · focus">
            <LinkButton force="focus" onClick={noop}>
              {COPY.openInLedger}
            </LinkButton>
          </Cell>
          <Cell caption="role small · label · meta">
            <LinkButton role="small" onClick={noop}>
              {COPY.showRow}
            </LinkButton>
            <LinkButton role="label" onClick={noop}>
              {COPY.showInMemo}
            </LinkButton>
            <LinkButton role="meta" onClick={noop}>
              {COPY.openInBook}
            </LinkButton>
          </Cell>
          <Cell caption="icon after · href + newTab (a link)">
            <LinkButton role="label" href="/?v=1" newTab icon={ArrowUpRight} iconAfter>
              Compare V1
            </LinkButton>
          </Cell>
          <Cell caption="provisional · rest (amend trigger)">
            <LinkButton provisional onClick={noop}>
              {LEV_ROW?.threshold ?? COPY.amendTerm}
            </LinkButton>
          </Cell>
          <Cell caption="provisional · hover">
            <LinkButton provisional force="hover" onClick={noop}>
              {LEV_ROW?.threshold ?? COPY.amendTerm}
            </LinkButton>
          </Cell>
          <Cell caption="disabled · button and link">
            <LinkButton disabled onClick={noop}>
              {COPY.attachAsExhibit}
            </LinkButton>
            <LinkButton disabled href="#board-linkbutton">
              {COPY.openFile}
            </LinkButton>
          </Cell>
        </Grid>
      </Group>
      <Group id="board-kbd" label="Kbd">
        <Grid>
          <Cell caption="plain">
            <Kbd>{FX_TOPBAR.searchKbd}</Kbd>
            <Kbd>{FX_SIG_ATLAS_GATE.verbs?.kbd.sign ?? 'A'}</Kbd>
            <Kbd>esc</Kbd>
          </Cell>
          <Cell caption="onAccent (inside a primary)">
            <span className="kp-onaccent">
              <Kbd onAccent>{FX_FILE_ATLAS_GATE.primary?.kbd ?? '⌘↵'}</Kbd>
            </span>
          </Cell>
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 8 · Token · Chip
// =============================================================================

function TokenChipBoard() {
  return (
    <Board id={B.token.id} name={B.token.name} spec="Token 20 tall, pill, t-token: solid = tone wash + tone ink · muted = --line frame + --ink-2 · struck = muted, line-through, --ink-3 · Chip 20 tall, --r-sm, t-meta · words from the model">
      <div className="kp-matrix-wrap">
      <div className="kp-tokens" role="group" aria-label="Tokens by variant">
        <span className="t-meta kp-ink3">token</span>
        {TOKEN_VARIANTS.map((v) => (
          <span key={v} className="t-meta kp-ink3">
            {v}
          </span>
        ))}
        {TOKEN_KEYS.map((k) => (
          <Fragment key={k}>
            <span className="t-meta kp-ink3">{`${k} · ${FX_TOKENS[k].tone}`}</span>
            {TOKEN_VARIANTS.map((v) => (
              <span key={v}>
                <Token tone={FX_TOKENS[k].tone} variant={v}>
                  {FX_TOKENS[k].word}
                </Token>
              </span>
            ))}
          </Fragment>
        ))}
      </div>
      </div>
      <Group id="board-chip" label="Chip">
        <Grid>
          <Cell caption="neutral">
            <Chip>{COPY.uploadedChip}</Chip>
            <Chip>{COPY.required}</Chip>
          </Cell>
          <Cell caption="accent">
            <Chip tone="accent">{NOTE_CHIP.verbatim}</Chip>
          </Cell>
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 9 · StatusGlyph / StatusLabel
// =============================================================================

function StatusBoard() {
  return (
    <Board id={B.status.id} name={B.status.name} spec="The closed §5 vocabulary: 18 states, glyph box 16×16, icons 12 · words from the model's STATUS_WORD · quiet states recede to --ink-3">
      <Group label="StatusLabel · all 18 states with their words">
        <Grid>
          {STATUS_KEYS.map((k) => (
            <Cell key={k} caption={k}>
              <StatusLabel state={k}>{STATUS_WORD[k]}</StatusLabel>
            </Cell>
          ))}
        </Grid>
      </Group>
      <Group id="board-statuslabel" label="StatusGlyph alone (srLabel for assistive tech) · StatusLabel roles">
        <div className="kp-row">
          {STATUS_KEYS.map((k) => (
            <StatusGlyph key={k} state={k} srLabel={STATUS_WORD[k]} />
          ))}
        </div>
        <Grid>
          <Cell caption="role small">
            <StatusLabel state="breach" role="small">
              {STATUS_WORD.breach}
            </StatusLabel>
          </Cell>
          <Cell caption="role body (default)">
            <StatusLabel state="breach">{STATUS_WORD.breach}</StatusLabel>
          </Cell>
          <Cell caption="role label">
            <StatusLabel state="breach" role="label">
              {STATUS_WORD.breach}
            </StatusLabel>
          </Cell>
          <Cell caption="role strong">
            <StatusLabel state="breach" role="strong">
              {STATUS_WORD.breach}
            </StatusLabel>
          </Cell>
          <Cell caption="truncate · one line, ellipsis in a 120px box (the doc-bar status)">
            <span className="kp-truncbox">
              <StatusLabel state="awaiting" role="label" truncate>
                {STATUS_WORD.awaiting}
              </StatusLabel>
            </span>
          </Cell>
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 10 · Tip · Cite · EvidenceTag
// =============================================================================

function TipCiteEvidenceBoard() {
  const [active, setActive] = useState(false);
  const quoted = FIGURES.find((f) => f.evidence.cls === 'quoted') ?? null;
  const derived = FIGURES.find((f) => f.evidence.cls === 'derived') ?? null;
  const unquoted = FIGURES.find((f) => f.evidence.cls === 'unquoted') ?? null;
  const cite = quoted && quoted.evidence.cls === 'quoted' ? quoted.evidence.paraLabel : 'CIM para 2';
  return (
    <Board id={B.tip.id} name={B.tip.name} spec="Tip: t-label on paper, --shadow-pop, --r-sm, max 240 (P-15) · Cite: t-meta --accent-ink, active = 2px --ink outline · EvidenceTag: t-small, one class per figure (P-04)">
      <Group label="Tip (specimen: open, in normal flow)">
        <Grid size="wide">
          <Cell caption="placement top">
            <Tip label="No CIM sentence states this figure; it comes from the extraction." specimen>
              <span className="kp-tipchild t-small">{unquoted?.evidence.text ?? COPY.evidenceCheck}</span>
            </Tip>
          </Cell>
          <Cell caption="placement bottom">
            <Tip label={RISK?.evidence.text ?? COPY.record} placement="bottom" specimen>
              <span className="kp-tipchild t-small">{COPY.record}</span>
            </Tip>
          </Cell>
        </Grid>
      </Group>
      <Group id="board-cite" label="Cite">
        <Grid>
          <Cell caption="rest">
            <Cite label={cite} onClick={noop} ariaLabel={`${cite} in the source`} />
          </Cell>
          <Cell caption="hover">
            <Cite label={cite} force="hover" onClick={noop} ariaLabel={`${cite} in the source`} />
          </Cell>
          <Cell caption="focus">
            <Cite label={cite} force="focus" onClick={noop} ariaLabel={`${cite} in the source`} />
          </Cell>
          <Cell caption="active · 2px ink outline">
            <Cite label={cite} active onClick={noop} ariaLabel={`${cite} in the source`} />
          </Cell>
          <Cell caption={`click to toggle · aria-pressed=${String(active)}`}>
            <Cite label={cite} active={active} onClick={() => setActive((a) => !a)} ariaLabel={`${cite} in the source`} />
          </Cell>
        </Grid>
      </Group>
      <Group id="board-evidencetag" label="EvidenceTag · the 4 classes (from the Atlas memo)">
        <Grid size="wide">
          {quoted ? (
            <Cell caption={`quoted · ${quoted.label} ${quoted.value}`}>
              <EvidenceSpecimen ev={quoted.evidence} />
            </Cell>
          ) : null}
          {derived ? (
            <Cell caption={`derived · ${derived.label} ${derived.value} · operands are cites`}>
              <EvidenceSpecimen ev={derived.evidence} />
            </Cell>
          ) : null}
          {unquoted ? (
            <Cell caption={`unquoted · ${unquoted.label} ${unquoted.value}`}>
              <EvidenceSpecimen ev={unquoted.evidence} />
            </Cell>
          ) : null}
          {RISK ? (
            <Cell caption={`model · risk ${RISK.scoreText}`}>
              <EvidenceSpecimen ev={RISK.evidence} />
            </Cell>
          ) : null}
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 11 · TextArea · AmendField · TextInput · Checkbox · Switch
// =============================================================================

/** The agent panel's composer (P-25): one framed line, "Ask or instruct", the send button inside the frame; Enter sends, Shift+Enter adds a line. */
function ComposerSpecimen() {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const blank = draft.trim() === '';
  const send = () => {
    if (blank) return;
    setSent(draft.trim());
    setDraft('');
  };
  return (
    <Cell caption={sent === null ? 'live · Enter sends, Shift+Enter adds a line, IME and ⌘↵ never send · nothing sent yet' : `live · sent “${sent}”`} block>
      <div className="kp-composer" data-pattern="P-25">
        <TextArea
          size="composer"
          value={draft}
          onChange={setDraft}
          onSubmit={send}
          placeholder={COPY.composerPlaceholder}
          ariaLabel={COPY.composerLabel}
          trailing={<IconButton icon={ArrowUp} label={COPY.send} variant="send" disabled={blank} onClick={send} />}
        />
      </div>
    </Cell>
  );
}

function FieldsBoard() {
  const [note, setNote] = useState('');
  const [ask, setAsk] = useState('');
  const [lev, setLev] = useState<number | null>(null);
  const [checkA, setCheckA] = useState(false);
  const [checkB, setCheckB] = useState(true);
  const [switchA, setSwitchA] = useState(false);
  const [switchB, setSwitchB] = useState(true);
  const amend = LEV_ROW?.amend ?? null;
  const amendTo = (v: number) => (amend ? `${amend.prefix}${fmtX(v)}` : fmtX(v));
  return (
    <Board id={B.fields.id} name={B.fields.name} spec="Fields: paper, 1px --ink-3 control edge, --r-sm; focus = --accent edge + --halo-focus; invalid = --bad-ink + --halo-error · TextArea size note 64 to 160 / composer one frame 28 to 160 with the send button inside (IconButton variant send), optional onSubmit on Enter · AmendField: --line-provisional-edge (P-05) · Switch: ink track when on (P-10)">
      <Group label="TextArea · size note (the reviewer note on the memo's Decision card)">
        <Grid size="wide">
          <Cell caption="rest · type to auto-grow (64 to 160)">
            <TextArea value={note} onChange={setNote} placeholder={COPY.notePlaceholder} ariaLabel={COPY.noteLabel} />
          </Cell>
          <Cell caption="focus">
            <TextArea value="" onChange={noop} placeholder={COPY.notePlaceholder} ariaLabel={COPY.noteLabel} force="focus" />
          </Cell>
          <Cell caption={`invalid · ${COPY.needNoteReject}`}>
            <TextArea value="" onChange={noop} placeholder={COPY.notePlaceholder} ariaLabel={COPY.noteLabel} invalid describedBy="kp-hint-invalid" />
            <span id="kp-hint-invalid" className="v2-sr">
              {COPY.needNoteReject}
            </span>
          </Cell>
          <Cell caption="disabled">
            <TextArea value="" onChange={noop} placeholder={COPY.notePlaceholder} ariaLabel={COPY.noteLabel} disabled />
          </Cell>
        </Grid>
      </Group>
      <Group id="board-composer" label="TextArea · size composer (the agent panel's composer, P-25; it never signs, returns or rejects)">
        <Grid size="wide">
          <ComposerSpecimen />
          <Cell caption="focus with a draft · the send button fills with the accent; the composer is never disabled on a case file" block>
            <div className="kp-composer">
              <TextArea
                size="composer"
                value="what is the leverage"
                onChange={noop}
                placeholder={COPY.composerPlaceholder}
                ariaLabel={COPY.composerLabel}
                force="focus"
                trailing={<IconButton icon={ArrowUp} label={COPY.send} variant="send" onClick={noop} />}
              />
            </div>
          </Cell>
        </Grid>
      </Group>
      <Group id="board-amendfield" label="AmendField (Max Total Leverage, from the Atlas gate)">
        {LEV_ROW && amend ? (
          <Grid>
            <Cell caption="view · click to edit, Enter commits, Esc reverts">
              <AmendField
                display={LEV_ROW.threshold}
                amended={lev === null ? null : { from: LEV_ROW.threshold, to: amendTo(lev) }}
                value={lev ?? amend.value}
                step={amend.step}
                min={amend.min}
                max={amend.max}
                prefix={amend.prefix}
                suffix={amend.suffix}
                onCommit={setLev}
                ariaLabel={LEV_ROW.name}
              />
            </Cell>
            <Cell caption="view · hover (pen shows)">
              <AmendField
                display={LEV_ROW.threshold}
                amended={null}
                value={amend.value}
                step={amend.step}
                min={amend.min}
                max={amend.max}
                prefix={amend.prefix}
                suffix={amend.suffix}
                onCommit={noop}
                ariaLabel={LEV_ROW.name}
                force="hover"
              />
            </Cell>
            <Cell caption="amended · redline">
              <AmendField
                display={LEV_ROW.threshold}
                amended={{ from: LEV_ROW.threshold, to: amendTo(4.3) }}
                value={4.3}
                step={amend.step}
                min={amend.min}
                max={amend.max}
                prefix={amend.prefix}
                suffix={amend.suffix}
                onCommit={noop}
                ariaLabel={LEV_ROW.name}
              />
            </Cell>
            <Cell caption="editing · --line-provisional-active">
              <AmendField
                display={LEV_ROW.threshold}
                amended={null}
                value={amend.value}
                step={amend.step}
                min={amend.min}
                max={amend.max}
                prefix={amend.prefix}
                suffix={amend.suffix}
                onCommit={noop}
                ariaLabel={LEV_ROW.name}
                force="focus"
              />
            </Cell>
            <Cell caption="disabled">
              <AmendField
                display={LEV_ROW.threshold}
                amended={null}
                value={amend.value}
                step={amend.step}
                min={amend.min}
                max={amend.max}
                prefix={amend.prefix}
                suffix={amend.suffix}
                onCommit={noop}
                ariaLabel={LEV_ROW.name}
                disabled
              />
            </Cell>
          </Grid>
        ) : null}
      </Group>
      <Group id="board-textinput" label="TextInput">
        <Grid size="wide">
          <Cell caption="rest · icon · Enter submits">
            <TextInput value={ask} onChange={setAsk} onSubmit={() => setAsk('')} placeholder={COPY.askPlaceholder} ariaLabel={COPY.askPlaceholder} icon={Search} />
          </Cell>
          <Cell caption="focus">
            <TextInput value="" onChange={noop} onSubmit={noop} placeholder={COPY.askPlaceholder} ariaLabel={COPY.askPlaceholder} force="focus" />
          </Cell>
          <Cell caption={`disabled · ${COPY.askDisabledRunning}`}>
            <TextInput value="" onChange={noop} onSubmit={noop} placeholder={COPY.askPlaceholder} ariaLabel={COPY.askPlaceholder} disabled />
          </Cell>
        </Grid>
      </Group>
      <Group id="board-checkbox" label="Checkbox">
        <Grid>
          <Cell caption={`off · click to toggle (${String(checkA)})`}>
            <Checkbox checked={checkA} onChange={setCheckA} ariaLabel="Peer benchmarks" />
          </Cell>
          <Cell caption={`on · click to toggle (${String(checkB)})`}>
            <Checkbox checked={checkB} onChange={setCheckB} ariaLabel="Peer benchmarks" />
          </Cell>
          <Cell caption="locked · required step">
            <Checkbox checked locked onChange={noop} ariaLabel="Financials (required)" />
          </Cell>
          <Cell caption="hover">
            <Checkbox checked={false} onChange={noop} ariaLabel="Peer benchmarks" force="hover" />
          </Cell>
          <Cell caption="focus">
            <Checkbox checked onChange={noop} ariaLabel="Peer benchmarks" force="focus" />
          </Cell>
          <Cell caption="disabled">
            <Checkbox checked={false} onChange={noop} ariaLabel="Peer benchmarks" disabled />
          </Cell>
        </Grid>
      </Group>
      <Group id="board-switch" label="Switch (P-10)">
        <Grid>
          <Cell caption={`off · click (${String(switchA)})`}>
            <Switch checked={switchA} onChange={setSwitchA} ariaLabel={COPY.policyLabel} />
          </Cell>
          <Cell caption={`on · ink track (${String(switchB)})`}>
            <Switch checked={switchB} onChange={setSwitchB} ariaLabel={COPY.policyLabel} />
          </Cell>
          <Cell caption="hover">
            <Switch checked={false} onChange={noop} ariaLabel={COPY.policyLabel} force="hover" />
          </Cell>
          <Cell caption="focus">
            <Switch checked onChange={noop} ariaLabel={COPY.policyLabel} force="focus" />
          </Cell>
          <Cell caption="disabled · off and on">
            <Switch checked={false} onChange={noop} ariaLabel={COPY.policyLabel} disabled />
            <Switch checked onChange={noop} ariaLabel={COPY.policyLabel} disabled />
          </Cell>
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 12 · Tabs · Menu · Palette · FilterChips · ConfirmStrip
// =============================================================================

const PALETTE_COMMANDS: PaletteCommand[] = [
  // Section names mirror the model's selectCommands; labels and hints come from the fixtures.
  // No sign command (THREE-PANE §6.5): signing happens only on the memo's Decision card.
  { id: 'go-signature', label: COPY.goToDecision, section: 'Live file', hint: `${GATE.docBar.fileName} · rev ${GATE.revision}`, kbd: FX_SIG_ATLAS_GATE.verbs?.kbd.sign ?? 'A', run: noop },
  { id: 'stop', label: 'Stop the live run', section: 'Live file', hint: GATE.docBar.fileName, run: noop },
  ...GATE.docBar.files.map((f) => ({ id: `open:${f.dealId}`, label: `Open ${f.label}`, section: 'Files', hint: f.meta, run: noop })),
  { id: 'route:book', label: 'Go to Book', section: 'Go to', run: noop },
  { id: 'route:ledger', label: 'Go to Ledger', section: 'Go to', run: noop },
  { id: 'export-session', label: COPY.exportSession, section: 'Export', run: noop },
];

/** The confirm strips focus their cancel button on mount (by design); on the kit page they mount
 *  inert, so loading the page never steals focus or scrolls, and become live right after. */
function ConfirmSpecimens() {
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  const files = GATE.docBar.files;
  const other = files[1]?.label ?? files[0]?.label ?? GATE.docBar.fileName;
  return (
    <div className="kp-stack" inert={!live}>
      <Cell caption="neutral · start confirm (Start anyway / Keep) · focus moves to cancel on mount, Esc cancels" block>
        <ConfirmStrip
          text={`${GATE.docBar.fileName} is awaiting your countersignature. The agent handles one file at a time: starting ${other} discards that run, and the Ledger records it as cancelled.`}
          confirmLabel={COPY.startAnyway}
          cancelLabel={`Keep ${GATE.docBar.fileName}`}
          tone="neutral"
          onConfirm={noop}
          onCancel={noop}
        />
      </Cell>
      <Cell caption="bad · stop confirm (danger confirm)" block>
        <ConfirmStrip
          text={`Stop discards the suspended rev ${GATE.revision} memo. The Ledger records the run as cancelled.`}
          confirmLabel={COPY.stopRun}
          cancelLabel={COPY.keep}
          tone="bad"
          onConfirm={noop}
          onCancel={noop}
        />
      </Cell>
    </div>
  );
}

function NavBoard() {
  const [tab, setTab] = useState<string>(FX_TOPBAR.active);
  const [speed, setSpeed] = useState(1);
  const [chip, setChip] = useState<string>(FX_LEDGER_AFTER_ATLAS.activeChip);
  const [paletteOpen, setPaletteOpen] = useState(false);
  return (
    <Board id={B.nav.id} name={B.nav.name} spec="Tabs 48, active = 2px --ink underline · Menu and Palette: paper, --shadow-pop, --r-md; keyboard-active row = --accent-wash + --accent-ink + 2px inset --accent outline · FilterChips 28, --ink-3 edge · ConfirmStrip 44, --sunken (P-19)">
      <Group label="Tabs (top-bar fixture; click to switch)">
        <div className="kp-tabsframe">
          <Tabs items={FX_TOPBAR.tabs.map((t) => ({ id: t.id, label: t.label, count: null, countTone: 'ink-3' as const }))} active={tab} onSelect={setTab} ariaLabel="Sections (specimen)" />
        </div>
      </Group>
      <Group label="NavItem (sidebar navigation, P-21; click to switch). No counts: the teal dot shows only while something waits on the reviewer (the Desk, at plan review or the countersignature)">
        <div className="kp-navframe">
          {FX_TOPBAR.tabs.map((t) => (
            <NavItem
              key={t.id}
              icon={t.id === 'book' ? Activity : t.id === 'ledger' ? ScrollText : FileStack}
              label={t.label}
              attention={t.attention}
              active={t.id === tab}
              onClick={() => setTab(t.id)}
            />
          ))}
          <NavItem icon={FileStack} label="Hover (forced)" force="hover" onClick={() => undefined} />
          <NavItem icon={FileStack} label="Focus (forced)" force="focus" onClick={() => undefined} />
          <NavItem icon={FileStack} label="Compact (icon rail), a file waiting" attention={COPY.fileWaiting} compact onClick={() => undefined} />
          <NavItem icon={Activity} label="Compact (icon rail), nothing waiting" compact onClick={() => undefined} />
        </div>
      </Group>
      <Group id="board-menu" label="Menu">
        <Grid size="wide">
          <Cell caption="specimen · open in normal flow, keyboard-active row on the checked pace" block>
            <Menu
              label={COPY.paceLabel}
              trigger={{ text: FX_TOPBAR.speedLabel, variant: 'ghost' }}
              items={FX_TOPBAR.speeds.map((s) => ({ id: `spec-${s.value}`, label: s.label, checked: s.checked, onSelect: noop }))}
              specimen
            />
          </Cell>
          <Cell caption="live · ↑↓ Home End, Enter selects, Esc closes, focus returns to the trigger">
            <Menu
              label={COPY.paceLabel}
              trigger={{ text: fmtSpeed(speed), variant: 'secondary' }}
              items={FX_TOPBAR.speeds.map((s) => ({ id: `live-${s.value}`, label: s.label, checked: s.value === speed, onSelect: () => setSpeed(s.value) }))}
            />
          </Cell>
        </Grid>
      </Group>
      <Group id="board-palette" label="Palette">
        <Cell caption="specimen · open in normal flow, first row active; type to filter (no focus trap in specimen)" block>
          <Palette open={false} onClose={noop} placeholder={COPY.palettePlaceholder} commands={PALETTE_COMMANDS} footer={paletteFooter} specimen />
        </Cell>
        <Cell caption="live · scrim, focus trap, Esc closes, focus returns to the opener">
          <Button variant="secondary" size="sm" icon={Search} kbd={FX_TOPBAR.searchKbd} onClick={() => setPaletteOpen(true)}>
            Open the live palette
          </Button>
          <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} placeholder={COPY.palettePlaceholder} commands={PALETTE_COMMANDS} footer={paletteFooter} />
        </Cell>
      </Group>
      <Group id="board-filterchips" label="FilterChips (Ledger fixture; click to filter)">
        <FilterChips items={FX_LEDGER_AFTER_ATLAS.chips} active={chip} onSelect={setChip} ariaLabel="Filter events (specimen)" />
      </Group>
      <Group id="board-confirmstrip" label="ConfirmStrip (P-19)">
        <ConfirmSpecimens />
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 13 · Meter
// =============================================================================

const RISK_SPECIMENS: { value: number; tone: MeaningTone; band: string }[] = [
  { value: 28, tone: 'good', band: 'good band, below 45' },
  { value: 58, tone: 'warn', band: 'watch band, 45 to 74' },
  { value: 82, tone: 'bad', band: 'at or above the 75 decline line' },
];

function MeterBoard() {
  const cushions: { c: CushionView | null; what: string }[] = [
    { c: FX_BOOK_BREACH.rows[0]?.cushion ?? null, what: `${FX_BOOK_BREACH.rows[0]?.name ?? ''} leverage` },
    { c: COVENANTS[0]?.cushion ?? null, what: COVENANTS[0]?.name ?? '' },
    { c: COVENANTS[1]?.cushion ?? null, what: COVENANTS[1]?.name ?? '' },
    { c: COVENANTS[3]?.cushion ?? null, what: COVENANTS[3]?.name ?? '' },
  ];
  const tick = RISK?.tick ?? 75;
  return (
    <Board id={B.meter.id} name={B.meter.name} spec="risk: full width, 6px, --line track, tone mark fill, 2×12 --ink tick at the decline line · cushion: 64×4, centred 2×10 --ink-2 tick, one shared ±50% scale (P-07); fill --bad-mark below 0, --warn-mark 0 to 10, --ink-3 above">
      <Group label="Risk (tick 75)">
        <Grid size="wide">
          {RISK_SPECIMENS.map((r) => (
            <Cell key={r.value} caption={`risk ${r.value} · ${r.tone} · ${r.band} · ${RISK?.tickCaption ?? ''}`} block>
              <Meter kind="risk" value={r.value} tick={tick} tone={r.tone} ariaLabel={`Risk ${r.value} of 100; decline line at ${tick}`} />
            </Cell>
          ))}
        </Grid>
      </Group>
      <Group label="Cushion (signed, from the fixtures)">
        <Grid>
          {cushions.map(({ c, what }) =>
            c ? (
              <Cell key={c.text} caption={`${c.text} · ${c.tone} · ${what}`}>
                <CushionCell c={c} />
              </Cell>
            ) : null,
          )}
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 14 · Table
// =============================================================================

// The memo's covenant columns (THREE-PANE §5.4): Threshold, Actual and Cushion read end-aligned figures.
const COV_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Covenant', width: '1fr' },
  { key: 'threshold', label: 'Threshold', width: '128px', align: 'end' },
  { key: 'actual', label: 'Actual', width: '88px', align: 'end' },
  { key: 'cushion', label: 'Cushion', width: '152px' },
  { key: 'status', label: 'Status', width: '104px' },
];
const covRow = (c: CovenantRow, extra: Partial<TableRow> = {}): TableRow => ({
  key: c.anchorId,
  height: 36,
  anchorId: `kit-${c.anchorId}`,
  cells: {
    name: <span className="t-strong">{c.name}</span>,
    threshold: c.threshold,
    actual: <span className={c.actualTone === 'bad' ? 'kp-bad' : undefined}>{c.actual}</span>,
    cushion: <CushionCell c={c.cushion} />,
    status: (
      <StatusLabel state={c.status} role="small">
        {c.statusText}
      </StatusLabel>
    ),
  },
  ...extra,
});

const BOOK_COLUMNS: TableColumn[] = [
  { key: 'subject', label: 'File or covenant', width: '1fr' },
  { key: 'reading', label: 'Reading', width: '144px', align: 'end' },
  { key: 'distance', label: 'Distance', width: '104px', align: 'end' },
  { key: 'status', label: 'Status', width: '176px' },
];
const LEDGER_COLUMNS: TableColumn[] = [
  { key: 'time', label: 'Time', width: '88px' },
  { key: 'actor', label: 'Actor', width: '136px' },
  { key: 'event', label: 'Event', width: '1fr' },
];

function TableBoard() {
  const [flash, setFlash] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [activated, setActivated] = useState(0);

  const covRows: TableRow[] = [
    {
      key: 'group',
      group: {
        label: COV_SECTION?.heading ?? COPY.countersignature,
        status: 'breach',
        meta: COV_SECTION?.testsLabel ?? undefined,
        count: String(COVENANTS.length),
        height: 32,
      },
    },
    ...COVENANTS.map((c, i) =>
      covRow(c, i === 0 ? { highlighted: true } : i === COVENANTS.length - 1 ? { flashKey: flash === 0 ? undefined : flash } : {}),
    ),
  ];

  const book = FX_BOOK_BREACH.rows.find((r) => r.items.length > 0 && r.dealId === 'atlas') ?? FX_BOOK_BREACH.rows[0] ?? null;
  const bookRows: TableRow[] = book
    ? [
        {
          key: book.dealId,
          height: 56,
          onActivate: () => setActivated((n) => n + 1),
          ariaLabel: `Open ${book.name}`,
          cells: {
            subject: (
              <span className="kp-twoline">
                <span className="t-strong">{book.name}</span>
                <span className="t-small kp-ink2">{book.borrower}</span>
              </span>
            ),
            reading: book.tightest?.reading ?? '',
            distance: book.cushion?.text ?? '',
            status: (
              <StatusLabel state={book.status.state} role="small">
                {book.status.text}
              </StatusLabel>
            ),
          },
        },
        ...book.items.map(
          (it): TableRow => ({
            key: it.id,
            indent: true,
            muted: it.muted,
            cells: {
              subject: it.covenant,
              reading: it.reading,
              distance: it.distance,
              status: (
                <StatusLabel state={it.status.state} role="small">
                  {it.status.text}
                </StatusLabel>
              ),
            },
          }),
        ),
      ]
    : [];

  const run = FX_LEDGER_AFTER_ATLAS.files[0]?.runs[0] ?? null;
  const withDetail = run?.rows.find((r) => r.detail !== null) ?? null;
  const ledgerRows: TableRow[] = run
    ? [
        {
          key: run.key,
          group: {
            label: run.header.text,
            status: run.header.state,
            meta: run.header.meta,
            height: 40,
            expanded,
            onToggle: () => setExpanded((e) => !e),
            trailing: (
              <LinkButton role="label" onClick={noop}>
                {run.openFileLabel}
              </LinkButton>
            ),
          },
        },
        ...(expanded
          ? [
              ...run.rows.slice(0, 3).map(
                (r): TableRow => ({ key: r.id, cells: { time: <span className="t-figure">{r.time}</span>, actor: r.actor, event: r.event } }),
              ),
              ...(withDetail
                ? [
                    {
                      key: `${withDetail.id}-d`,
                      cells: { time: <span className="t-figure">{withDetail.time}</span>, actor: withDetail.actor, event: withDetail.event },
                      detail: <p className="kp-detail t-small">{withDetail.detail}</p>,
                    },
                  ]
                : []),
              { key: 'span', span: <span className="t-small kp-ink2">{FX_LEDGER_AFTER_ATLAS.note}</span> },
            ]
          : []),
      ]
    : [];

  return (
    <Board
      id={B.table.id}
      name={B.table.name}
      spec="Header 36 --sunken t-label --ink-3 · rows 36/48/56 with a 1px --line rule · cells 8 12 · group rows 32/40 · indent 24 · highlighted = --sunken · flash = v2-flash · stackBelow 760 / 640 / 480 is a container query on the table's own width"
      action={
        <Button variant="secondary" size="sm" onClick={() => setFlash((n) => n + 1)}>
          Flash row
        </Button>
      }
    >
      <Grid size="full">
        <Cell caption="header · group 32 (status, meta, count) · end-aligned figures · highlighted (first row) · flash (last row, press Flash row)" block>
          <Table columns={COV_COLUMNS} rows={covRows} caption="Covenant compliance (specimen)" />
        </Cell>
        <Cell caption={`activatable row 56 (click or Enter · activated ${activated}×) · indented sub-rows · muted (acknowledged)`} block>
          <Table columns={BOOK_COLUMNS} rows={bookRows} caption="Book (specimen)" />
        </Cell>
        <Cell caption="toggling group 40 with trailing (press the group to fold) · rows · detail row · span row" block>
          <Table columns={LEDGER_COLUMNS} rows={ledgerRows} caption="Ledger run (specimen)" />
        </Cell>
        <Cell caption="stacked · stackBelow 760 in a fixed 360px frame (header hides, cells stack with their labels) · Desk, Book, Ledger" block>
          <div className="kp-frame360">
            <Table columns={COV_COLUMNS} rows={COVENANTS.map((c) => covRow(c))} caption="Covenant compliance, stacked (specimen)" stackBelow={760} />
          </div>
        </Cell>
        <Cell caption="stackBelow 640 and 480 in one 600px frame · the covenant table (640: Covenants, Appendix, stress) stacks; the Financials table (480: Financials, Peers, Revision) does not, as at a 676px memo pane" block>
          <div className="kp-frame600 kp-stack">
            <Table columns={COV_COLUMNS} rows={COVENANTS.map((c) => covRow(c))} caption="Covenant compliance, stackBelow 640 (specimen)" stackBelow={640} />
            <Table columns={FIG_COLUMNS} rows={figRows(FIGURES.filter((f) => f.group === 'tested'), 'kit-600')} caption="Financials, stackBelow 480 (specimen)" stackBelow={480} />
          </div>
        </Cell>
      </Grid>
    </Board>
  );
}

// =============================================================================
// Board 15 · Redline · MarginNote
// =============================================================================

function NotesBoard() {
  const debt = REDLINE.find((r) => !r.unchanged && r.from.startsWith('$')) ?? REDLINE[0] ?? null;
  const rec = REDLINE[REDLINE.length - 1] ?? null;
  return (
    <Board id={B.notes.id} name={B.notes.name} spec="Redline: old --ink-3 struck, arrow --ink-3, new --ink · MarginNote: --r-md, padding 12, 1px --line; breach on --bad-wash, watch and returned on --warn-wash, info and signed-over on paper; active = 2px --ink outline; enters with v2-enter · under R2 no app screen renders a note box: a flag is marked on its memo row or as one line at the foot of its card (P-03, MemoCard board)">
      <Group label="Redline (Atlas rev 1 → rev 2)">
        <Grid size="wide">
          {debt ? (
            <Cell caption={`role figure (default) · ${debt.label}`}>
              <Redline from={debt.from} to={debt.to} />
            </Cell>
          ) : null}
          {rec ? (
            <Cell caption={`role strong · ${rec.label}`}>
              <Redline from={rec.from} to={rec.to} role="strong" />
            </Cell>
          ) : null}
          {LEV_ROW ? (
            <Cell caption="role small · an amended term">
              <Redline from={LEV_ROW.threshold} to={`${LEV_ROW.amend?.prefix ?? ''}${fmtX(4.3)}`} role="small" />
            </Cell>
          ) : null}
        </Grid>
      </Group>
      <Group id="board-marginnote" label="MarginNote · the primitive and its tones (FX_NOTES); not rendered by any R2 screen">
        <Grid size="wide">
          <Cell caption="breach · open (counted) · Show row and Amend term at an amendable live gate" block>
            <NoteSpecimen note={NOTE_BREACH} />
          </Cell>
          <Cell caption="watch · open (counted)" block>
            <NoteSpecimen note={NOTE_WATCH} />
          </Cell>
          <Cell caption="low confidence · uploaded file (counted)" block>
            <NoteSpecimen note={NOTE_LOW} />
          </Cell>
          <Cell caption="evidence check · info, not counted · Show in memo" block>
            <NoteSpecimen note={NOTE_EVIDENCE} />
          </Cell>
          <Cell caption="restructure · info" block>
            <NoteSpecimen note={NOTE_RESTRUCTURE} />
          </Cell>
          <Cell caption="signed over · after the seal" block>
            <NoteSpecimen note={NOTE_SIGNED_OVER} />
          </Cell>
          <Cell caption="active (2px ink outline)" block>
            <NoteSpecimen note={NOTE_BREACH} active />
          </Cell>
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 16 · SectionHead · Disclosure · JsonBlock
// =============================================================================

interface HeadCase { key: string; s: SectionView | null; caption: string; aside?: SectionAside | null }
const HEAD_CASES: HeadCase[] = [
  { key: 'breach', s: FIN, caption: 'set · breach takeaway · no aside (a set card states its tool, confidence and duration in its footer line)' },
  { key: 'watch', s: RISK_UPLOAD, caption: 'set · watch takeaway (uploaded file)' },
  { key: 'info', s: PEERS_SECTION, caption: 'set · info takeaway with a basis line' },
  { key: 'pass', s: REVISION, caption: 'set · pass takeaway (Revision 2, its own outcome)' },
  { key: 'rec', s: REC_SECTION, caption: 'recommendation · the token, the sentence and the basis' },
  { key: 'rec-prior', s: REC_REV2, caption: 'recommendation · struck prior token, then the token (rev 2)' },
  { key: 'drafting', s: DRAFTING_SECTION, caption: 'drafting · status aside, no takeaway (the drafting line and caret sit in the card)' },
];

function SectionHeadBoard() {
  const [flash, setFlash] = useState(0);
  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(true);
  return (
    <Board
      id={B.sechead.id}
      name={B.sechead.name}
      spec="SectionHead (P-26): top row t-eyebrow --ink-3 step line (ellipsized) + aside · title h2 t-figure-lg --ink, 4 below · takeaway 8 below: StatusGlyph (or struck prior + Token) + t-strong --ink sentence + t-meta --ink-3 basis · keeps data-anchor, flash and highlight · Disclosure: label-sized link, chevron 90° over --dur-1, panel 0fr→1fr over --dur-2, inert when closed; an optional lead shares the trigger's line and the panel unfolds under the whole line · JsonBlock: --sunken, t-small, max 240, persistent CopyButton"
      action={
        <Button variant="secondary" size="sm" onClick={() => setFlash((n) => n + 1)}>
          Flash heading
        </Button>
      }
    >
      <Group label="SectionHead · new anatomy, from the FX_FILE_* fixtures">
        <Grid size="wide">
          {HEAD_CASES.map(({ key, s, caption, aside }) =>
            s ? (
              <Cell key={key} caption={caption} block>
                <HeadSpecimen s={s} aside={aside} anchorId={`kit-sechead-${key}`} />
              </Cell>
            ) : null,
          )}
          {FIN ? (
            <Cell caption="flash · one v2-flash on the head (press Flash heading)" block>
              <HeadSpecimen s={FIN} anchorId="kit-sechead-flash" flashKey={flash === 0 ? undefined : flash} />
            </Cell>
          ) : null}
          {FIN ? (
            <Cell caption="highlighted · the reduced-motion cue (static --sunken)" block>
              <HeadSpecimen s={FIN} anchorId="kit-sechead-highlight" highlighted />
            </Cell>
          ) : null}
        </Grid>
      </Group>
      <Group id="board-disclosure" label="Disclosure (a memo card's Record, collapsed by default)">
        <Grid size="wide">
          {FIN?.footer ? (
            <Cell caption="with lead · the Financials footer line: tool · confidence · duration, then Record (args, result, reasoning)" block>
              <FooterSpecimen f={FIN.footer} />
            </Cell>
          ) : null}
          <Cell caption={`closed · click to open (${openA ? 'open' : 'closed'})`} block>
            <Disclosure label={COPY.reasoning} meta={STUB.meta} open={openA} onToggle={() => setOpenA((o) => !o)}>
              <p className="kp-prewrap t-small kp-ink2">{STUB.reasoning}</p>
            </Disclosure>
          </Cell>
          <Cell caption={`open · click to close (${openB ? 'open' : 'closed'})`} block>
            <Disclosure label={COPY.record} meta={STUB.recordMeta} open={openB} onToggle={() => setOpenB((o) => !o)}>
              <p className="t-small kp-ink2">{`${STUB.tool} · ${STUB.meta}`}</p>
            </Disclosure>
          </Cell>
        </Grid>
      </Group>
      <Group id="board-jsonblock" label="JsonBlock + CopyButton (FX_STUB_EXTRACT, the Document Intelligence record)">
        <Grid size="wide">
          <Cell caption="args in" block>
            <JsonBlock label={STUB.argsLabel} count={STUB.argsCount} value={STUB.args} />
          </Cell>
          <Cell caption="data out" block>
            <JsonBlock label={STUB.resultLabel} count={STUB.resultCount} value={STUB.result} />
          </Cell>
          <Cell caption="CopyButton alone · Copy → Check for 1200 ms, announces Copied">
            <CopyButton text={JSON.stringify(STUB.result, null, 2)} label={COPY.copyJson} />
          </Cell>
        </Grid>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 16b · MemoCard · section cards
// =============================================================================

const LEVERAGE_ANCHOR = FIGURES.find((f) => f.mark === 'breach')?.anchorId ?? FIGURES[0]?.anchorId ?? '';

function FinancialsCard({ s, prefix, flashKey }: { s: SecOf<'financials'>; prefix: string; flashKey?: number }) {
  const rows = s.body ?? [];
  const tableRows = (group: FigureRow['group']): TableRow[] =>
    figRows(
      rows.filter((f) => f.group === group),
      prefix,
    ).map((r) => (r.anchorId === `${prefix}-${LEVERAGE_ANCHOR}` && flashKey !== undefined ? { ...r, flashKey } : r));
  return (
    <MemoCard section={s.id} ariaLabel={s.heading}>
      <HeadSpecimen s={s} anchorId={`${prefix}-${s.anchorId}`} />
      <Block label={s.blockLabels.size}>
        <Table columns={FIG_COLUMNS} rows={tableRows('size')} caption={`${s.heading} · ${s.blockLabels.size} (specimen)`} stackBelow={480} />
      </Block>
      <Block label={s.blockLabels.tested}>
        <Table columns={FIG_COLUMNS} rows={tableRows('tested')} caption={`${s.heading} · ${s.blockLabels.tested} (specimen)`} header={false} stackBelow={480} />
      </Block>
      <CardFoot s={s} />
    </MemoCard>
  );
}

function RiskCard({ s }: { s: SecOf<'risk'> }) {
  const body = s.body;
  return (
    <MemoCard section={s.id} ariaLabel={s.heading}>
      <HeadSpecimen s={s} anchorId={`kit-card-${s.anchorId}`} />
      {body ? (
        <>
          <Block label={body.scoreLabel}>
            <p className="kp-score">
              <span className="t-figure">{body.scoreText}</span>
              <span className="t-meta kp-ink3">{body.outOf}</span>
              <span className="t-body">{body.rating}</span>
              <EvidenceSpecimen ev={body.evidence} />
            </p>
            <Meter kind="risk" value={body.value} tick={body.tick} tone={body.tone} ariaLabel={`${s.heading} · ${body.scoreText}${body.outOf} · ${body.tickCaption}`} />
            <p className="t-meta kp-ink3">{body.tickCaption}</p>
          </Block>
          <Block label={body.driversLabel}>
            <ul className="kp-drivers">
              {body.drivers.map((d) => (
                <li key={d.factor} className="kp-driver">
                  <span className="t-body">{d.factor}</span>
                  <span className={`t-small ${d.tone === 'bad' ? 'kp-bad' : d.tone === 'warn' ? 'kp-warn' : d.tone === 'good' ? 'kp-good' : 'kp-ink2'}`}>{d.impact}</span>
                </li>
              ))}
            </ul>
          </Block>
        </>
      ) : null}
      <CardFoot s={s} />
    </MemoCard>
  );
}

function CovenantsCard({ s }: { s: SecOf<'covenants'> }) {
  return (
    <MemoCard section={s.id} ariaLabel={s.heading}>
      <HeadSpecimen s={s} anchorId={`kit-card-${s.anchorId}`} />
      <Block label={s.testsLabel}>
        <Table columns={COV_COLUMNS} rows={(s.body ?? []).map((c) => covRow(c))} caption={`${s.heading} (specimen card)`} stackBelow={640} />
      </Block>
      <CardFoot s={s} />
    </MemoCard>
  );
}

function RecommendationCard({ s }: { s: SecOf<'recommendation'> }) {
  const body = s.body;
  return (
    <MemoCard section={s.id} ariaLabel={s.heading}>
      <HeadSpecimen s={s} anchorId={`kit-card-${s.anchorId}`} />
      {body ? (
        <>
          <Block label={body.summaryLabel}>
            <p className="t-body kp-ink2">{body.summary}</p>
          </Block>
          <Block label={body.keyFiguresLabel}>
            <KeyFigures ariaLabel={`${body.keyFiguresLabel} (specimen card)`}>
              {body.keyFigures.map((k) => (
                <KeyFigureSpecimen key={k.anchorId} k={k} />
              ))}
            </KeyFigures>
          </Block>
          <Block label={body.aidLabel}>
            <p className="t-small kp-ink2">{body.nearestFlip}</p>
            <span>
              <LinkButton role="small" onClick={noop}>
                {body.stressLinkLabel}
              </LinkButton>
            </span>
          </Block>
        </>
      ) : null}
      <CardFoot s={s} />
    </MemoCard>
  );
}

/** How long the live-drafting specimen stays on its drafting line before its step "returns". */
const LIVE_DRAFT_MS = 1400;
const DRAFTING_ASIDE: SectionAside = { kind: 'status', state: 'drafting', text: STATUS_WORD.drafting };

/**
 * Live drafting (P-26, THREE-PANE R3), in the app's order: the card rises in (MemoCard enter) with
 * its drafting line, then writes itself in when its step returns (MemoCard reveal): the takeaway,
 * the first block and its rows, the second block (from step 6) and its rows, then the flag lines
 * and the record line. No caret here: the Caret board holds the page's one live loop.
 */
function LiveDraftSpecimen({ s, prefix }: { s: SecOf<'financials'>; prefix: string }) {
  const [set, setSet] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSet(true), LIVE_DRAFT_MS);
    return () => window.clearTimeout(t);
  }, []);
  const rows = s.body ?? [];
  const tableRows = (group: FigureRow['group']): TableRow[] => figRows(rows.filter((f) => f.group === group), prefix);
  return (
    <MemoCard section={s.id} ariaLabel={s.heading} enter reveal={set}>
      <HeadSpecimen s={set ? s : { ...s, takeaway: null }} anchorId={`${prefix}-${s.anchorId}`} aside={set ? null : DRAFTING_ASIDE} />
      {set ? (
        <>
          <div className="kp-secbody" data-reveal="">
            <Block label={s.blockLabels.size}>
              <Table columns={FIG_COLUMNS} rows={tableRows('size')} caption={`${s.heading} · ${s.blockLabels.size} (live specimen)`} stackBelow={480} />
            </Block>
            <Block label={s.blockLabels.tested}>
              <Table columns={FIG_COLUMNS} rows={tableRows('tested')} caption={`${s.heading} · ${s.blockLabels.tested} (live specimen)`} header={false} stackBelow={480} />
            </Block>
          </div>
          <div className="kp-revealfoot" data-reveal="">
            <CardFoot s={s} />
          </div>
        </>
      ) : (
        <p className="kp-draft t-small kp-ink2">{COPY.draftingLine}</p>
      )}
    </MemoCard>
  );
}

function MemoCardBoard() {
  const [flash, setFlash] = useState(0);
  const [replay, setReplay] = useState(0);
  const finUpload = sectionOf(FX_FILE_UPLOAD_GATE, 'financials');
  return (
    <Board
      id={B.memocard.id}
      name={B.memocard.name}
      spec="MemoCard (P-26): section.k-memocard, paper, 1px --line, --r-md, scroll-margin-top 60, its own container (k-memocard) · enter (a card that starts while you watch rises in once) and reveal (a card whose step just returned writes itself in) · body: padding 24 (16 under a 560px card), flex column, gap 24 · Block: t-label --ink-2 label, 8px above its table, meter or list · foot: row-less flags as one marked t-small line each (no notes block), then ONE quiet t-meta footer line with the collapsed Record · cards sit 16px apart on --canvas · an agent panel link (Covenants →) scrolls the memo to its card and flashes the head or row once, nothing else moves (P-24)"
      action={
        <>
          <Button variant="secondary" size="sm" onClick={() => setFlash((n) => n + 1)}>
            Show row
          </Button>
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setReplay((n) => n + 1)}>
            Replay
          </Button>
        </>
      }
    >
      <Group label="A memo on the canvas: one card per section (Atlas, rev 1 gate and rev 2)">
        <Cell caption="Financials (breach marked where it sits, the evidence check as a foot line; press Show row to flash total leverage) · Covenant compliance (stackBelow 640) · Recommendation rev 2 (struck prior + token) · every set card ends in its footer line and Record" block>
          <div className="kp-canvas">
            {FIN ? <FinancialsCard s={FIN} prefix="kit-card" flashKey={flash === 0 ? undefined : flash} /> : null}
            {COV_SECTION ? <CovenantsCard s={COV_SECTION} /> : null}
            {REC_REV2 ? <RecommendationCard s={REC_REV2} /> : null}
          </div>
        </Cell>
      </Group>
      <Group label="Uploaded file: a low-confidence flag has no row, so it is one marked line at the foot of its card; the footer confidence reads in bad-ink under the 75% floor">
        {RISK_UPLOAD ? (
          <div className="kp-canvas">
            <RiskCard s={RISK_UPLOAD} />
          </div>
        ) : null}
      </Group>
      <Group label="Live drafting: no skeleton cards. Before Start drafting the memo is its header alone; a card rises in when its step starts (its drafting line; the caret is on the Caret board) and writes itself in once when its step returns, in the app's order: takeaway, first block and rows, second block and rows, flag lines, record line, one --dur-stagger apart (press Replay)">
        {FIN ? (
          <div className="kp-canvas">
            <LiveDraftSpecimen key={`live-${replay}`} s={FIN} prefix="kit-live" />
          </div>
        ) : null}
      </Group>
      <Group label="Narrow card (480px frame, uploaded file): padding drops to 16, the Financials tables stack by their own width, the footer line wraps before Record">
        {finUpload ? (
          <div className="kp-frame480">
            <FinancialsCard s={finUpload} prefix="kit-narrow" />
          </div>
        ) : null}
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 16c · Agent panel · command and control (P-22, P-27)
// =============================================================================

/** One panel line, verbatim: an optional status glyph, ONE line of text, an optional link to a memo card. */
function PanelLine({ l }: { l: ThreadLine }) {
  return (
    <li className="kp-pline" data-kind={l.kind}>
      <span className="kp-pline__glyph">{l.glyph ? <StatusGlyph state={l.glyph} srLabel={STATUS_WORD[l.glyph]} /> : null}</span>
      <span className={l.kind === 'answer' ? 'kp-pline__text kp-pline__text--answer t-body' : 'kp-pline__text t-body'}>{l.text}</span>
      {l.link ? (
        <span className="kp-pline__link">
          <LinkButton role="small" onClick={noop}>
            {l.link.label}
          </LinkButton>
        </span>
      ) : null}
    </li>
  );
}

/** The agent panel rendered verbatim from an AgentPanelView: head, lines, the plan prompt, the composer. */
function PanelSpecimen({ v }: { v: AgentPanelView }) {
  const p = v.plan;
  return (
    <div className="kp-panel">
      <div className="kp-panel__head">
        <p className="kp-panel__title t-label">{v.title}</p>
      </div>
      <ol className="kp-panel__lines" aria-label={`${v.title} (specimen)`}>
        {v.lines.map((l) => (
          <PanelLine key={l.id} l={l} />
        ))}
      </ol>
      {p ? (
        <div className="kp-panel__plan">
          <p className="t-body">{p.text}</p>
          <div className="kp-row">
            <Button variant="primary" kbd={p.start.kbd} disabled={p.start.disabled} onClick={noop}>
              {p.start.label}
            </Button>
            {p.optional ? (
              <Button variant="secondary" onClick={noop}>
                {p.optional.label}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={noop}>
              {p.cancelLabel}
            </Button>
          </div>
          {p.countdown ? (
            <p className="t-meta kp-ink3">
              {p.countdown.text}
              {p.countdown.holdLabel ? (
                <>
                  {' · '}
                  <LinkButton role="meta" onClick={noop}>
                    {p.countdown.holdLabel}
                  </LinkButton>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="kp-panel__composer">
        <div className="kp-composer">
          <TextArea
            size="composer"
            value=""
            onChange={noop}
            placeholder={v.composer.placeholder}
            ariaLabel={COPY.composerLabel}
            disabled={v.composer.disabled}
            trailing={<IconButton icon={ArrowUp} label={COPY.send} variant="send" disabled onClick={noop} />}
          />
        </div>
      </div>
    </div>
  );
}

const PANEL_CASES: { key: string; v: AgentPanelView; caption: string }[] = [
  { key: 'not-started', v: FX_PANEL_NOT_STARTED, caption: 'not started · one ready line; the composer takes “draft the memo” (⌘↵ also starts)' },
  { key: 'plan', v: FX_PANEL_PLAN_REVIEW, caption: 'plan review · the plan checklist as a message in the thread (Claude Code style), Start drafting, the countdown with Hold; the memo shows its header alone until drafting starts' },
  { key: 'running', v: FX_PANEL_RUNNING, caption: 'drafting · the running step carries the static drafting glyph (the memo caret stays the only loop)' },
  { key: 'gate', v: FX_PANEL_ATLAS_GATE, caption: 'at the gate · ONE line, “Decision →” scrolls the memo to the Decision card; no token, no verbs, no note here' },
  { key: 'rev2', v: FX_PANEL_ATLAS_REV2, caption: 'rev 2 after Q&A · a typed “countersign” is refused with a pointer to the Decision card; answers clip to 2 lines' },
  { key: 'countdown', v: FX_PANEL_MERIDIAN_COUNTDOWN, caption: 'policy countdown · one line; the countdown itself fills the reviewer line on the Decision card' },
  { key: 'sealed', v: FX_PANEL_SEALED, caption: 'countersigned · the decided line links to the record on the Decision card' },
  { key: 'rejected', v: FX_PANEL_COBALT_REJECTED, caption: 'rejected after a send-back found no cure' },
];

function AgentPanelBoard() {
  return (
    <Board
      id={B.panel.id}
      name={B.panel.name}
      spec="The middle pane is command and control only (P-27): head 44 = agent · file + the collapse chevron, nothing else · one-line status lines in t-body (ellipsis on overflow; answers clip to 2 lines), an optional 16px status glyph and an optional trailing link that scrolls the memo to its card · the plan prompt and the composer at the foot · it never displays data and holds no decision: every figure, record and the whole decision live in the memo (P-23)"
    >
      <div className="kp-panels">
        {PANEL_CASES.map(({ key, v, caption }) => (
          <Cell key={key} caption={caption} block>
            <PanelSpecimen v={v} />
          </Cell>
        ))}
      </div>
    </Board>
  );
}

// =============================================================================
// Board 17 · KeyFigure · KeyFigures
// =============================================================================

function KeyFigureBoard() {
  const ink = KEYFIGS.find((k) => k.tone === 'ink') ?? null;
  const warn = KEYFIGS.find((k) => k.tone === 'warn') ?? null;
  const bad = KEYFIGS.find((k) => k.tone === 'bad') ?? null;
  return (
    <Board id={B.keyfig.id} name={B.keyfig.name} spec="KeyFigure: one button, no interactive descendants, min-height 76, label t-label --ink-3 (6px tone-mark dot), value t-heading (15/20/600) in tone ink, since the 18px role belongs to memo section titles, evidence plain t-small · KeyFigures: 1px --line frame and rules, wraps 3+2 below a 600px container">
      <Group label="KeyFigure">
        <Grid>
          {ink ? (
            <Cell caption="ink" block>
              <KeyFigureSpecimen k={ink} />
            </Cell>
          ) : null}
          {warn ? (
            <Cell caption="warn · dot" block>
              <KeyFigureSpecimen k={warn} />
            </Cell>
          ) : null}
          {bad ? (
            <Cell caption="bad · dot" block>
              <KeyFigureSpecimen k={bad} />
            </Cell>
          ) : null}
          {ink ? (
            <Cell caption="hover" block>
              <KeyFigureSpecimen k={ink} force="hover" />
            </Cell>
          ) : null}
          {ink ? (
            <Cell caption="focus" block>
              <KeyFigureSpecimen k={ink} force="focus" />
            </Cell>
          ) : null}
        </Grid>
      </Group>
      <Group label="KeyFigures strip (FX_FILE_ATLAS_GATE)">
        <Cell caption="full width · one row of 5" block>
          <KeyFigures ariaLabel="Key figures (specimen)">
            {KEYFIGS.map((k) => (
              <KeyFigureSpecimen key={k.anchorId} k={k} />
            ))}
          </KeyFigures>
        </Cell>
        <Cell caption="in a 480px frame · wraps 3+2" block>
          <div className="kp-frame480">
            <KeyFigures ariaLabel="Key figures, narrow (specimen)">
              {KEYFIGS.map((k) => (
                <KeyFigureSpecimen key={k.anchorId} k={k} />
              ))}
            </KeyFigures>
          </div>
        </Cell>
      </Group>
    </Board>
  );
}

// =============================================================================
// Board 18 · Slider
// =============================================================================

function SliderBoard() {
  const drivers = FX_STRESS_ATLAS.drivers;
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(drivers.map((d) => [d.key, d.value])));
  return (
    <Board id={B.slider.id} name={B.slider.name} spec="56px row · 4px track of flat, gapless zone segments in tone mark · 2px --ink-3 notches · boundary labels t-meta in tone ink (hidden closer than 48px or within 24px of an end) · 14px paper thumb, 2px --ink ring">
      <Grid size="wide">
        {drivers.map((d) => {
          const v = vals[d.key] ?? d.value;
          const text = fmtDriverValue({ unit: d.key === 'rate' ? 'pct' : 'usd' }, v);
          return (
            <Cell key={d.key} caption={`${d.label} · ${text}${d.key === 'debt' ? ' · Atlas debt zones, labelled boundaries' : ''}`} block>
              <Slider
                value={v}
                min={d.min}
                max={d.max}
                step={d.step}
                onChange={(n) => setVals((p) => ({ ...p, [d.key]: n }))}
                ariaLabel={d.label}
                valueText={text}
                zones={d.zones}
                boundaries={d.boundaries}
              />
            </Cell>
          );
        })}
      </Grid>
    </Board>
  );
}

// =============================================================================
// Board 18b · Decision card (memo): the ONE place to decide (P-23)
// =============================================================================

/**
 * The memo's Decision card rendered verbatim from a SignatureView, in the owner-approved order:
 * signed over, reviewer note, amendment summary, the call directly above the verbs, the verbs in
 * one horizontal row (it may wrap; never a vertical list) with a consequence under each, the
 * attestation and the policy line, then the signature lines, which become the sealed record.
 */
function DecisionSpecimen({ v, anchor }: { v: SignatureView; anchor: string }) {
  const [note, setNote] = useState(v.note?.value ?? '');
  const [checksOpen, setChecksOpen] = useState(false);
  const sealed = v.sealed;
  return (
    <MemoCard section="signature" ariaLabel={v.heading}>
      <SectionHead eyebrow={v.eyebrow} heading={v.heading} anchorId={anchor} />
      {v.signedOver.length > 0 || !sealed ? (
        <div className="kp-block">
          <p className="kp-block__label t-label">{v.signedOverLabel}</p>
          {v.signedOver.length > 0 ? (
            <ul className="kp-signedover">
              {v.signedOver.map((o) => (
                <li key={o.noteId} className="kp-signedover__row">
                  <StatusLabel state={o.state} role="small">
                    {o.text}
                  </StatusLabel>
                  {o.cleared ? <span className="t-meta kp-ink3">{COPY.clearedByAmendment}</span> : null}
                  <LinkButton role="label" onClick={noop}>
                    {o.linkLabel}
                  </LinkButton>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {v.note ? (
        <div className="kp-block">
          <div className="kp-row">
            <p className="t-label kp-ink2">{v.note.label}</p>
            <LinkButton role="label" disabled={v.note.draftDisabled} onClick={noop}>
              {v.note.draftLabel}
            </LinkButton>
            {v.note.chip ? <Chip>{v.note.chip}</Chip> : null}
          </div>
          <TextArea value={note} onChange={setNote} placeholder={v.note.placeholder} ariaLabel={v.note.label} />
        </div>
      ) : null}
      {v.amendment ? (
        <div className="kp-row">
          <span className="t-small">{v.amendment.text}</span>
          <Token tone={v.amendment.token.tone}>{v.amendment.token.word}</Token>
          <LinkButton role="small" onClick={noop}>
            {v.amendment.revertLabel}
          </LinkButton>
          <LinkButton role="small" onClick={noop}>
            {v.amendment.editLabel}
          </LinkButton>
        </div>
      ) : null}
      {v.call && v.verbs ? (
        <div className="kp-decide">
          <div className="kp-call">
            <p className="kp-call__lead t-label kp-ink3">
              <span>{v.call.lead}</span>
              <Token tone={v.call.token.tone}>{v.call.token.word}</Token>
            </p>
            <p className="t-heading">{v.call.title}</p>
            <p className="t-small kp-ink2">{v.call.why}</p>
          </div>
          <ul className="kp-verbs">
            <li className="kp-verb">
              <Button variant="primary" kbd={v.verbs.kbd.sign} disabled={v.verbs.disabled} onClick={noop}>
                {v.verbs.primary}
              </Button>
              <span className="t-small kp-ink2">{v.verbs.notes.sign}</span>
            </li>
            <li className="kp-verb">
              <Button variant="secondary" kbd={v.verbs.kbd.ret} disabled={v.verbs.disabled} onClick={noop}>
                {v.verbs.returnLabel}
              </Button>
              <span className="t-small kp-ink2">{v.verbs.notes.ret}</span>
            </li>
            <li className="kp-verb">
              <Button variant="danger" kbd={v.verbs.kbd.rej} disabled={v.verbs.disabled} onClick={noop}>
                {v.verbs.rejectLabel}
              </Button>
              <span className="t-small kp-ink2">{v.verbs.notes.rej}</span>
            </li>
          </ul>
          {v.attestation ? <p className="t-meta kp-ink3">{v.attestation}</p> : null}
          <div className="kp-row">
            <span className="t-meta kp-ink3">{v.policy.line}</span>
          </div>
          {v.policy.checks ? (
            <Disclosure label={COPY.showChecks} open={checksOpen} onToggle={() => setChecksOpen((o) => !o)}>
              <ul className="kp-checks">
                {v.policy.checks.map((c) => (
                  <li key={c.text}>
                    <StatusLabel state={c.ok ? 'pass' : 'breach'} role="small">
                      {c.text}
                    </StatusLabel>
                  </li>
                ))}
              </ul>
            </Disclosure>
          ) : null}
        </div>
      ) : null}
      {v.record ? (
        <StatusLabel state={v.record.state} role="strong">
          {v.record.headline}
        </StatusLabel>
      ) : null}
      <div className="kp-siglines">
        <SignatureLine role="agent" state="pre-signed" text={v.agent.text} caption={v.agent.caption} />
        <SignatureLine
          role="reviewer"
          state={v.reviewer.sigState}
          ink={v.reviewer.ink}
          text={v.reviewer.autoText ?? undefined}
          rejectedWord={v.reviewer.rejectedWord ?? undefined}
          fillMs={v.reviewer.fillMs}
          caption={v.reviewer.caption}
        />
      </div>
      {sealed ? (
        <div className="kp-block">
          {sealed.quote ? <p className="t-small kp-ink2">{sealed.quote}</p> : null}
          {sealed.provenance ? <p className="t-meta kp-ink3">{sealed.provenance}</p> : null}
          {sealed.routed ? (
            <p className="t-small">
              {`${sealed.routed} · `}
              {sealed.routedLinkLabel ? (
                <LinkButton role="small" onClick={noop}>
                  {sealed.routedLinkLabel}
                </LinkButton>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}
    </MemoCard>
  );
}

const DECISION_CASES: { key: string; v: SignatureView; caption: string }[] = [
  { key: 'gate', v: FX_SIG_ATLAS_GATE, caption: 'Atlas rev 1 gate · the call (always the agent’s own token) directly above the verbs; one row of verbs, a consequence under each; attestation and policy line under the verbs' },
  { key: 'amended', v: FX_SIG_ATLAS_AMENDED, caption: 'amended in place on the covenant row · the amendment summary with Revert and Edit in memo; the lead token still reads the agent’s ESCALATE' },
  { key: 'rev2', v: FX_SIG_ATLAS_REV2, caption: 'rev 2 on the revised structure · policy on, not eligible (Show checks)' },
  { key: 'cobalt', v: FX_SIG_COBALT_GATE, caption: 'Cobalt rev 1 · DECLINE, five notes to sign over' },
  { key: 'sealed', v: FX_SIG_SEALED, caption: 'countersigned · the same card becomes the sealed record: no verbs, no note field; headline, ink, quote, provenance, routed line' },
];

function DecisionCardBoard() {
  return (
    <Board
      id={B.decision.id}
      name={B.decision.name}
      spec="The Decision card is a MemoCard (data-section signature) right after step 5 Recommendation, before the stress test: the ONE place to decide (P-23). Order: Signed over (Show row) · reviewer note (Draft from notes + provenance chip; optional to countersign, required to return or reject) · amendment summary · the call (lead + Token + question + one-sentence reason) directly above the verbs · the verbs in one horizontal row that may wrap, never a vertical list, each with its one-line consequence · attestation and policy line · the signature lines, which become the sealed record. The agent panel only links here (Decision →)."
    >
      <div className="kp-canvas">
        {DECISION_CASES.map(({ key, v, caption }) => (
          <Cell key={key} caption={caption} block>
            <DecisionSpecimen v={v} anchor={`kit-decision-${key}`} />
          </Cell>
        ))}
      </div>
    </Board>
  );
}

// =============================================================================
// Board 19 · SignatureLine
// =============================================================================

function SignatureBoard() {
  const [replay, setReplay] = useState(0);
  const agent = FX_SIG_ATLAS_GATE.agent;
  return (
    <Board
      id={B.sig.id}
      name={B.sig.name}
      spec="The signature lines at the foot of the memo's Decision card (P-01): pad 40 + rule · open reviewer line = 2px --accent (the only 2px teal stroke on app screens), the record awaiting ink and never a control: the verbs directly above it sign (P-23) · ink: fixed 200×40 svg, --ink 2px, v2-ink over --dur-3 · countdown fill v2-fill over AUTO_COUNTDOWN_MS · caption t-meta --ink-3, a sibling of the line (P-11, P-20)"
      action={
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setReplay((n) => n + 1)}>
          Replay
        </Button>
      }
    >
      <Grid size="wide">
        <Cell caption="agent · pre-signed" block>
          <div className="kp-sig">
            <SignatureLine role="agent" state="pre-signed" text={agent.text} caption={agent.caption} />
          </div>
        </Cell>
        <Cell caption="reviewer · open · the record awaiting ink (no onActivate: clicking it does nothing)" block>
          <div className="kp-sig">
            <SignatureLine
              role="reviewer"
              state="open"
              caption={FX_SIG_ATLAS_GATE.reviewer.caption}
            />
          </div>
        </Cell>
        <Cell caption="reviewer · countdown · the line fills over 5 s (press Replay)" block>
          <div className="kp-sig">
            <SignatureLine
              key={`countdown-${replay}`}
              role="reviewer"
              state="countdown"
              fillMs={FX_SIG_MERIDIAN_COUNTDOWN.reviewer.fillMs}
              caption={FX_SIG_MERIDIAN_COUNTDOWN.reviewer.caption}
            />
          </div>
        </Cell>
        <Cell caption="reviewer · held" block>
          <div className="kp-sig">
            <SignatureLine role="reviewer" state="held" caption={HOLD_CAPTION.engaged} />
          </div>
        </Cell>
        <Cell caption="reviewer · signed · ink animates (press Replay)" block>
          <div className="kp-sig">
            <SignatureLine key={`signed-${replay}`} role="reviewer" state="signed" ink="animate" caption={FX_SIG_SEALED.reviewer.caption} />
          </div>
        </Cell>
        <Cell caption="reviewer · signed · static ink (a sealed file on a later visit)" block>
          <div className="kp-sig">
            <SignatureLine role="reviewer" state="signed" ink="static" caption={FX_SIG_SEALED.reviewer.caption} />
          </div>
        </Cell>
        <Cell caption="reviewer · signed-auto · /auto/, never ink" block>
          <div className="kp-sig">
            <SignatureLine
              role="reviewer"
              state="signed-auto"
              text={FX_SIG_AUTO_SEALED.reviewer.autoText ?? COPY.autoSignature}
              caption={FX_SIG_AUTO_SEALED.reviewer.caption}
            />
          </div>
        </Cell>
        <Cell caption="reviewer · rejected · 1px --bad-ink rule + REJECTED token" block>
          <div className="kp-sig">
            <SignatureLine
              role="reviewer"
              state="rejected"
              rejectedWord={FX_SIG_REJECTED.reviewer.rejectedWord ?? REJECTED_WORD}
              caption={FX_SIG_REJECTED.reviewer.caption}
            />
          </div>
        </Cell>
        <Cell caption="reviewer · returned (the line of a revision sent back)" block>
          <div className="kp-sig">
            <SignatureLine role="reviewer" state="returned" caption={FX_SIG_ATLAS_REV2.returned[0]?.text ?? STATUS_WORD.returned} />
          </div>
        </Cell>
      </Grid>
    </Board>
  );
}

// =============================================================================
// Board 20 · Caret
// =============================================================================

function CaretBoard() {
  return (
    <Board id={B.caret.id} name={B.caret.name} spec="2×14 --accent, margin-left 4, v2-caret over --dur-caret, steps(1), infinite: the single loop in V2 (P-06), at the end of the memo's drafting card line; no agent panel line animates · Preview reduced motion stops it">
      <Cell caption="the single live loop specimen on this page · the drafting card from FX_FILE_RUNNING (t-small --ink-2 line, caret at its end)" block>
        {DRAFTING_SECTION ? (
          <div className="kp-canvas">
            <MemoCard section={DRAFTING_SECTION.id} ariaLabel={DRAFTING_SECTION.heading}>
              <HeadSpecimen s={DRAFTING_SECTION} anchorId={`kit-caret-${DRAFTING_SECTION.anchorId}`} />
              <p className="kp-draft t-small kp-ink2">
                {DRAFTING_SECTION.drafting?.line ?? COPY.draftingLine}
                {DRAFTING_SECTION.drafting?.caret ? <Caret /> : null}
              </p>
            </MemoCard>
          </div>
        ) : null}
      </Cell>
    </Board>
  );
}

// =============================================================================
// Board 21 · EmptyNote · DropZone · LiveRegion
// =============================================================================

function EmptyDropLiveBoard() {
  const [message, setMessage] = useState<string>(GATE.docBar.status.text);
  const rest = FX_DESK_INITIAL.drop;
  const off = FX_DESK_ATLAS_GATE.drop;
  return (
    <Board id={B.empty.id} name={B.empty.name} spec="EmptyNote t-small --ink-3, padding 16, optional glyph · DropZone 64, --line-provisional, --r-md; drag-over = --line-provisional-active + --accent-wash; disabled = --sunken + the reason · LiveRegion: visually hidden, aria-live polite">
      <Group label="EmptyNote">
        <Grid size="wide">
          <Cell caption="plain">
            <EmptyNote>{COPY.ledgerEmpty}</EmptyNote>
          </Cell>
          <Cell caption="with a status glyph">
            <EmptyNote state="pending">{COPY.firstSweepPending}</EmptyNote>
          </Cell>
        </Grid>
      </Group>
      <Group id="board-dropzone" label="DropZone">
        <Grid size="wide">
          <Cell caption="rest · drop a PDF or choose a file (the kit page only announces its name)" block>
            <DropZone label={rest.label} sub={rest.sub} chooseLabel={rest.chooseLabel} disabledReason={rest.disabledReason} onFile={(f) => setMessage(f.name)} />
          </Cell>
          <Cell caption="over · drag-over state" block>
            <DropZone label={rest.label} sub={rest.sub} chooseLabel={rest.chooseLabel} disabledReason={null} onFile={noop} force="hover" />
          </Cell>
          <Cell caption="disabled · a live run" block>
            <DropZone label={off.label} sub={off.sub} chooseLabel={off.chooseLabel} disabledReason={off.disabledReason} onFile={noop} />
          </Cell>
        </Grid>
      </Group>
      <Group id="board-liveregion" label="LiveRegion">
        <Cell caption={`LiveRegion is visually hidden; it currently announces: “${message}”`}>
          <LiveRegion message={message} />
          <span className="t-small kp-ink2">{message}</span>
        </Cell>
      </Group>
    </Board>
  );
}

// =============================================================================
// Boards 22–23 · Pending review · Previously rejected
// =============================================================================

const PENDING_COLUMNS: TableColumn[] = [
  { key: 'id', label: 'Id', width: '64px' },
  { key: 'pattern', label: 'Pattern', width: '1fr' },
  { key: 'type', label: 'Type', width: '104px' },
  { key: 'proposed', label: 'Proposed', width: '160px' },
  { key: 'status', label: 'Status', width: '160px' },
  { key: 'view', label: 'View', width: '96px' },
];
const REVIEW_STATUS: Record<PendingPattern['status'], { state: StatusKey; word: string }> = {
  awaiting: { state: 'pending', word: 'Awaiting approval' },
  approved: { state: 'pass', word: 'Approved' },
  rejected: { state: 'rejected', word: 'Rejected' },
};

function PendingBoard() {
  const approved = PENDING.filter((p) => p.status === 'approved').length;
  const rows: TableRow[] = PENDING.map((p) => {
    const st = REVIEW_STATUS[p.status];
    return {
      key: p.id,
      height: 56,
      cells: {
        id: <span className="t-label">{p.id}</span>,
        pattern: (
          <span className="kp-pattern">
            <span className="t-strong">{p.name}</span>
            <span className="t-small kp-ink2">{p.description}</span>
            <span className="t-meta kp-ink3">{p.evidence}</span>
          </span>
        ),
        type: <span className="t-small">{p.type}</span>,
        proposed: <span className="t-small kp-ink2">{`${p.proposedBy} · ${p.proposedDate}`}</span>,
        status: (
          <span className="kp-pattern">
            <StatusLabel state={st.state} role="small">
              {st.word}
            </StatusLabel>
            {p.status === 'rejected' && p.ownerNote ? <span className="t-small kp-ink2">{p.ownerNote}</span> : null}
          </span>
        ),
        view: p.kitAnchor ? (
          <LinkButton role="small" href={p.kitAnchor}>
            View in kit
          </LinkButton>
        ) : (
          <span className="t-small kp-ink3">–</span>
        ),
      },
    };
  });
  return (
    <section id={B.pending.id} className="kp-board" aria-labelledby="pending-h">
      <div className="kp-board__titles">
        <h2 id="pending-h" className="t-heading">
          {B.pending.name}
        </h2>
        <p className="t-small kp-ink2">{`${plural(PENDING.length, 'pattern')} · ${approved} approved`}</p>
      </div>
      <Table columns={PENDING_COLUMNS} rows={rows} caption="Patterns pending owner review" stackBelow={760} />
    </section>
  );
}

function RejectedBoard() {
  return (
    <section id={B.rejected.id} className="kp-board" aria-labelledby="rejected-h">
      <div className="kp-board__titles">
        <h2 id="rejected-h" className="t-heading">
          {B.rejected.name}
        </h2>
        <p className="t-small kp-ink2">Owner decisions from V1 and from the V2 build. V2 does not resurrect them.</p>
      </div>
      <ul className="kp-rejected">
        {REJECTED_BEFORE.map((r) => (
          <li key={r.name} className="kp-rejected__item">
            <span className="t-strong">{r.name}</span>
            <span className="t-small kp-ink2">{r.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// =============================================================================
// The page
// =============================================================================

export default function KitPage() {
  const [reduce, setReduce] = useState(false);
  const [tokens, setTokens] = useState<Tokens>({});

  // The preview switch toggles data-reduce-motion on <html> (local state only), then every token
  // is re-read, so the motion table shows the zeroed durations while the preview is on.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-reduce-motion', reduce);
    const cs = getComputedStyle(root);
    const next: Tokens = {};
    for (const name of TOKEN_NAMES) next[name] = cs.getPropertyValue(name).trim();
    setTokens(next);
  }, [reduce]);
  useEffect(() => () => document.documentElement.removeAttribute('data-reduce-motion'), []);
  // The page renders after load, so a deep link (/?kit#pending) is scrolled to once it exists.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <div className="kp-shell">
      <header className="kp-top">
        <h1 className="kp-brand t-heading">
          <BrandMark />
          <span className="kp-brand__word">{`${COPY.brand} V2 · Kit`}</span>
        </h1>
        <div className="kp-top__right">
          <LinkButton role="label" href="/">
            Open the app
          </LinkButton>
          <span className="kp-top__wide">
            <LinkButton role="label" href="/?v=1" newTab>
              {COPY.compareV1}
            </LinkButton>
          </span>
          <span className="kp-divider" aria-hidden="true" />
          <span className="kp-motion">
            <span className="kp-top__wide t-label" aria-hidden="true">
              Preview reduced motion
            </span>
            <Switch checked={reduce} onChange={setReduce} ariaLabel="Preview reduced motion" />
          </span>
        </div>
      </header>
      <div className="kp-scroll">
        <div className="kp-body">
          <nav className="kp-index" aria-label="Boards">
            <ol className="kp-index__list">
              {INDEX.map((b) => (
                <li key={b.id}>
                  <LinkButton role="small" href={`#${b.id}`}>
                    {b.name}
                  </LinkButton>
                </li>
              ))}
            </ol>
          </nav>
          <main className="kp-boards">
            <TypeBoard tokens={tokens} />
            <ColourBoard tokens={tokens} />
            <LinesBoard tokens={tokens} />
            <RadiiBoard tokens={tokens} />
            <MotionBoard tokens={tokens} />
            <ButtonBoard />
            <IconLinkKbdBoard />
            <TokenChipBoard />
            <StatusBoard />
            <TipCiteEvidenceBoard />
            <FieldsBoard />
            <NavBoard />
            <MeterBoard />
            <TableBoard />
            <NotesBoard />
            <SectionHeadBoard />
            <MemoCardBoard />
            <AgentPanelBoard />
            <KeyFigureBoard />
            <SliderBoard />
            <DecisionCardBoard />
            <SignatureBoard />
            <CaretBoard />
            <EmptyDropLiveBoard />
            <PendingBoard />
            <RejectedBoard />
          </main>
        </div>
      </div>
    </div>
  );
}
