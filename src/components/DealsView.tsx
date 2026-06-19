// ---------------------------------------------------------------------------
// DealsView — the origination pipeline. A board of every deal grouped by the
// stage it has actually reached this session (Screening → In analysis →
// Awaiting countersign → Decided). Stage is DERIVED from real run state, not
// faked: the live deal moves through the loop, and any deal decided this
// session lands in "Decided". Distinct from Portfolio, which is post-close
// monitoring. Cards open the deal in Credit Analysis.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { Upload } from 'lucide-react';
import type { Deal } from '../agent/mockData';
import type { RunStatus } from '../hooks/useCreditAgent';
import type { AuditHistoryEntry } from '../hooks/useCreditAgent';
import { recommendationFor } from '../agent/runAgent';

type StageId = 'screening' | 'analysis' | 'countersign' | 'decided';

const STAGES: { id: StageId; label: string; hint: string }[] = [
  { id: 'screening', label: 'Screening', hint: 'Not yet analyzed' },
  { id: 'analysis', label: 'In analysis', hint: 'Agent is working' },
  { id: 'countersign', label: 'Awaiting countersign', hint: 'At the human gate' },
  { id: 'decided', label: 'Decided', hint: 'Signed off' },
];

interface DealCardModel {
  deal: Deal;
  stage: StageId;
  recommendation: ReturnType<typeof recommendationFor>;
  decision?: 'approved' | 'rejected';
}

export function DealsView({
  deals,
  selectedDealId,
  creditStatus,
  auditHistory,
  onOpenDeal,
}: {
  deals: Deal[];
  selectedDealId: string;
  creditStatus: RunStatus;
  auditHistory: AuditHistoryEntry[];
  onOpenDeal: (id: string) => void;
}) {
  const models = useMemo<DealCardModel[]>(() => {
    // which deals were decided this session, and how (latest decision wins)
    const decisions = new Map<string, 'approved' | 'rejected'>();
    for (const e of auditHistory) {
      if (e.kind !== 'human') continue;
      if (/APPROVED/.test(e.label)) decisions.set(e.dealName, 'approved');
      else if (/REJECTED/.test(e.label)) decisions.set(e.dealName, 'rejected');
    }

    return deals.map((deal) => {
      const live = deal.id === selectedDealId;
      let stage: StageId = 'screening';
      let decision = decisions.get(deal.name);

      if (live && creditStatus === 'running') stage = 'analysis';
      else if (live && creditStatus === 'awaiting_approval') stage = 'countersign';
      else if (live && (creditStatus === 'approved' || creditStatus === 'rejected')) {
        stage = 'decided';
        decision = creditStatus === 'approved' ? 'approved' : 'rejected';
      } else if (decision) stage = 'decided';

      return { deal, stage, recommendation: recommendationFor(deal), decision };
    });
  }, [deals, selectedDealId, creditStatus, auditHistory]);

  const byStage = (id: StageId) => models.filter((m) => m.stage === id);
  const decidedCount = byStage('decided').length;

  const stats = [
    { k: 'Deals', v: deals.length, tone: 'accent' },
    { k: 'In pipeline', v: deals.length - decidedCount, tone: '' },
    { k: 'Awaiting countersign', v: byStage('countersign').length, tone: byStage('countersign').length ? 'warn' : '' },
    { k: 'Decided', v: decidedCount, tone: decidedCount ? 'good' : '' },
  ];

  return (
    <section className="dealsview">
      <header className="portfolio__head">
        <div>
          <h2 className="portfolio__title">Deals pipeline</h2>
          <p className="portfolio__sub">
            Origination board — every deal by the stage it has reached. Stage tracks real run state, so
            a deal moves right as the agent analyzes it and you countersign. Open any card to work it.
          </p>
        </div>
      </header>

      <div className="pstats">
        {stats.map((s) => (
          <div className={`pstat ${s.tone ? `pstat--${s.tone}` : ''}`} key={s.k}>
            <span className="pstat__k">{s.k}</span>
            <span className="pstat__v">{s.v}</span>
          </div>
        ))}
      </div>

      <div className="board">
        {STAGES.map((st) => {
          const items = byStage(st.id);
          return (
            <div className={`bcol bcol--${st.id}`} key={st.id}>
              <div className="bcol__head">
                <span className="bcol__label">{st.label}</span>
                <span className="bcol__count">{items.length}</span>
              </div>
              <span className="bcol__hint">{st.hint}</span>
              <div className="bcol__cards">
                {items.length === 0 && <p className="bcol__empty">—</p>}
                {items.map(({ deal, recommendation, decision }) => (
                  <button className="dcard" key={deal.id} onClick={() => onOpenDeal(deal.id)} title="Open in Credit Analysis">
                    <div className="dcard__top">
                      <span className="dcard__name">{deal.name}</span>
                      {deal.uploaded && <Upload className="dcard__uploaded" size={12} strokeWidth={2} aria-label="Uploaded deal" />}
                    </div>
                    <span className="dcard__borrower">{deal.document.borrower}</span>
                    <span className="dcard__facility">{deal.document.facility}</span>
                    <div className="dcard__foot">
                      <span className={`dcard__rec dcard__rec--${recommendation}`}>{recommendation.toUpperCase()}</span>
                      <span
                        className={`dcard__lev${deal.financials.leverageX > 4 ? ' dcard__lev--bad' : ''}`}
                        title="Total leverage (Debt ÷ EBITDA)"
                      >
                        lev {deal.financials.leverageX.toFixed(2)}x
                      </span>
                      {decision && (
                        <span className={`dcard__decision dcard__decision--${decision}`}>
                          {decision === 'approved' ? '✓ countersigned' : '✕ rejected'}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
