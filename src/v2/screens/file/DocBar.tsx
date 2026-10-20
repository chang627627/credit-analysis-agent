// ---------------------------------------------------------------------------
// Case file · the doc bar (THREE-PANE.md §5.10, R2.1). 44px, sticky inside the
// memo scroller, on the header line shared with the agent head and the source
// head. Three zones:
//   left    the "Agent panel" toggle (whenever the panel is hidden), the Desk
//           crumb and the file switcher;
//   centre  the status sentence, elapsed, extraction, policy suffix;
//   right   Review manually, Go to decision (brings the memo's Decision card
//           into view and focuses its primary; it never signs and never opens
//           the panel) or Go to drafting, the actions, and the "Source CIM ·
//           n quoted" toggle at the right end.
// It sits in the data-docbar wrapper with any open ConfirmStrip (stop/start)
// and never holds a primary. It folds on its OWN width (container
// file-docbar, file.css): <= 999 the Agent panel label drops to its icon,
// <= 939 the actions fold into More, <= 759 the Source label drops to its
// icon, <= 659 Go to decision / Go to drafting, Review manually, the Desk
// crumb and the policy suffix fold too. The status keeps a floor and
// ellipsizes rather than being cut mid-word.
// ---------------------------------------------------------------------------

import { ArrowDown, FileText, MessageSquare, PenLine } from 'lucide-react';
import { Button, ConfirmStrip, IconButton, LinkButton, Menu, StatusLabel } from '../../kit';
import type { MenuItem } from '../../kit';
import { COPY } from '../../model';
import type { DocBarView, SourceView } from '../../model';
import type { V2Actions } from '../../state/store';

const FILES_MENU_LABEL = 'Switch file';

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

  // phase one only: brings the memo's Decision card into view and focuses its primary (never signs)
  const goToDecision = () => a.requestSign('button');
  const toggleSource = () => a.toggleSource();

  // the folded forms, as menu rows: <= 939 the actions; <= 659 the reader controls and the crumb too
  const actionItems: MenuItem[] = d.actions
    .filter((act) => !act.disabled)
    .map((act) => ({ id: act.kind, label: act.label, onSelect: () => runAction(act.kind) }));
  const narrowItems: MenuItem[] = [];
  if (d.countdown) narrowItems.push({ id: 'review', label: d.countdown.reviewLabel, onSelect: () => a.reviewManually() });
  if (d.goToDecision) narrowItems.push({ id: 'decision', label: COPY.goToDecision, onSelect: goToDecision });
  if (d.goToDrafting) narrowItems.push({ id: 'drafting', label: COPY.goToDrafting, onSelect: onGoToDrafting });
  narrowItems.push({ id: 'desk', label: COPY.tabDesk, onSelect: () => a.navigate({ name: 'desk' }) });
  narrowItems.push(...actionItems);

  const confirm = d.confirm;

  return (
    <div className="file-docbarwrap" data-docbar="" data-confirm={confirm ? '' : undefined}>
      <div className="file-docbar">
        <div className="file-docbar__left">
          {/* one toggle, two widths: the labelled button, or (tight bar) its icon with the same name
              as a tip. CSS shows exactly one; data-chat-toggle lets the shell hand focus back here
              when the panel or the drawer closes with focus inside it (the panel is then hidden,
              so this toggle is always present to receive it). */}
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
        </div>

        <div className="file-docbar__center">
          <span className="file-docbar__status">
            <StatusLabel state={d.status.state} role="label" truncate>
              {d.status.text}
            </StatusLabel>
          </span>
          {d.elapsed ? <span className="file-docbar__elapsed t-figure">{d.elapsed}</span> : null}
          {d.extraction ? <span className={`file-docbar__extraction t-meta ${EXTRACTION_CLASS[d.extraction.tone]}`}>{d.extraction.text}</span> : null}
          {d.policySuffix ? <span className="file-docbar__suffix t-meta">{d.policySuffix}</span> : null}
        </div>

        <div className="file-docbar__right">
          {d.countdown ? (
            <span className="file-docbar__review">
              <LinkButton role="label" onClick={() => a.reviewManually()}>
                {d.countdown.reviewLabel}
              </LinkButton>
            </span>
          ) : null}
          {d.goToDecision ? (
            <span className="file-docbar__goto">
              <Button variant="ghost" size="sm" icon={PenLine} onClick={goToDecision}>
                {COPY.goToDecision}
              </Button>
            </span>
          ) : null}
          {d.goToDrafting ? (
            <span className="file-docbar__goto">
              <Button variant="ghost" size="sm" icon={ArrowDown} onClick={onGoToDrafting}>
                {COPY.goToDrafting}
              </Button>
            </span>
          ) : null}
          {d.actions.length > 0 ? (
            <span className="file-docbar__actions">
              {d.actions.map((act) => (
                <Button key={act.kind} variant={act.variant} size="sm" disabled={act.disabled} onClick={() => runAction(act.kind)}>
                  {act.label}
                </Button>
              ))}
            </span>
          ) : null}
          {actionItems.length > 0 ? (
            <span className="file-docbar__more file-docbar__more--mid">
              <Menu label={COPY.more} trigger={{ text: COPY.more, variant: 'ghost' }} items={actionItems} />
            </span>
          ) : null}
          <span className="file-docbar__more file-docbar__more--narrow">
            <Menu label={COPY.more} trigger={{ text: COPY.more, variant: 'ghost' }} items={narrowItems} />
          </span>
          {/* data-source-toggle lets the source pane hand focus back here when it closes from inside */}
          <span className="file-docbar__source" data-source-toggle="">
            <Button variant="ghost" size="sm" icon={FileText} onClick={toggleSource}>
              {source.toggleLabel}
            </Button>
          </span>
          <span className="file-docbar__source-icon" data-source-toggle="">
            <IconButton icon={FileText} label={source.toggleLabel} onClick={toggleSource} />
          </span>
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
