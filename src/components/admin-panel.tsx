'use client';
import { JewelleryImage } from '@/components/jewellery-image';

import { useState, useEffect, useRef } from 'react';

import {
  LayoutDashboard,
  Gem,
  ChartNoAxesCombined,
  ShoppingBag,
  CalendarDays,
  RotateCcw,
  MessagesSquare,
  FlaskConical,
  Upload,
  Plus,
  RefreshCw,
  ArrowUpRight,
  LoaderCircle,
  Check,
  X,
  FileUp,
  ShieldCheck,
  Clock3,
} from 'lucide-react';

import { api } from '@/lib/client';
import { preparePhoto } from '@/lib/photo';
import { CalibrationReview } from './calibration-review';

import { money, preciseMoney } from '@/lib/types';

import { parseCSV } from '@/lib/csv';

type Tab =
  | 'Overview'
  | 'Catalogue'
  | 'Rates'
  | 'Orders'
  | 'Reservations'
  | 'Refund approvals'
  | 'Conversations'
  | 'Evaluations';

const tabs: [Tab, any][] = [
  ['Overview', LayoutDashboard],
  ['Catalogue', Gem],
  ['Rates', ChartNoAxesCombined],
  ['Orders', ShoppingBag],
  ['Reservations', CalendarDays],
  ['Refund approvals', RotateCcw],
  ['Conversations', MessagesSquare],
  ['Evaluations', FlaskConical],
];

const blank = () => ({
  sku: 'RJ-' + Date.now().toString().slice(-7),
  name: '',
  description: '',
  descriptionHi: '',
  category: 'Chains',
  purity: '22K',
  netMg: 0,
  grossMg: 0,
  makingBps: 1200,
  makingFixedPaise: null as number | null,
  stonePaise: 0,
  huid: '',
  tags: [] as string[],
  imageUrl: '',
  publish: false,
  reviewConfirmed: false,
  huidVerified: false,
  extraction: {} as any,
});

export function AdminPanel({ role }: { role: string }) {
  const [tab, setTab] = useState<Tab>('Overview');
  const [data, setData] = useState<any>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<any>();
  const [filter, setFilter] = useState('');
  const [rate, setRate] = useState({ purity: '22K', value: '', confirm: false, override: false });
  const [reply, setReply] = useState<Record<string, string>>({});
  const [lookup, setLookup] = useState('');
  const [importReport, setImportReport] = useState<any[]>([]);
  const upload = useRef<HTMLInputElement>(null);
  const csv = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setData(await api('admin'));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(path: string, body: any, message = 'Saved') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const d = await api(path, body);
      setNotice(message);
      await load();
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function edit(p: any) {
    setForm({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      descriptionHi: p.description_hi,
      category: p.category,
      purity: p.purity,
      netMg: p.net_mg,
      grossMg: p.gross_mg,
      makingBps: p.making_bps,
      makingFixedPaise: p.making_fixed_paise === null ? null : Number(p.making_fixed_paise),
      stonePaise: Number(p.stone_paise),
      huid: p.huid ?? '',
      tags: p.tags,
      imageUrl: p.image_url,
      publish: false,
      reviewConfirmed: false,
      huidVerified: false,
      extraction: p.extraction ?? {},
    });
    setTab('Catalogue');
  }

  async function photo(file: File) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const fd = new FormData();
      fd.set('file', await preparePhoto(file));
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setForm((f: any) => ({ ...(f ?? blank()), imageUrl: d.imageUrl }));
      setNotice('Photo uploaded. Extracting a reviewable draft…');
      const extracted = await api('admin/extract', { imageUrl: d.imageUrl });
      const v = extracted.draft;
      setForm((f: any) => ({
        ...f,
        ...v,
        netMg: v.netMg ?? 0,
        grossMg: v.grossMg ?? 0,
        purity: v.purity ?? '22K',
        huid: v.huid ?? '',
        extraction: v,
        reviewConfirmed: false,
        huidVerified: false,
      }));
      setNotice('Draft extracted. Review every financial and hallmark field before publishing.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importCSV(file: File) {
    setBusy(true);
    setError('');
    try {
      const rows = parseCSV(await file.text());
      const products = rows.map((r) => ({
        sku: r.sku,
        name: r.name,
        description: r.description ?? '',
        category: r.category,
        purity: r.purity,
        netMg: Math.round(Number(r.net_weight_g) * 1000),
        grossMg: Math.round(Number(r.gross_weight_g) * 1000),
        makingBps: Math.round(Number(r.making_percent ?? 12) * 100),
        stonePaise: Math.round(Number(r.stone_rupees ?? 0) * 100),
        huid: r.huid ?? '',
        tags: (r.tags ?? '').split('|').filter(Boolean),
        imageUrl: r.image_url ?? '',
        publish: false,
      }));
      const d = await api('admin/import', { products });
      setImportReport(d.results);
      await load();
      setNotice('Import reviewed. Accepted rows are drafts; existing SKUs were not overwritten.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pending = data?.refunds.filter((r: any) => r.status === 'pending').length ?? 0;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-label">
          OWNER WORKSPACE
          <ShieldCheck size={13} />
        </div>
        {tabs.map(([label, Icon]) => (
          <button
            key={label}
            className={tab === label ? 'selected' : ''}
            onClick={() => {
              setTab(label);
              setError('');
              setNotice('');
            }}
          >
            <Icon size={17} />
            {label}
            {label === 'Refund approvals' && pending > 0 && <b>{pending}</b>}
          </button>
        ))}
        <div className="admin-sidebar-note">
          <span className="live-dot" /> TEST ENVIRONMENT
          <p>All payments and visits are simulated.</p>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-heading">
          <div>
            <p className="eyebrow">RAJVYA · {role.toUpperCase()} PANEL</p>
            <h1>{form && tab === 'Catalogue' ? 'Catalogue review' : tab}</h1>
            <p>
              {tab === 'Catalogue'
                ? 'A careful eye behind every piece.'
                : 'A clear view of the details that matter.'}
            </p>
          </div>
          <div className="row">
            <button className="text-button" onClick={load}>
              <RefreshCw size={14} />
              Refresh
            </button>
            {tab === 'Catalogue' && (
              <button className="button primary" onClick={() => setForm(blank())}>
                <Plus size={14} />
                Add a piece
              </button>
            )}
          </div>
        </header>
        {busy && (
          <div className="admin-progress">
            <LoaderCircle size={15} className="spin" />
            Working on the details…
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {!data ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
          </div>
        ) : (
          <>
            {tab === 'Overview' && (
              <>
                <section className="panel" style={{ marginBottom: 20 }}>
                  <div className="row spread">
                    <div>
                      <h2>Assistant review mode</h2>
                      <p className="small muted">
                        Shadow mode holds drafted replies for review in Conversations. Only approved
                        replies become visible to customers.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      disabled={busy || role !== 'owner'}
                      onClick={() =>
                        act(
                          'admin/settings',
                          {
                            shadow: !data.settings?.find((s: any) => s.key === 'assistant_shadow')
                              ?.value,
                          },
                          'Assistant mode updated.',
                        )
                      }
                    >
                      {data.settings?.find((s: any) => s.key === 'assistant_shadow')?.value
                        ? 'Enable autonomous replies'
                        : 'Enable shadow review'}
                    </button>
                  </div>
                </section>
                <div className="metric-grid">
                  {[
                    ['Live pieces', data.metrics.live_products],
                    ['Online purchases', data.metrics.purchases],
                    ['Reservations', data.metrics.reservations],
                    ['Counter conversions', data.metrics.reservation_conversions],
                  ].map(([label, n]) => (
                    <div className="panel metric" key={label}>
                      <span>{label}</span>
                      <strong>{n}</strong>
                      <small>Attributed demo activity</small>
                    </div>
                  ))}
                </div>
                <div className="admin-two">
                  <section className="panel">
                    <h2>Needs a little attention</h2>
                    <div className="attention-list">
                      <button onClick={() => setTab('Refund approvals')}>
                        <span>Refunds awaiting owner approval</span>
                        <b>{pending}</b>
                        <ArrowUpRight size={15} />
                      </button>
                      <button onClick={() => setTab('Conversations')}>
                        <span>Conversations needing a person</span>
                        <b>{data.metrics.handoffs}</b>
                        <ArrowUpRight size={15} />
                      </button>
                      <button onClick={() => setTab('Orders')}>
                        <span>Payment exceptions / uncertain attempts</span>
                        <b>
                          {
                            data.orders.filter(
                              (o: any) =>
                                o.payment_status === 'exception' ||
                                o.provider_state === 'uncertain',
                            ).length
                          }
                        </b>
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        act(
                          'admin/expire',
                          {},
                          'Expired holds released; reservation token requests queued for review.',
                        )
                      }
                    >
                      <Clock3 size={14} />
                      Run expiry cleanup
                    </button>
                  </section>
                  <section className="panel">
                    <h2>Searches without a match</h2>
                    {data.searches.length ? (
                      data.searches.map((s: any) => (
                        <p className="summary-line" key={s.query}>
                          <span>{s.query}</span>
                          <b>{s.searches}</b>
                        </p>
                      ))
                    ) : (
                      <p className="small muted">No unmatched searches recorded yet.</p>
                    )}
                  </section>
                </div>
                <section className="panel" style={{ marginTop: 20 }}>
                  <h2>Recent owner activity</h2>
                  {data.audit.length ? (
                    data.audit.slice(0, 10).map((a: any) => (
                      <p className="audit-line" key={a.id}>
                        <span>{a.action.replaceAll('_', ' ')}</span>
                        <time>{new Date(a.created_at).toLocaleString('en-IN')}</time>
                      </p>
                    ))
                  ) : (
                    <p className="small muted">
                      Rate changes, approvals and counter sales will appear here.
                    </p>
                  )}
                </section>
              </>
            )}

            {tab === 'Catalogue' && (
              <>
                <input
                  ref={upload}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) photo(f);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={csv}
                  hidden
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importCSV(f);
                    e.target.value = '';
                  }}
                />
                {form ? (
                  <div className="review-layout">
                    <div>
                      <div className="review-photo">
                        {form.imageUrl ? (
                          <JewelleryImage src={form.imageUrl} alt="Catalogue draft under review" />
                        ) : (
                          <div className="empty-state">
                            <Upload size={30} />
                            <p>Photograph the piece and its tag.</p>
                          </div>
                        )}
                      </div>
                      <div className="review-photo-actions">
                        <button
                          className="button secondary"
                          onClick={() => upload.current?.click()}
                          disabled={busy}
                        >
                          <Upload size={14} />
                          Upload & extract
                        </button>
                        <span className="small muted">
                          AI extraction is a draft, never a verification.
                        </span>
                      </div>
                      <div className="notice" style={{ marginTop: 16 }}>
                        <p>
                          Review against the physical piece. Leave unreadable values blank until
                          checked.
                        </p>
                        {form.extraction?.uncertainFields?.length > 0 && (
                          <p>Needs review: {form.extraction.uncertainFields.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <form
                      className="panel"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const d = await act(
                          'admin/products',
                          form,
                          form.publish ? 'Piece published.' : 'Draft saved.',
                        );
                        if (d) setForm(undefined);
                      }}
                    >
                      <div className="row spread">
                        <h2>Review the details</h2>
                        <button
                          type="button"
                          aria-label="Close product editor"
                          onClick={() => setForm(undefined)}
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <div className="form-grid">
                        {[
                          ['sku', 'SKU'],
                          ['name', 'Product name'],
                        ].map(([key, label]) => (
                          <label className="field" key={key}>
                            {label}
                            <input
                              required
                              value={form[key]}
                              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            />
                          </label>
                        ))}
                        <label className="field">
                          Category
                          <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                          >
                            {[
                              'Chains',
                              'Earrings',
                              'Rings',
                              'Pendants',
                              'Bangles',
                              'Necklaces',
                            ].map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          Purity
                          <select
                            value={form.purity}
                            onChange={(e) => setForm({ ...form, purity: e.target.value })}
                          >
                            {['22K', '18K', '925'].map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </label>
                        {[
                          ['netMg', 'Net weight (g)', 1000],
                          ['grossMg', 'Gross weight (g)', 1000],
                          ['makingBps', 'Making charge (%)', 100],
                          ['stonePaise', 'Stone charge (₹)', 100],
                        ].map(([key, label, div]) => (
                          <label
                            className={
                              'field ' +
                              (form.extraction?.uncertainFields?.some((f: string) =>
                                f.toLowerCase().includes(String(key).slice(0, 3)),
                              )
                                ? 'needs-review'
                                : '')
                            }
                            key={key}
                          >
                            {label}
                            <input
                              required
                              type="number"
                              min="0"
                              step="0.001"
                              value={form[key] ? form[key] / Number(div) : ''}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  [key]: Math.round(Number(e.target.value) * Number(div)),
                                })
                              }
                            />
                          </label>
                        ))}
                        <label className="field full">
                          Fixed making charge (₹, optional; overrides percentage)
                          <input
                            type="number"
                            min="0"
                            step=".01"
                            value={
                              form.makingFixedPaise === null ? '' : form.makingFixedPaise / 100
                            }
                            onChange={(e) =>
                              setForm({
                                ...form,
                                makingFixedPaise:
                                  e.target.value === ''
                                    ? null
                                    : Math.round(Number(e.target.value) * 100),
                              })
                            }
                          />
                        </label>
                        <label className="field full needs-review">
                          HUID — verify against the physical tag
                          <input
                            value={form.huid}
                            maxLength={20}
                            placeholder="Leave blank if unavailable; never invent a code"
                            onChange={(e) => setForm({ ...form, huid: e.target.value })}
                          />
                        </label>
                        <label className="field full">
                          English description
                          <textarea
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                          />
                        </label>
                        <label className="field full">
                          Hindi description
                          <textarea
                            rows={2}
                            value={form.descriptionHi}
                            onChange={(e) => setForm({ ...form, descriptionHi: e.target.value })}
                          />
                        </label>
                        <label className="field full">
                          Tags, separated by commas
                          <input
                            value={form.tags.join(', ')}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                tags: e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </label>
                      </div>
                      <div className="notice">
                        Confirm the financial and hallmark details before publication.
                      </div>
                      <label className="check-field">
                        <input
                          type="checkbox"
                          checked={form.reviewConfirmed}
                          onChange={(e) => setForm({ ...form, reviewConfirmed: e.target.checked })}
                        />
                        Weight, purity and charges checked against the product
                      </label>
                      <label className="check-field">
                        <input
                          type="checkbox"
                          checked={form.huidVerified}
                          onChange={(e) => setForm({ ...form, huidVerified: e.target.checked })}
                        />
                        HUID checked, or explicitly unavailable in this demo
                      </label>
                      <div className="row">
                        <button
                          className="button secondary"
                          type="submit"
                          disabled={busy}
                          onClick={() => setForm({ ...form, publish: false })}
                        >
                          Save draft
                        </button>
                        <button
                          className="button primary"
                          type="submit"
                          disabled={busy || !form.reviewConfirmed || !form.huidVerified}
                          onClick={() => setForm({ ...form, publish: true })}
                        >
                          Approve & publish
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <>
                    <div className="admin-toolbar">
                      <input
                        placeholder="Find by name or SKU…"
                        aria-label="Filter catalogue"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => {
                          setForm(blank());
                          upload.current?.click();
                        }}
                      >
                        <Upload size={14} />
                        Photo to draft
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => csv.current?.click()}
                      >
                        <FileUp size={14} />
                        Import CSV
                      </button>
                      <a className="text-button" href="/sample-catalogue.csv" download>
                        Sample CSV
                      </a>
                    </div>
                    {importReport.length > 0 && (
                      <div className="notice">
                        {importReport.map((r) => (
                          <p key={r.sku}>
                            {r.sku}: {r.status}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Piece</th>
                            <th>Purity / weight</th>
                            <th>Status</th>
                            <th>Today’s price</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.products
                            .filter((p: any) =>
                              (p.name + ' ' + p.sku).toLowerCase().includes(filter.toLowerCase()),
                            )
                            .map((p: any) => (
                              <tr key={p.id}>
                                <td>
                                  <div className="table-product">
                                    {p.image_url && <JewelleryImage src={p.image_url} alt="" />}
                                    <div>
                                      <strong>{p.name}</strong>
                                      <small>{p.sku}</small>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  {p.purity} · {(p.net_mg / 1000).toFixed(2)} g
                                </td>
                                <td>
                                  <span className="status">{p.status}</span>
                                  <small className="index-state">Index: {p.embedding_status}</small>
                                </td>
                                <td>{p.price ? money(p.price.totalPaise) : 'Rate pending'}</td>
                                <td>
                                  <div className="table-actions">
                                    {['live', 'draft'].includes(p.status) && (
                                      <button onClick={() => edit(p)}>Review</button>
                                    )}
                                    {p.status === 'live' && (
                                      <button
                                        disabled={busy}
                                        onClick={() =>
                                          act(
                                            'admin/mark-sold',
                                            { productId: p.id, confirm: true },
                                            'Counter sale recorded.',
                                          )
                                        }
                                      >
                                        Mark sold
                                      </button>
                                    )}
                                    {p.status === 'sold' && role === 'owner' && (
                                      <ReturnReview
                                        busy={busy}
                                        onSubmit={(reason) =>
                                          act(
                                            'admin/restock',
                                            {
                                              productId: p.id,
                                              physicalReturnConfirmed: true,
                                              reason,
                                            },
                                            'Returned piece inspected and restocked.',
                                          )
                                        }
                                      />
                                    )}
                                    {p.embedding_status !== 'ready' && p.status !== 'draft' && (
                                      <button
                                        disabled={busy}
                                        onClick={() =>
                                          act(
                                            'admin/index',
                                            { productId: p.id },
                                            'Search index refreshed.',
                                          )
                                        }
                                      >
                                        Retry indexing
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'Rates' && (
              <div className="admin-two">
                <form
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(
                      'admin/rates',
                      {
                        purity: rate.purity,
                        ratePaise: Math.round(Number(rate.value) * 100),
                        confirm: rate.confirm,
                        override: rate.override,
                      },
                      'Today’s rate confirmed. Existing quotes retain their snapshots.',
                    );
                  }}
                >
                  <h2>Confirm today’s shop rate</h2>
                  <p className="small muted" style={{ marginBottom: 20 }}>
                    Prices use a separate rate for each purity. A change above 5% needs an explicit
                    second confirmation.
                  </p>
                  <label className="field">
                    Metal / purity
                    <select
                      value={rate.purity}
                      onChange={(e) => setRate({ ...rate, purity: e.target.value })}
                    >
                      <option>22K</option>
                      <option>18K</option>
                      <option value="925">925 silver</option>
                    </select>
                  </label>
                  <label className="field">
                    Rate per gram (₹)
                    <input
                      type="number"
                      min="0.01"
                      step=".01"
                      required
                      value={rate.value}
                      onChange={(e) => setRate({ ...rate, value: e.target.value })}
                    />
                  </label>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={rate.confirm}
                      onChange={(e) => setRate({ ...rate, confirm: e.target.checked })}
                    />
                    I reviewed this rate for today
                  </label>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={rate.override}
                      onChange={(e) => setRate({ ...rate, override: e.target.checked })}
                    />
                    I explicitly approve a change greater than 5%
                  </label>
                  <button className="button primary" disabled={busy || role !== 'owner'}>
                    Confirm rate
                  </button>
                </form>
                <section className="panel">
                  <h2>Rate history</h2>
                  {data.rates.map((r: any) => (
                    <p className="summary-line" key={r.id}>
                      <span>
                        {r.purity} · {r.rate_date.slice(0, 10)}
                      </span>
                      <strong>{money(r.rate_paise)}/g</strong>
                    </p>
                  ))}
                </section>
              </div>
            )}

            {(tab === 'Orders' || tab === 'Reservations') && (
              <>
                <div className="admin-toolbar">
                  <input
                    aria-label="Find an order or reservation code"
                    placeholder="Search order ID or reservation code…"
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                  />
                </div>
                <div className="stack">
                  {data.orders
                    .filter(
                      (o: any) =>
                        o.type === (tab === 'Reservations' ? 'reservation' : 'purchase') &&
                        (o.id + ' ' + o.reservation_code)
                          .toLowerCase()
                          .includes(lookup.toLowerCase()),
                    )
                    .map((o: any) => (
                      <article className="panel order-card" key={o.id}>
                        <header>
                          <div>
                            <p className="eyebrow">
                              {o.type.toUpperCase()} ·{' '}
                              {new Date(o.created_at).toLocaleDateString('en-IN')}
                            </p>
                            <h3>{o.reservation_code ?? o.id.slice(0, 8)}</h3>
                            <small className="muted">{o.id}</small>
                          </div>
                          <div className="status-pills">
                            <span>{o.payment_status}</span>
                            <span>{o.fulfillment_status}</span>
                          </div>
                        </header>
                        {o.items.map((i: any) => (
                          <div className="order-line" key={i.id}>
                            <JewelleryImage src={i.snapshot.imageUrl} alt="" />
                            <div>
                              <h4>{i.snapshot.name}</h4>
                              <p>
                                {i.snapshot.purity} · {(i.snapshot.netMg / 1000).toFixed(2)} g
                              </p>
                            </div>
                            <strong>{preciseMoney(i.total_paise)}</strong>
                          </div>
                        ))}
                        <p className="small" style={{ margin: '12px 0' }}>
                          Captured / payable {preciseMoney(o.total_paise)}{' '}
                          {o.type === 'reservation' &&
                            ' · Counter balance ' +
                              money(
                                o.items.reduce(
                                  (n: number, i: any) => n + Number(i.total_paise),
                                  0,
                                ) - Number(o.total_paise),
                              )}
                        </p>
                        {o.visit_at && (
                          <p className="small muted">
                            Simulated visit: {new Date(o.visit_at).toLocaleString('en-IN')}
                          </p>
                        )}
                        {o.exception_reason && <p className="error">{o.exception_reason}</p>}
                        <div className="row" style={{ marginTop: 16 }}>
                          {['captured', 'partially_refunded'].includes(o.payment_status) &&
                            !['completed', 'cancelled'].includes(o.fulfillment_status) && (
                              <>
                                <button
                                  className="button secondary"
                                  disabled={busy}
                                  onClick={() =>
                                    act(
                                      'admin/fulfill',
                                      {
                                        orderId: o.id,
                                        status: 'ready',
                                        tracking: 'Ready for simulated store pickup',
                                      },
                                      'Order marked ready.',
                                    )
                                  }
                                >
                                  Mark ready
                                </button>
                                <button
                                  className="button primary"
                                  disabled={busy}
                                  onClick={() =>
                                    act(
                                      'admin/fulfill',
                                      {
                                        orderId: o.id,
                                        status: 'completed',
                                        tracking:
                                          o.type === 'reservation'
                                            ? 'Counter balance recorded in demo'
                                            : 'Simulated pickup complete',
                                      },
                                      'Sale completed.',
                                    )
                                  }
                                >
                                  {o.type === 'reservation'
                                    ? 'Record counter balance & complete'
                                    : 'Complete pickup'}
                                </button>
                              </>
                            )}
                          {['pending', 'exception'].includes(o.payment_status) && (
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                act(
                                  'orders/reconcile',
                                  { orderId: o.id },
                                  'Provider status reconciled.',
                                )
                              }
                            >
                              Reconcile provider
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                </div>
              </>
            )}

            {tab === 'Refund approvals' && (
              <div className="stack">
                <p className="notice">
                  Only the owner can approve. Repeated clicks cannot create another refund. A
                  processed refund does not automatically restock a piece.
                </p>
                {!data.refunds.length && (
                  <div className="empty-state">
                    <h3>All clear for now.</h3>
                    <p>Customer requests and expired reservation token reviews will appear here.</p>
                  </div>
                )}
                {data.refunds.map((r: any) => (
                  <article className="panel" key={r.id}>
                    <div className="row spread">
                      <h3>Refund review</h3>
                      <span className="status">{r.status}</span>
                    </div>
                    <p>{r.reason}</p>
                    <p className="small muted">
                      Order {r.order_id} · {r.order_type}
                    </p>
                    <p className="refund-amount">{preciseMoney(r.amount_paise)}</p>
                    {r.status === 'pending' && (
                      <div className="row">
                        <button
                          className="button primary"
                          disabled={busy || role !== 'owner'}
                          onClick={() =>
                            act(
                              'admin/refunds',
                              { refundId: r.id, approve: true },
                              'Owner approval recorded. Provider refund processing started.',
                            )
                          }
                        >
                          <Check size={14} />
                          Approve refund
                        </button>
                        <button
                          className="button secondary"
                          disabled={busy || role !== 'owner'}
                          onClick={() =>
                            act(
                              'admin/refunds',
                              { refundId: r.id, approve: false },
                              'Refund request rejected.',
                            )
                          }
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    )}
                    {['processing', 'uncertain', 'approved'].includes(r.status) && (
                      <>
                        <p className="notice">
                          Check the existing provider operation before any retry.
                        </p>
                        <button
                          className="button secondary"
                          disabled={busy || role !== 'owner'}
                          onClick={() =>
                            act(
                              'admin/refunds/reconcile',
                              { refundId: r.id },
                              'Refund provider status checked.',
                            )
                          }
                        >
                          Reconcile this refund
                        </button>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}

            {tab === 'Conversations' && (
              <div className="stack">
                {!data.conversations.length && (
                  <div className="empty-state">
                    <h3>A quiet moment.</h3>
                    <p>Customer conversations will appear here.</p>
                  </div>
                )}
                {data.conversations.map((c: any) => (
                  <section className="panel" key={c.id}>
                    <div className="row spread">
                      <h3>{c.needs_human ? 'Needs a person' : 'Conversation'}</h3>
                      <span className="small muted">
                        {new Date(c.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {c.summary && <p className="notice">{c.summary}</p>}
                    <details>
                      <summary className="text-button">Read {c.messages.length} messages</summary>
                      <div className="admin-transcript">
                        {c.messages.map((m: any) => (
                          <div key={m.id}>
                            {m.publication === 'draft' ? (
                              <ReviewReply
                                message={m}
                                busy={busy}
                                onApprove={(content) =>
                                  act(
                                    'admin/review-message',
                                    { messageId: m.id, content },
                                    'Reply reviewed and published.',
                                  )
                                }
                              />
                            ) : (
                              <p>
                                <b>{m.role}:</b> {m.content}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                    <form
                      className="row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(
                          'admin/handoff',
                          { conversationId: c.id, message: reply[c.id] },
                          'Owner reply saved.',
                        );
                      }}
                    >
                      <input
                        required
                        aria-label="Owner reply"
                        placeholder="Write an owner reply…"
                        value={reply[c.id] ?? ''}
                        onChange={(e) => setReply({ ...reply, [c.id]: e.target.value })}
                      />
                      <button className="button primary" disabled={busy}>
                        Reply & resolve
                      </button>
                    </form>
                  </section>
                ))}
              </div>
            )}

            {tab === 'Evaluations' && (
              <div className="stack">
                <CalibrationReview role={role} />
                <section className="panel">
                  <h2>Measured, not assumed.</h2>
                  <p className="small muted">
                    Deterministic tests run on every pull request. Live suites run manually within
                    the free AI allowance. Human judge calibration and business outcomes are not
                    claimed without real labels or usage.
                  </p>
                </section>
                {!data.evals.length ? (
                  <p className="notice">
                    No evaluation runs recorded yet. Run npm run eval to create the first report.
                  </p>
                ) : (
                  data.evals.map((e: any) => (
                    <section className="panel" key={e.id}>
                      <p className="eyebrow">
                        {e.mode} · {new Date(e.created_at).toLocaleString('en-IN')}
                      </p>
                      <h3 style={{ marginTop: 15 }}>{e.model}</h3>
                      <pre className="report-json">{JSON.stringify(e.metrics, null, 2)}</pre>
                      <p className="small muted">
                        Commit {e.commit_sha} · Prompt {e.prompt_version} · Dataset{' '}
                        {e.dataset_version}
                      </p>
                    </section>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReviewReply({
  message,
  busy,
  onApprove,
}: {
  message: any;
  busy: boolean;
  onApprove: (content: string) => void;
}) {
  const [content, setContent] = useState(message.content);
  return (
    <div className="notice" style={{ margin: '12px 0' }}>
      <p className="eyebrow">DRAFT · OWNER REVIEW</p>
      <textarea
        aria-label="Review assistant draft"
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ width: '100%', margin: '12px 0' }}
      />
      <button
        className="button primary"
        disabled={busy || !content.trim()}
        onClick={() => onApprove(content)}
      >
        Approve this reply
      </button>
    </div>
  );
}

function ReturnReview({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (reason: string) => Promise<any>;
}) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  return (
    <details>
      <summary>Review physical return</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onSubmit(reason)) {
            setReason('');
            setConfirmed(false);
          }
        }}
      >
        <label className="field">
          Inspection note
          <textarea
            required
            minLength={8}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Physical piece received and checked
        </label>
        <button
          className="button secondary"
          disabled={busy || !confirmed || reason.trim().length < 8}
        >
          Restock returned piece
        </button>
      </form>
    </details>
  );
}
