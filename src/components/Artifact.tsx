// ---------------------------------------------------------------------------
// Artifact — renders a tool's result as a polished work-product (cards, a gauge,
// a pass/fail table) instead of raw JSON. This is the "answer card" pattern from
// Perplexity / v0 / Claude artifacts: the agent's output should look like a
// deliverable, with the raw call still available in the inspector below.
// ---------------------------------------------------------------------------

import type { ToolName } from '../agent/types';
import type { CovenantTest, ExtractedFinancials, RiskScore } from '../agent/mockData';
import { useCountUp } from '../hooks/useCountUp';

interface MemoData {
  memoId: string;
  sections: number;
  attachments: string[];
}

/** Click-through provenance: lets artifact figures highlight their source in the document. */
export interface Cite {
  has: (value: string) => boolean;
  show: (value: string) => void;
  showAll: (values: string[]) => void;
}

/** A number that counts up on mount — makes the data feel computed, not pasted. */
function Num({ n, dp = 0, prefix = '', suffix = '' }: { n: number; dp?: number; prefix?: string; suffix?: string }) {
  const v = useCountUp(n);
  return (
    <>
      {prefix}
      {v.toFixed(dp)}
      {suffix}
    </>
  );
}

export function Artifact({ tool, data, cite }: { tool: ToolName; data: unknown; cite?: Cite }) {
  switch (tool) {
    case 'extract_financials':
      return <FinancialsArtifact data={data as ExtractedFinancials} cite={cite} />;
    case 'compute_risk_score':
      return <RiskArtifact data={data as RiskScore} />;
    case 'check_covenants':
      return <CovenantsArtifact data={data as CovenantTest[]} />;
    case 'assemble_approval_package':
      return <MemoArtifact data={data as MemoData} />;
  }
}

function FinancialsArtifact({ data, cite }: { data: ExtractedFinancials; cite?: Cite }) {
  const cards = [
    { k: 'Revenue (TTM)', n: data.revenueTtm, dp: 1, prefix: '$', suffix: 'M' },
    { k: 'Adj. EBITDA', n: data.ebitdaTtm, dp: 1, prefix: '$', suffix: 'M', sub: `${data.ebitdaMarginPct}% margin` },
    { k: 'Total Debt', n: data.totalDebt, dp: 1, prefix: '$', suffix: 'M' },
    { k: 'Leverage', n: data.leverageX, dp: 2, suffix: 'x', tone: data.leverageX > 4 ? 'bad' : 'good' },
    { k: 'Interest Cov.', n: data.interestCoverageX, dp: 1, suffix: 'x' },
    { k: 'Liquidity', n: data.liquidity, dp: 1, prefix: '$', suffix: 'M' },
  ];
  // the exact strings as they appear in the document body (for source lookup)
  const valueOf = (c: (typeof cards)[number]) => `${c.prefix ?? ''}${c.n.toFixed(c.dp)}${c.suffix ?? ''}`;
  const allCitable = cards.map(valueOf).filter((v) => cite?.has(v));

  return (
    <div className="art">
      <div className="art__head">
        Extracted financials
        <button
          className="art__src"
          title="Provenance — highlight every extracted figure in the source document"
          onClick={() => cite?.showAll(allCitable)}
          disabled={!cite || allCitable.length === 0}
        >
          ⛓ CIM · p.12–28
        </button>
      </div>
      <div className="art__cards">
        {cards.map((c, i) => {
          const value = valueOf(c);
          const citable = !!cite?.has(value);
          const inner = (
            <>
              <span className="fcard__k">
                {c.k}
                {citable && (
                  <span className="fcard__citemark" aria-hidden="true">
                    ⛓
                  </span>
                )}
              </span>
              <span className="fcard__v">
                <Num n={c.n} dp={c.dp} prefix={c.prefix} suffix={c.suffix} />
              </span>
              {c.sub && <span className="fcard__sub">{c.sub}</span>}
            </>
          );
          const style = { '--i': i } as React.CSSProperties;
          const tone = c.tone ? ` fcard--${c.tone}` : '';
          // citable figures are buttons; plain data stays a div (a11y semantics)
          return citable ? (
            <button
              className={`fcard${tone} fcard--cite`}
              key={c.k}
              style={style}
              onClick={() => cite?.show(value)}
              aria-label={`${c.k} ${value} — show source in document`}
              title="Show the source of this figure in the document"
            >
              {inner}
            </button>
          ) : (
            <div className={`fcard${tone}`} key={c.k} style={style}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskArtifact({ data }: { data: RiskScore }) {
  const tone = data.score < 40 ? 'good' : data.score < 70 ? 'warn' : 'bad';
  return (
    <div className="art">
      <div className="art__head">Risk assessment</div>
      <div className="gauge">
        <div className="gauge__top">
          <span className="gauge__score">
            <Num n={data.score} />
            <small> / 100</small>
          </span>
          <span className={`gauge__rating gauge__rating--${tone}`}>{data.rating}</span>
        </div>
        <div className="gauge__track">
          <div className={`gauge__fill gauge__fill--${tone}`} style={{ width: `${data.score}%` }} />
        </div>
        <div className="gauge__scale">{data.scale}</div>
      </div>
      <div className="drivers">
        {data.drivers.map((d) => (
          <span className="driver" key={d.factor}>
            {d.factor} <em>{d.impact}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

function CovenantsArtifact({ data }: { data: CovenantTest[] }) {
  return (
    <div className="art">
      <div className="art__head">Covenant tests</div>
      <table className="ctable">
        <thead>
          <tr>
            <th>Covenant</th>
            <th>Threshold</th>
            <th>Actual</th>
            <th aria-label="status" />
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.name} className={c.status === 'breach' ? 'ctable__row--breach' : ''}>
              <td>{c.name}</td>
              <td className="ctable__mono">{c.threshold}</td>
              <td className="ctable__mono">{c.actual}</td>
              <td>
                <span className={`cstatus cstatus--${c.status}`}>
                  {c.status === 'breach' ? 'BREACH' : 'PASS'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemoArtifact({ data }: { data: MemoData }) {
  return (
    <div className="art art--memo">
      <span className="art__memoicon">▤</span>
      <div>
        <div className="art__memotitle">Credit memo {data.memoId}</div>
        <div className="art__memometa">
          {data.sections} sections · {data.attachments.join(', ')}
        </div>
      </div>
    </div>
  );
}
