// ---------------------------------------------------------------------------
// Agent panel · the composer (THREE-PANE.md R2.1, §4.1, P-25). One line,
// placeholder "Ask or instruct". Enter sends a non-blank draft; Shift+Enter
// inserts a newline; Enter during IME composition or with meta / ctrl / alt
// never sends (the kit TextArea owns those rules, so the global Cmd/Ctrl+Enter
// is never doubled). The draft lives in the store per file (ui.composerDraft):
// typing engages (holds a running countdown), and a send clears it. The model
// parses and answers; typing can never sign, return or reject (such text is
// answered "Decide in the memo: Decision →"). Flat: no kbd hints. One frame: the send button
// sits inside the field (kit TextArea `trailing`), accent once there is a draft. The shell
// focuses this field when the panel is opened explicitly, through the P-25
// wrapper.
// ---------------------------------------------------------------------------

import { useId } from 'react';
import { ArrowUp } from 'lucide-react';
import { IconButton, TextArea } from '../../kit';
import { COPY } from '../../model';
import type { AgentPanelView } from '../../model';
import { useV2 } from '../../state/store';

export interface ComposerProps {
  dealId: string;
  composer: AgentPanelView['composer'];
  /** after a send: the thread re-pins and jumps to its foot */
  onSent: () => void;
}

export function Composer({ dealId, composer, onSent }: ComposerProps) {
  const s = useV2();
  const a = s.actions;
  const reasonId = useId();
  const draft = s.ui.composerDraft[dealId] ?? '';
  const blank = draft.trim() === '';
  const reason = composer.disabled ? composer.disabledReason : null;

  const send = () => {
    if (blank || composer.disabled) return;
    a.submitComposer(dealId, draft);
    onSent();
  };

  return (
    <div className="chat-composer" data-pattern="P-25">
      <div className="chat-composer__field">
        <TextArea
          size="composer"
          value={draft}
          onChange={(v) => a.setComposerDraft(dealId, v)}
          onSubmit={send}
          placeholder={composer.placeholder}
          ariaLabel={COPY.composerLabel}
          disabled={composer.disabled}
          describedBy={reason ? reasonId : undefined}
          trailing={<IconButton icon={ArrowUp} label={COPY.send} variant="send" onClick={send} disabled={blank || composer.disabled} />}
        />
        {reason ? (
          <p id={reasonId} className="chat-composer__reason t-meta">
            {reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}
