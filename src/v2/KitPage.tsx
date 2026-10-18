// ---------------------------------------------------------------------------
// Countersign V2 · the live kit page (/?kit, spec §12).
// Built only from the real kit (./kit) and the model's formatters, words and
// FX_* fixtures, so the page cannot drift from the app. Popovers render open
// through `specimen`; hover, focus and active states through `force`. Token
// values and contrast ratios are read live from the tokens on <html>.
// The kit page is exempt from the one-primary and one-loop rules of app routes.
// ---------------------------------------------------------------------------
import './kitpage.css';
import { Fragment, useEffect, useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, ArrowUpRight, Copy, Download, FileStack, FileText, RotateCcw, ScrollText, Search, X } from 'lucide-react';
import {
  AmendField,
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
  FX_FILE_SEALED,
  FX_FILE_UPLOAD_GATE,
  FX_LEDGER_AFTER_ATLAS,
  FX_SIG_ATLAS_GATE,
  FX_SIG_ATLAS_REV2,
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
import type { CovenantRow, CushionView, EvidenceView, FileView, KeyFigureView, NoteView, SectionView } from './model';
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
const findNote = (notes: NoteView[], kind: NoteView['kind']): NoteView | null => notes.find((n) => n.kind === kind) ?? null;

const GATE = FX_FILE_ATLAS_GATE;
const REC = sectionOf(GATE, 'recommendation')?.body ?? null;
const KEYFIGS: KeyFigureView[] = REC?.keyFigures ?? [];
const FIN = sectionOf(GATE, 'financials');
const FIGURES = FIN?.body ?? [];
const STUB = FIN?.stub ?? null;
const RISK = sectionOf(GATE, 'risk')?.body ?? null;
const COV_SECTION = sectionOf(GATE, 'covenants');
const COVENANTS: CovenantRow[] = COV_SECTION?.body ?? [];
const REVISION = sectionOf(FX_FILE_ATLAS_REV2, 'revision');
const REDLINE = REVISION?.body?.redline ?? [];
const DRAFTING = FX_FILE_RUNNING.sections.find((s) => s.drafting !== null)?.drafting ?? null;

const NOTE_BREACH = findNote(GATE.toReview, 'breach');
const NOTE_WATCH = findNote(GATE.toReview, 'watch');
const NOTE_LOW = findNote(FX_FILE_UPLOAD_GATE.toReview, 'low-confidence');
const NOTE_EVIDENCE = GATE.headerMargin.evidenceCheck;
const NOTE_RETURNED = findNote(REVISION?.notes ?? [], 'send-back');
const NOTE_RESTRUCTURE = findNote(REVISION?.notes ?? [], 'restructure');
const NOTE_SIGNED_OVER = FX_FILE_SEALED.toReview.find((n) => n.tone === 'signed-over') ?? null;

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
  keyfig: { id: 'board-keyfigure', name: 'KeyFigure · KeyFigures' },
  slider: { id: 'board-slider', name: 'Slider' },
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
  heading: COPY.countersignature,
  body: REC?.sentence ?? COPY.pendingRecommendation,
  strong: COVENANTS[0]?.name ?? COPY.countersignature,
  control: FX_SIG_ATLAS_GATE.verbs?.primary ?? COPY.draftMemo,
  small: NOTE_BREACH?.meta ?? COPY.evidenceCheckMeta,
  label: COPY.noteLabel,
  meta: FX_SIG_SEALED.reviewer.caption,
  eyebrow: COPY.eyebrow,
  figure: `${fmtX(4.26)} · ${fmtM(96.3)} · ${fmtPct(17.6)}`,
  'figure-lg': KEYFIGS[0]?.value ?? fmtM(128.4),
  token: FX_TOKENS.escalate.word,
};
const TYPE_USE: Record<TypeRole, string> = {
  display: 'One per screen',
  heading: 'Memo sections, Countersignature, Ledger groups, brand',
  body: 'Memo prose, UI copy, table cells',
  strong: 'Row subjects, signed-over items, /s/ lines',
  control: 'md buttons, tabs, menu rows',
  small: 'Margin notes, attestation, sub-lines, evidence tags',
  label: 'Column headers, field labels, sm buttons',
  meta: 'Timestamps, captions, simulated disclosures, Kbd, chips',
  eyebrow: 'At most one per region',
  figure: 'Every numeral in tables and prose',
  'figure-lg': 'Key-figure values, risk score',
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
            <IconButton icon={FileText} label={COPY.record} pressed={pressed} onClick={() => setPressed((p) => !p)} />
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
              {COPY.trace}
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
    <Board id={B.fields.id} name={B.fields.name} spec="Fields: paper, 1px --ink-3 control edge, --r-sm; focus = --accent edge + --halo-focus; invalid = --bad-ink + --halo-error · AmendField: --line-provisional-edge (P-05) · Switch: ink track when on (P-10)">
      <Group label="TextArea">
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
  { id: 'sign', label: 'Countersign', section: 'Live file', hint: `${GATE.docBar.fileName} · rev ${GATE.revision}`, kbd: FX_SIG_ATLAS_GATE.verbs?.kbd.sign ?? 'A', run: noop },
  { id: 'go-signature', label: COPY.goToSignature, section: 'Live file', hint: GATE.docBar.fileName, run: noop },
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
          <Tabs items={FX_TOPBAR.tabs} active={tab} onSelect={setTab} ariaLabel="Sections (specimen)" />
        </div>
      </Group>
      <Group label="NavItem (sidebar navigation, P-21; click to switch)">
        <div className="kp-navframe">
          {FX_TOPBAR.tabs.map((t) => (
            <NavItem
              key={t.id}
              icon={t.id === 'book' ? Activity : t.id === 'ledger' ? ScrollText : FileStack}
              label={t.label}
              count={t.count}
              countTone={t.countTone}
              active={t.id === tab}
              onClick={() => setTab(t.id)}
            />
          ))}
          <NavItem icon={FileStack} label="Hover (forced)" force="hover" onClick={() => undefined} />
          <NavItem icon={FileStack} label="Focus (forced)" force="focus" onClick={() => undefined} />
          <NavItem icon={Activity} label="Compact (icon rail)" count="7" countTone="warn" compact onClick={() => undefined} />
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

const COV_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Covenant', width: '1fr' },
  { key: 'threshold', label: 'Threshold', width: '104px', align: 'end' },
  { key: 'actual', label: 'Actual', width: '88px', align: 'end' },
  { key: 'cushion', label: 'Cushion', width: '144px', hideBelow: 760 },
  { key: 'status', label: 'Status', width: '104px' },
];
const covRow = (c: CovenantRow, extra: Partial<TableRow> = {}): TableRow => ({
  key: c.anchorId,
  height: 36,
  anchorId: `kit-${c.anchorId}`,
  cells: {
    name: <span className="t-strong">{c.name}</span>,
    threshold: c.threshold,
    actual: c.actual,
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
        meta: COV_SECTION?.suffix ?? undefined,
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
      spec="Header 36 --sunken t-label --ink-3 · rows 36/48/56 with a 1px --line rule · cells 8 12 · group rows 32/40 · indent 24 · highlighted = --sunken · flash = v2-flash · stackBelow 760 is a container query"
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
        <Cell caption="stacked · stackBelow 760 in a fixed 360px frame (header hides, cells stack with their labels)" block>
          <div className="kp-frame360">
            <Table columns={COV_COLUMNS} rows={COVENANTS.map((c) => covRow(c))} caption="Covenant compliance, stacked (specimen)" stackBelow={760} />
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
    <Board id={B.notes.id} name={B.notes.name} spec="Redline: old --ink-3 struck, arrow --ink-3, new --ink · MarginNote: --r-md, padding 12, 1px --line; breach on --bad-wash, watch and returned on --warn-wash, info and signed-over on paper; active = 2px --ink outline; enters with v2-enter (P-03)">
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
      <Group id="board-marginnote" label="MarginNote">
        <Grid size="wide">
          <Cell caption="breach · open (counted, with Amend term)" block>
            <NoteSpecimen note={NOTE_BREACH} />
          </Cell>
          <Cell caption="watch · open (counted)" block>
            <NoteSpecimen note={NOTE_WATCH} />
          </Cell>
          <Cell caption="low confidence · uploaded file (counted)" block>
            <NoteSpecimen note={NOTE_LOW} />
          </Cell>
          <Cell caption="evidence check · info, not counted" block>
            <NoteSpecimen note={NOTE_EVIDENCE} />
          </Cell>
          <Cell caption="returned · Revision 2" block>
            <NoteSpecimen note={NOTE_RETURNED} />
          </Cell>
          <Cell caption="restructure · info" block>
            <NoteSpecimen note={NOTE_RESTRUCTURE} />
          </Cell>
          <Cell caption="signed over · after the seal" block>
            <NoteSpecimen note={NOTE_SIGNED_OVER} />
          </Cell>
          <Cell caption="active · its covenant row is hovered (2px ink outline)" block>
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

function SectionHeadBoard() {
  const [flash, setFlash] = useState(0);
  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(true);
  const running = FX_FILE_RUNNING.sections;
  const head = (kind: SectionView['kind'], from: SectionView[]) => from.find((s) => s.kind === kind) ?? null;
  const rec = head('recommendation', running);
  const drafting = running.find((s) => s.phase === 'drafting') ?? null;
  const fin = head('financials', GATE.sections);
  const peers = head('peers', GATE.sections);
  const risk = head('risk', GATE.sections);
  const cov = head('covenants', GATE.sections);
  const specimens: { key: string; s: SectionView | null; status: StatusKey; caption: string }[] = [
    { key: 'pending', s: rec, status: 'pending', caption: 'pending' },
    { key: 'drafting', s: drafting, status: 'drafting', caption: 'drafting' },
    { key: 'done', s: fin, status: 'done', caption: 'done' },
    { key: 'excluded', s: peers, status: 'excluded', caption: 'excluded (skipped at plan review)' },
    { key: 'error', s: risk, status: 'error', caption: 'error (stopped)' },
  ];
  return (
    <Board
      id={B.sechead.id}
      name={B.sechead.name}
      spec="SectionHead 28, grid [24 ordinal t-figure --ink-3 | 1fr t-heading h2 | 16 glyph] · Disclosure: label-sized link, chevron 90° over --dur-1, panel 0fr→1fr over --dur-2, inert when closed · JsonBlock: --sunken, t-small, max 240, persistent CopyButton"
      action={
        <Button variant="secondary" size="sm" onClick={() => setFlash((n) => n + 1)}>
          Flash heading
        </Button>
      }
    >
      <Group label="SectionHead">
        <Grid size="wide">
          {specimens.map(({ key, s, status, caption }) =>
            s ? (
              <Cell key={key} caption={caption} block>
                <SectionHead ordinal={s.ordinal} heading={s.heading} suffix={null} status={status} statusLabel={STATUS_WORD[status]} anchorId={`kit-sechead-${key}`} />
              </Cell>
            ) : null,
          )}
          {cov ? (
            <Cell caption="done + suffix · flash (press Flash heading)" block>
              <SectionHead ordinal={cov.ordinal} heading={cov.heading} suffix={cov.suffix} status="done" statusLabel={STATUS_WORD.done} anchorId="kit-sechead-flash" flashKey={flash === 0 ? undefined : flash} />
            </Cell>
          ) : null}
          {cov ? (
            <Cell caption="highlighted (reduced-motion cue)" block>
              <SectionHead ordinal={cov.ordinal} heading={cov.heading} suffix={cov.suffix} status="done" statusLabel={STATUS_WORD.done} anchorId="kit-sechead-highlight" highlighted />
            </Cell>
          ) : null}
        </Grid>
      </Group>
      <Group id="board-disclosure" label="Disclosure">
        <Grid size="wide">
          <Cell caption={`closed · click to open (${openA ? 'open' : 'closed'})`} block>
            <Disclosure label={COPY.reasoning} meta={STUB?.meta} open={openA} onToggle={() => setOpenA((o) => !o)}>
              <p className="t-small kp-ink2">{STUB?.reasoning ?? ''}</p>
            </Disclosure>
          </Cell>
          <Cell caption={`open · click to close (${openB ? 'open' : 'closed'})`} block>
            <Disclosure label={COPY.record} meta={STUB?.recordMeta} open={openB} onToggle={() => setOpenB((o) => !o)}>
              <p className="t-small kp-ink2">{STUB ? `${STUB.tool} · ${STUB.meta}` : ''}</p>
            </Disclosure>
          </Cell>
        </Grid>
      </Group>
      <Group id="board-jsonblock" label="JsonBlock + CopyButton (Document Intelligence record)">
        {STUB ? (
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
        ) : null}
      </Group>
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
    <Board id={B.keyfig.id} name={B.keyfig.name} spec="KeyFigure: one button, no interactive descendants, min-height 76, label t-label --ink-3 (6px tone-mark dot), value t-figure-lg in tone ink, evidence plain t-small · KeyFigures: 1px --line frame and rules, wraps 3+2 below a 600px container">
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
// Board 19 · SignatureLine
// =============================================================================

function SignatureBoard() {
  const [replay, setReplay] = useState(0);
  const [signedNow, setSignedNow] = useState(false);
  const agent = FX_SIG_ATLAS_GATE.agent;
  return (
    <Board
      id={B.sig.id}
      name={B.sig.name}
      spec="Pad 40 + rule · open reviewer line = 2px --accent (the only 2px teal stroke on app screens) · ink: fixed 200×40 svg, --ink 2px, v2-ink over --dur-3 · countdown fill v2-fill over AUTO_COUNTDOWN_MS · caption t-meta --ink-3, a sibling of the hit area (P-01, P-11, P-20)"
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
        <Cell caption={signedNow ? 'reviewer · signed from the open line (ink animates on the transition)' : 'reviewer · open · click or Enter to sign the specimen'} block>
          <div className="kp-sig">
            <SignatureLine
              role="reviewer"
              state={signedNow ? 'signed' : 'open'}
              ink={signedNow ? 'animate' : 'none'}
              caption={
                signedNow ? (
                  <LinkButton role="meta" onClick={() => setSignedNow(false)}>
                    Reset the specimen
                  </LinkButton>
                ) : (
                  FX_SIG_ATLAS_GATE.reviewer.caption
                )
              }
              onActivate={() => setSignedNow(true)}
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
              onActivate={noop}
            />
          </div>
        </Cell>
        <Cell caption="reviewer · held" block>
          <div className="kp-sig">
            <SignatureLine role="reviewer" state="held" caption={HOLD_CAPTION.engaged} onActivate={noop} />
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
    <Board id={B.caret.id} name={B.caret.name} spec="2×14 --accent, margin-left 4, v2-caret over --dur-caret, steps(1), infinite: the single loop in V2 (P-06) · Preview reduced motion stops it">
      <Cell caption="the single live loop specimen on this page · drafting text from FX_FILE_RUNNING" block>
        <p className="kp-draft t-body">
          {DRAFTING?.text ?? COPY.pendingSection}
          <Caret />
        </p>
        {DRAFTING?.callLine ? <p className="t-small kp-ink2">{DRAFTING.callLine}</p> : null}
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
        <p className="t-small kp-ink2">Owner decisions carried over from V1. V2 does not resurrect them.</p>
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
          <span aria-hidden="true">◧</span>
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
            <KeyFigureBoard />
            <SliderBoard />
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
