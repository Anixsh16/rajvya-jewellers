'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
type Label = { grounded: boolean; helpful: boolean; warm: boolean; note: string };
type Entry = {
  scenarioId: string;
  transcript: { user: string; assistant: string }[];
  quality: Label & { reason: string };
  evidence: unknown;
  label?: Label;
};
type Review = {
  evaluationId: string | null;
  entries: Entry[];
  reviewed: number;
  agreement: number | null;
};
export function CalibrationReview({ role }: { role: string }) {
  const [data, setData] = useState<Review>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      setData(await api('admin/calibration'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Human quality review</h2>
      <p className="small muted">
        Judge scores remain advisory. Calibration requires 50 personally reviewed conversations;
        automated tests do not count as human labels.
      </p>
      {error && <p className="error">{error}</p>}
      <button className="button secondary" disabled={busy || role !== 'owner'} onClick={load}>
        Open review set
      </button>
      {data && (
        <>
          <p className="notice">
            {data.reviewed}/50 reviewed ·{' '}
            {data.agreement === null
              ? 'Agreement not yet measured'
              : `Label agreement ${(data.agreement * 100).toFixed(1)}%`}
          </p>
          {!data.entries.length && (
            <p className="small muted">
              A completed separate judge pass is needed before review can begin.
            </p>
          )}
          {data.entries.map((entry) => (
            <LabelEntry
              key={entry.scenarioId}
              entry={entry}
              busy={busy}
              onSave={async (label) => {
                setBusy(true);
                setError('');
                try {
                  await api('admin/evaluation-label', {
                    evaluationId: data.evaluationId,
                    scenarioId: entry.scenarioId,
                    ...label,
                    confirmed: true,
                  });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          ))}
        </>
      )}
    </section>
  );
}
function LabelEntry({
  entry,
  busy,
  onSave,
}: {
  entry: Entry;
  busy: boolean;
  onSave: (label: Label) => Promise<void>;
}) {
  const [labels, setLabels] = useState({
    grounded: entry.label ? String(entry.label.grounded) : '',
    helpful: entry.label ? String(entry.label.helpful) : '',
    warm: entry.label ? String(entry.label.warm) : '',
  });
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState(entry.label?.note ?? '');
  return (
    <details style={{ marginTop: 16 }}>
      <summary>
        {entry.scenarioId} · {entry.label ? 'Reviewed' : 'Awaiting human review'}
      </summary>
      <div className="admin-transcript">
        {entry.transcript.map((turn, i) => (
          <div key={i}>
            <p>
              <b>Customer:</b> {turn.user}
            </p>
            <p>
              <b>Assistant:</b> {turn.assistant}
            </p>
          </div>
        ))}
      </div>
      <details>
        <summary>Reference cards, policies and recorded state</summary>
        <pre className="report-json">{JSON.stringify(entry.evidence, null, 2)}</pre>
      </details>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave({
            grounded: labels.grounded === 'true',
            helpful: labels.helpful === 'true',
            warm: labels.warm === 'true',
            note,
          });
          setConfirmed(false);
        }}
      >
        <div className="form-grid">
          {(['grounded', 'helpful', 'warm'] as const).map((key) => (
            <label className="field" key={key}>
              {key}
              <select
                required
                value={labels[key]}
                onChange={(e) => setLabels({ ...labels, [key]: e.target.value })}
              >
                <option value="">Choose your judgment</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          ))}
        </div>
        <label className="field">
          Review note
          <textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I personally reviewed this conversation
        </label>
        <button
          className="button primary"
          disabled={busy || !confirmed || Object.values(labels).some((v) => !v)}
        >
          Save human review
        </button>
      </form>
      <details>
        <summary>View advisory judge after your own assessment</summary>
        <p className="small muted">{entry.quality.reason}</p>
      </details>
    </details>
  );
}
