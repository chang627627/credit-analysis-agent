// ---------------------------------------------------------------------------
// Case file · the doc bar (spec §7.2 "Doc bar"). 44px, sticky inside the
// canvas, three zones: breadcrumb · status sentence · reader controls. It sits
// in the data-docbar wrapper together with any open ConfirmStrip (stop/start).
// The doc bar never holds a primary. It folds on its OWN width (file.css
// container queries, so the sidebar and a pushed source count): below 940 the
// horizontal Source toggle drops to its icon (same name, shown as a tip), below
// 800 the reader controls and actions fold into "More", and below 680 the note
// stepper and the Desk crumb fold too (J/K still step). The status sentence
// keeps a floor and ellipsizes rather than being cut mid-word.
// ---------------------------------------------------------------------------

import { ArrowDown, ArrowUp, FileText } from 'lucide-react';
import { Button, ConfirmStrip, IconButton, LinkButton, Menu, StatusLabel } from '../../kit';
import type { MenuItem } from '../../kit';
import { COPY } from '../../model';
import type { DocBarView, SourceView } from '../../model';
import type { V2Actions } from '../../state/store';

const FILES_MENU_LABEL = 'Switch file';
const PREV_NOTE = 'Previous note (K)';
const NEXT_NOTE = 'Next note (J)';

const EXTRACTION_CLASS: Record<NonNullable<DocBarView['extraction']>['tone'], string> = {
  'ink-3': 'file-tone-ink3',
  warn: 'file-tone-warn',
  bad: 'file-tone-bad',
};

export function DocBar(props: { docBar: DocBarView; source: SourceView; dealId: string; actions: V2Actions; onGoToDrafting: () => void }) {
  const { docBar: d, source, dealId, actions: a, onGoToDrafting } = props;

  const runAction = (kind: DocBarView['actions'][number]['kind']) => {
    switch (kind) {
      case 'stop':
        a.requestStop();
        return;
      case 'export':
        a.exportFile(dealId);
        return;
      case 'rerun':
        a.startFile(dealId);
        return;
      case 'ledger':
        a.navigate({ name: 'ledger', file: dealId });
        return;
      default:
        return;
    }
  };

  const goToSignature = () => a.requestSign('button');
  const toggleSource = () => (source.open ? a.closeSource() : a.openSource());

  // the same controls, as menu rows. Below 800 (the bar's own width) the reader controls fold into
  // "More" so the status sentence keeps its room (the stepper stays visible); below 680 it folds too.
  const actionItems: MenuItem[] = [];
  if (d.countdown) actionItems.push({ id: 'review', label: d.countdown.reviewLabel, onSelect: () => a.reviewManually() });
  if (d.goToSignature) actionItems.push({ id: 'signature', label: COPY.goToSignature, onSelect: goToSignature });
  if (d.goToDrafting) actionItems.push({ id: 'drafting', label: COPY.goToDrafting, onSelect: onGoToDrafting });
  for (const act of d.actions) {
    if (!act.disabled) actionItems.push({ id: act.kind, label: act.label, onSelect: () => runAction(act.kind) });
  }
  const moreItems: MenuItem[] = d.stepper
    ? [
        { id: 'note-prev', label: PREV_NOTE, meta: d.stepper.label, onSelect: () => a.focusNote(-1) },
        { id: 'note-next', label: NEXT_NOTE, meta: d.stepper.label, onSelect: () => a.focusNote(1) },
        ...actionItems,
      ]
    : actionItems;

  const confirm = d.confirm;

  return (
    <div className="file-docbarwrap" data-docbar="" data-confirm={confirm ? '' : undefined}>
      <div className="file-docbar">
        <div className="file-docbar__left">
          <span className="file-docbar__crumb">
            <LinkButton role="label" onClick={() => a.navigate({ name: 'desk' })}>
              {COPY.tabDesk}
            </LinkButton>
            <span className="file-docbar__sep t-label" aria-hidden="true">
              /
            </span>
          </span>
          <Menu
            label={FILES_MENU_LABEL}
            trigger={{ text: d.fileName, variant: 'ghost' }}
            items={d.files.map((f) => ({
              id: f.dealId,
              label: f.label,
              meta: f.meta,
              checked: f.dealId === dealId,
              onSelect: () => a.navigate({ name: 'file', dealId: f.dealId, at: null }),
            }))}
          />
          {/* one toggle, two widths: the labelled button, or (tight bar) its icon with the same
              name as a tip. CSS shows exactly one; data-source-toggle lets the source pane hand
              focus back here when it closes from inside. */}
          <span className="file-docbar__source" data-source-toggle="">
            <Button variant="ghost" size="sm" icon={FileText} onClick={toggleSource}>
              {source.toggleLabel}
            </Button>
          </span>
          <span className="file-docbar__source-icon" data-source-toggle="">
            <IconButton icon={FileText} label={source.toggleLabel} onClick={toggleSource} />
          </span>
        </div>

        <div className="file-docbar__center">
          <span className="file-docbar__status">
            <StatusLabel state={d.status.state} role="label" truncate>
              {d.status.text}
            </StatusLabel>
          </span>
          {d.elapsed ? <span className="file-docbar__elapsed t-figure">{d.elapsed}</span> : null}
          {d.extraction ? <span className={`t-meta ${EXTRACTION_CLASS[d.extraction.tone]}`}>{d.extraction.text}</span> : null}
          {d.policySuffix ? <span className="file-docbar__suffix t-meta">{d.policySuffix}</span> : null}
        </div>

        <div className="file-docbar__right">
          {d.stepper ? (
            <span className="file-docbar__stepper">
              <IconButton icon={ArrowUp} label={PREV_NOTE} size="xs" onClick={() => a.focusNote(-1)} />
              <span className="file-docbar__count t-label">{d.stepper.label}</span>
              <IconButton icon={ArrowDown} label={NEXT_NOTE} size="xs" onClick={() => a.focusNote(1)} />
            </span>
          ) : null}
          <span className="file-docbar__full">
            {d.countdown ? (
              <LinkButton role="label" onClick={() => a.reviewManually()}>
                {d.countdown.reviewLabel}
              </LinkButton>
            ) : null}
            {d.goToSignature ? (
              <Button variant="ghost" size="sm" icon={ArrowDown} onClick={goToSignature}>
                {COPY.goToSignature}
              </Button>
            ) : null}
            {d.goToDrafting ? (
              <Button variant="ghost" size="sm" icon={ArrowDown} onClick={onGoToDrafting}>
                {COPY.goToDrafting}
              </Button>
            ) : null}
            {d.actions.map((act) => (
              <Button key={act.kind} variant={act.variant} size="sm" disabled={act.disabled} onClick={() => runAction(act.kind)}>
                {act.label}
              </Button>
            ))}
          </span>
          {actionItems.length > 0 ? (
            <span className="file-docbar__more file-docbar__more--mid">
              <Menu label={COPY.more} trigger={{ text: COPY.more, variant: 'ghost' }} items={actionItems} />
            </span>
          ) : null}
          {moreItems.length > 0 ? (
            <span className="file-docbar__more file-docbar__more--narrow">
              <Menu label={COPY.more} trigger={{ text: COPY.more, variant: 'ghost' }} items={moreItems} />
            </span>
          ) : null}
        </div>
      </div>
      {confirm ? (
        <ConfirmStrip
          key={confirm.kind}
          text={confirm.text}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={confirm.cancelLabel}
          tone={confirm.tone}
          onConfirm={() => (confirm.kind === 'stop' ? a.confirmStop() : a.confirmStart())}
          onCancel={() => a.cancelConfirm()}
        />
      ) : null}
    </div>
  );
}
