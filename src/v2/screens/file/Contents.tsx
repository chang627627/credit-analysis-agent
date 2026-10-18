// ---------------------------------------------------------------------------
// Case file · the Contents row (spec §7.2 "Contents row"): the plan as the
// memo's table of contents, before any drafting. Not started: a read-only
// preview and the primary "Draft memo". Plan review: optional steps toggle,
// required steps are locked, "Start drafting" approves the plan as edited and
// the unattended countdown (armed only on screen) can be held.
// ---------------------------------------------------------------------------

import { Button, Checkbox, Chip, LinkButton, SectionHead, Table } from '../../kit';
import type { TableColumn, TableRow } from '../../kit';
import { COPY } from '../../model';
import type { ContentsView } from '../../model';
import type { FileCtx } from './FileScreen';

const OPEN_SOURCE = 'Open source';

const COLUMNS: TableColumn[] = [
  { key: 'include', label: 'Include', width: '32px', srOnlyLabel: true },
  { key: 'ordinal', label: 'Section', width: '24px', srOnlyLabel: true },
  { key: 'step', label: 'Step', width: '1fr', srOnlyLabel: true },
  { key: 'tool', label: 'Tool', width: '144px', align: 'end', srOnlyLabel: true, hideBelow: 1120 },
  { key: 'tag', label: 'Requirement', width: '208px', align: 'end', srOnlyLabel: true },
];

export function Contents(props: { contents: ContentsView; ctx: FileCtx }) {
  const { contents: c, ctx } = props;
  const a = ctx.actions;
  const view = ctx.view;
  const planReview = c.mode === 'plan-review';
  const primary = view.primary;

  const rows: TableRow[] = c.rows.map((r) => ({
    key: r.stepId,
    height: 48,
    cells: {
      include: (
        <Checkbox
          checked={r.included}
          locked={r.required}
          disabled={!planReview && !r.required}
          ariaLabel={r.title}
          onChange={() => a.togglePlanStep(r.stepId)}
        />
      ),
      ordinal: <span className="file-contents__ordinal t-figure">{r.ordinal}</span>,
      step: (
        <span className="file-contents__step">
          <span className="t-strong">{r.title}</span>
          <span className="file-contents__describe t-small">{r.describe}</span>
        </span>
      ),
      tool: <span className="file-contents__tool t-small">{r.tool}</span>,
      tag: <Chip>{r.tag}</Chip>,
    },
  }));

  const onPrimary = () => {
    if (!primary || primary.disabled) return;
    if (primary.action === 'draft') a.startFile(ctx.dealId);
    else a.approvePlan();
  };

  return (
    <>
      <SectionHead
        ordinal=""
        heading={COPY.contents}
        status={view.docBar.status.state}
        statusLabel={view.docBar.status.text}
        anchorId="sec:contents"
        flashKey={ctx.flashKeyOf('sec:contents')}
        highlighted={ctx.isHighlighted('sec:contents')}
      />
      <Table columns={COLUMNS} rows={rows} caption={COPY.contents} header={false} stackBelow={ctx.stackTables ? 760 : undefined} />
      <p className="file-contents__source t-small">
        <span>{c.sourceLine}</span>
        <LinkButton role="small" onClick={() => a.openSource()}>
          {OPEN_SOURCE}
        </LinkButton>
      </p>

      <div className="file-contents__footer">
        {primary ? (
          <div className="file-contents__actions">
            <Button variant="primary" kbd={primary.kbd} disabled={primary.disabled} onClick={onPrimary}>
              {primary.label}
            </Button>
            {planReview ? (
              <Button variant="ghost" onClick={() => a.cancelPlan()}>
                {COPY.cancel}
              </Button>
            ) : null}
          </div>
        ) : null}
        {primary && primary.disabled && primary.disabledReason ? (
          <p className="file-contents__note t-meta">{primary.disabledReason}</p>
        ) : null}
        {planReview && c.countdown && !c.held ? (
          <p className="file-contents__countdown t-small">
            <span>{c.countdown} · </span>
            <LinkButton role="small" onClick={() => a.holdPlan()}>
              {c.holdLabel}
            </LinkButton>
          </p>
        ) : null}
        {planReview && c.held ? <p className="file-contents__countdown t-small">{COPY.heldStartWhenReady}</p> : null}
        {planReview && c.unattendedNote ? <p className="file-contents__note t-meta">{c.unattendedNote}</p> : null}
      </div>
    </>
  );
}
