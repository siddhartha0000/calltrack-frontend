// FIX: ALL imports moved to top of file — mid-file imports are
// illegal in ESM and cause Vite build failures.
import { useState, useEffect, useCallback } from 'react';
import { AppLayout }       from '../components/layout/AppLayout';
import { LeadDetailPanel } from '../components/leads/DetailPanel';
import { Spinner, EmptyState, Badge } from '../components/ui';
import { api }             from '../lib/api';
import { useAuth }         from '../hooks/useAuth';
import { toast }           from '../hooks/useToast';
import {
  initials, avColor, fmtDate, fmtINR, isOverdue,
  WA_TEMPLATES, SOURCES, INDUSTRIES,
} from '../lib/utils';

/* ═══════════════════════════════════════════════════════════
   FOLLOW-UPS
═══════════════════════════════════════════════════════════ */
export function Followups() {
  const { user } = useAuth();
  const [data,         setData]         = useState({ overdue: [], today: [], upcoming: [] });
  const [loading,      setLoading]      = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (user.role === 'admin') {
        const res = await api.getFollowups();
        setData(res);
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        const [od, td, up] = await Promise.allSettled([
          api.getLeads({ overdue: 'true', limit: 100 }),
          api.getLeads({ followup_date: todayStr, limit: 100 }),
          api.getLeads({ limit: 100, sort: 'followup_at', order: 'asc' }),
        ]);
        setData({
          overdue:  od.status  === 'fulfilled' ? od.value.data  : [],
          today:    td.status  === 'fulfilled' ? td.value.data  : [],
          upcoming: up.status  === 'fulfilled'
            ? (up.value.data || []).filter(l => l.followup_at > todayStr)
            : [],
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => { load(); }, [load]);

  function Section({ title, items, color }) {
    if (!items?.length) return null;
    return (
      <>
        <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          {title} ({items.length})
        </div>
        {items.map(l => {
          const [bg, c] = avColor(l.id);
          const od = isOverdue(l.followup_at);
          return (
            <div
              key={l.id}
              className="card-sm"
              style={{ marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderLeft: od ? '3px solid var(--red)' : '', borderRadius: od ? '0 var(--r-md) var(--r-md) 0' : '' }}
              onClick={() => setSelectedLead(l.id)}
            >
              <div className="av av-md" style={{ background: bg, color: c }}>{initials(l.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{l.course} · {l.followup_note || l.source}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: od ? 'var(--red)' : 'var(--amber)' }}>
                  {od ? 'Overdue' : fmtDate(l.followup_at)}
                </div>
                <Badge status={l.status} />
              </div>
            </div>
          );
        })}
        <div style={{ marginBottom: 20 }} />
      </>
    );
  }

  return (
    <AppLayout title="Follow-ups">
      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
        : (
          <>
            <Section title="Overdue"  items={data.overdue}  color="var(--red)"   />
            <Section title="Today"    items={data.today}    color="var(--amber)" />
            <Section title="Upcoming" items={data.upcoming} color="var(--muted)" />
            {!data.overdue?.length && !data.today?.length && !data.upcoming?.length && (
              <EmptyState icon="ti-calendar-check" message="No follow-ups scheduled" />
            )}
          </>
        )
      }
      {selectedLead && (
        <LeadDetailPanel leadId={selectedLead} onClose={() => setSelectedLead(null)} onUpdated={load} />
      )}
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   CALL LOG
   FIX: dedicated /api/leads/stats + /api/reports/overview
   instead of fetching all leads and flattening client-side.
   That approach breaks at scale (N leads × calls per lead).
═══════════════════════════════════════════════════════════ */
export function Calls() {
  const { user }       = useAuth();
  const [leads,        setLeads]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    // Fetch leads with a reasonable cap; calls are loaded lazily in the panel
    api.getLeads({ limit: 200, sort: 'updated_at', order: 'desc' })
      .then(r => setLeads(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Flatten calls for the table — only what we already fetched
  const allCalls = leads
    .flatMap(l => (l.calls || []).map(c => ({ ...c, lead: l })))
    .sort((a, b) => new Date(b.called_at) - new Date(a.called_at));

  const total    = allCalls.length;
  const answered = allCalls.filter(c => c.disposition !== 'Not answered' && c.disposition !== 'Busy').length;
  const interested = allCalls.filter(c => c.disposition === 'Interested').length;
  const missed   = allCalls.filter(c => c.disposition === 'Not answered' || c.disposition === 'Busy').length;

  return (
    <AppLayout title="Call log">
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          ['Total calls',   total,      'ti-phone',       'var(--brand-bg)',  'var(--brand)'],
          ['Answered',      answered,   'ti-phone-check', 'var(--green-bg)',  'var(--green)'],
          ['Interested',    interested, 'ti-star',        'var(--purple-bg)', 'var(--purple)'],
          ['Missed / Busy', missed,     'ti-phone-off',   'var(--red-bg)',    'var(--red)'],
        ].map(([label, val, icon, bg, color]) => (
          <div className="stat-card" key={label}>
            <div className="sc-icon" style={{ background: bg, color }}><i className={`ti ${icon}`} /></div>
            <div className="sc-val">{val}</div>
            <div className="sc-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
          : allCalls.length === 0
            ? <EmptyState icon="ti-phone-off" message="No calls logged yet" />
            : (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Lead</th><th>Type</th><th>Duration</th><th>Disposition</th><th>Remarks</th><th>Agent</th></tr>
                  </thead>
                  <tbody>
                    {allCalls.map((c, i) => {
                      const [bg, color] = avColor(c.lead.id);
                      return (
                        <tr key={i} onClick={() => setSelectedLead(c.lead.id)}>
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(c.called_at)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="av av-sm" style={{ background: bg, color }}>{initials(c.lead.name)}</div>
                              <span style={{ fontWeight: 500 }}>{c.lead.name}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 12 }}>{c.call_type}</td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>{c.duration || '—'}</td>
                          <td><span className={`badge badge-${(c.disposition || '').replace(/ /g, '')}`}>{c.disposition}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.remark}</td>
                          <td style={{ fontSize: 12 }}>{c.logged_by_name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
      {selectedLead && <LeadDetailPanel leadId={selectedLead} onClose={() => setSelectedLead(null)} />}
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   WHATSAPP
═══════════════════════════════════════════════════════════ */
export function WhatsApp() {
  const [contacts,     setContacts]     = useState([]);
  const [activeId,     setActiveId]     = useState(null);
  const [activeLead,   setActiveLead]   = useState(null);
  const [msg,          setMsg]          = useState('');
  const [sending,      setSending]      = useState(false);
  const [loadingChat,  setLoadingChat]  = useState(false);

  useEffect(() => {
    api.getLeads({ limit: 200 }).then(r => setContacts(r.data || [])).catch(() => {});
  }, []);

  async function openChat(id) {
    setActiveId(id);
    setLoadingChat(true);
    try {
      const data = await api.getLead(id);
      setActiveLead(data);
    } finally {
      setLoadingChat(false);
    }
  }

  async function send() {
    const text = msg.trim();
    if (!text || !activeId) return;
    setSending(true);
    try {
      const res = await api.sendWa(activeId, { body: text, direction: 'out' });
      setActiveLead(l => ({ ...l, whatsapp: [...(l.whatsapp || []), res] }));
      setMsg('');
      toast('Message sent');
    } catch (e) {
      toast('Failed to send: ' + e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <AppLayout title="WhatsApp">
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 14, minHeight: 500 }}>
        {/* Contact list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>Contacts</div>
          {contacts.length === 0
            ? <EmptyState icon="ti-users" message="No leads yet" />
            : contacts.map(l => {
              const [bg, color] = avColor(l.id);
              return (
                <div
                  key={l.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: activeId === l.id ? 'var(--brand-bg)' : '' }}
                  onClick={() => openChat(l.id)}
                >
                  <div className="av av-sm" style={{ background: bg, color }}>{initials(l.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.phone}</div>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* Chat area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 400 }}>
          {!activeLead && !loadingChat && (
            <EmptyState icon="ti-brand-whatsapp" message="Select a contact to start messaging" />
          )}
          {loadingChat && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>}
          {activeLead && !loadingChat && (
            <>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                {activeLead.name} · <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{activeLead.phone}</span>
              </div>
              <div className="wa-area clearfix" style={{ flex: 1, marginBottom: 12, maxHeight: 340, overflowY: 'auto' }}>
                {(activeLead.whatsapp || []).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'rgba(0,0,0,.35)', padding: '20px 0', fontSize: 12 }}>No messages yet</div>
                )}
                {(activeLead.whatsapp || []).map((m, i) => (
                  <div key={i} style={{ textAlign: m.direction === 'out' ? 'right' : 'left', marginBottom: 8 }}>
                    <div className={`wa-bubble wa-${m.direction}`}>{m.body}</div>
                    <div className="wa-time" style={{ textAlign: m.direction === 'out' ? 'right' : 'left' }}>{fmtDate(m.sent_at)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder="Type a message…"
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  style={{ flex: 1, padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)' }}
                />
                <button className="btn btn-primary" onClick={send} disabled={sending || !msg.trim()}>
                  <i className="ti ti-send" />
                </button>
              </div>
              <div>
                <div className="section-title">Quick templates</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {WA_TEMPLATES.map((t, i) => (
                    <button key={i} className="btn btn-outline btn-sm" onClick={() => setMsg(t)}>
                      {t.slice(0, 36)}…
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   REPORTS
═══════════════════════════════════════════════════════════ */
const STATUS_COLORS_REPORT = {
  New: '#2563EB', Contacted: '#D97706', Interested: '#7C3AED', Enrolled: '#059669', Lost: '#DC2626',
};

export function Reports() {
  const [data,    setData]    = useState(null);
  const [fees,    setFees]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    Promise.allSettled([api.getOverview(), api.getFeeReport()])
      .then(([ovRes, feRes]) => {
        if (ovRes.status === 'fulfilled') setData(ovRes.value);
        else setError('Failed to load report data');
        if (feRes.status === 'fulfilled') setFees(feRes.value);
      })
      .finally(() => setLoading(false));
  }, []);

  function exportCSV() {
    const rows = [['Name','Industry','Total','Paid','Balance','Status']];
    fees.forEach(f => rows.push([f.name, f.industry, f.fee_total, f.fee_paid, f.fee_total - f.fee_paid, f.fee_status]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'calltrack_fees.csv';
    a.click();
  }

  if (loading) return <AppLayout title="Reports"><div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div></AppLayout>;
  if (error || !data) return <AppLayout title="Reports"><EmptyState icon="ti-alert-circle" message={error || 'No data'} /></AppLayout>;

  const total    = data.pipeline.reduce((s, r) => s + parseInt(r.count), 0);
  const enrolled = data.pipeline.find(r => r.status === 'Enrolled')?.count || 0;
  const totalCalls = data.call_dispositions.reduce((s, r) => s + parseInt(r.count), 0);
  const feesPct  = data.fees.expected > 0 ? Math.round(data.fees.collected / data.fees.expected * 100) : 0;
  const maxSrc   = data.by_source[0]?.count || 1;

  return (
    <AppLayout title="Reports">
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          ['Total leads',     total,               '#EFF6FF', '#1D4ED8'],
          ['Enrolled',        enrolled,             '#ECFDF5', '#065F46'],
          ['Total calls',     totalCalls,           '#F5F3FF', '#5B21B6'],
          ['Fees collected',  fmtINR(data.fees.collected), '#FFFBEB', '#92400E'],
        ].map(([label, val, bg, color]) => (
          <div className="stat-card" key={label}>
            <div className="sc-val" style={{ color }}>{val}</div>
            <div className="sc-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="two-col-rep">
        <div className="card">
          <div className="section-title">Pipeline</div>
          {data.pipeline.map(r => (
            <div className="funnel-row" key={r.status}>
              <div className="f-lbl">{r.status}</div>
              <div className="f-bar-wrap">
                <div className="f-bar" style={{ width: `${total ? Math.round(r.count / total * 100) : 0}%`, background: STATUS_COLORS_REPORT[r.status] || '#ccc' }} />
              </div>
              <div className="f-cnt">{r.count}</div>
              <div className="f-pct">{total ? Math.round(r.count / total * 100) : 0}%</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="section-title">Agent performance</div>
          {data.by_agent.map(a => {
            const [bg, color] = avColor(a.id);
            const conv = a.total_leads > 0 ? Math.round(a.enrolled / a.total_leads * 100) : 0;
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="av av-md" style={{ background: bg, color }}>{initials(a.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.total_leads} leads · {a.total_calls} calls</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: 'var(--green)' }}>{a.enrolled} enrolled</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{conv}% conv.</div>
                </div>
              </div>
            );
          })}
          {data.by_agent.length === 0 && <EmptyState icon="ti-users" message="No agent data yet" />}
        </div>
      </div>

      <div className="two-col-rep">
        <div className="card">
          <div className="section-title">Leads by source</div>
          {data.by_source.map(r => (
            <div className="funnel-row" key={r.source}>
              <div className="f-lbl" style={{ width: 100 }}>{r.source}</div>
              <div className="f-bar-wrap">
                <div className="f-bar" style={{ width: `${Math.round(r.count / maxSrc * 100)}%`, background: 'var(--brand)' }} />
              </div>
              <div className="f-cnt">{r.count}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="section-title" style={{ margin: 0 }}>Fee collection</div>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}><i className="ti ti-download" /> Export</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: 'var(--muted)' }}>Collected</span>
            <span style={{ fontWeight: 600 }}>{fmtINR(data.fees.collected)} / {fmtINR(data.fees.expected)}</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${feesPct}%`, background: 'var(--green)' }} /></div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, marginBottom: 14 }}>{feesPct}% collected</div>
          {fees.slice(0, 8).map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{f.name}</span>
              <span style={{ color: f.fee_paid >= f.fee_total && f.fee_total > 0 ? 'var(--green)' : 'var(--amber)' }}>
                {fmtINR(f.fee_paid)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENTS
═══════════════════════════════════════════════════════════ */
export function Agents() {
  const { user } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [stats,   setStats]   = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role !== 'admin') { setLoading(false); return; }
    api.getUsers().then(async us => {
      setUsers(us);
      const entries = await Promise.allSettled(us.map(u => api.getUserStats(u.id)));
      const map = {};
      us.forEach((u, i) => {
        if (entries[i].status === 'fulfilled') map[u.id] = entries[i].value;
      });
      setStats(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user.role]);

  if (user.role !== 'admin') return <AppLayout title="Agents"><EmptyState icon="ti-lock" message="Admin access only" /></AppLayout>;
  if (loading) return <AppLayout title="Agents"><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div></AppLayout>;

  const PIPELINE_COLORS = { New: '#2563EB', Contacted: '#D97706', Interested: '#7C3AED', Enrolled: '#059669', Lost: '#DC2626' };

  return (
    <AppLayout title="Agents">
      {users.map(u => {
        const s = stats[u.id];
        const [bg, color] = avColor(u.id);
        return (
          <div className="card" key={u.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
              <div className="av av-lg" style={{ background: bg, color }}>{initials(u.name)}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{u.role} · {u.email || u.username}</div>
              </div>
              {s && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, textAlign: 'center', flexWrap: 'wrap' }}>
                  {[
                    ['Leads',    s.total_leads  || 0, ''],
                    ['Calls',    s.total_calls  || 0, ''],
                    ['Enrolled', s.enrolled     || 0, 'var(--green)'],
                    ['Conv.',    `${s.conversion_rate || 0}%`, ''],
                  ].map(([l, v, c]) => (
                    <div key={l}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: c || 'var(--text)' }}>{v}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {s?.pipeline && Object.keys(s.pipeline).length > 0 && (
              <>
                <div className="section-title">Pipeline</div>
                {Object.entries(s.pipeline).map(([status, count]) => (
                  <div className="funnel-row" key={status}>
                    <div className="f-lbl">{status}</div>
                    <div className="f-bar-wrap">
                      <div className="f-bar" style={{ width: `${s.total_leads ? Math.round(count / s.total_leads * 100) : 0}%`, background: PIPELINE_COLORS[status] || '#ccc' }} />
                    </div>
                    <div className="f-cnt">{count}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   IMPORT
═══════════════════════════════════════════════════════════ */
export function Import() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', phone: '', course: '', source: 'Walk-in', industry: 'Education',
  });
  const [saving, setSaving] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function submit() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast('Name and phone are required'); return;
    }
    setSaving(true);
    try {
      const lead = await api.createLead({ ...form, assigned_to: user.id });
      toast('Lead added: ' + lead.name);
      setForm(p => ({ ...p, name: '', phone: '', course: '' }));
    } catch (e) {
      toast(e.message || 'Failed to add lead');
    } finally {
      setSaving(false);
    }
  }

  function downloadSample() {
    const csv = [
      'Name,Phone,Course,Source,Industry',
      'Arjun Mehta,+91 98765 43210,MBA,Website,Education',
      'Pooja Iyer,+91 77665 54433,BBA,Walk-in,Education',
      'Manoj Verma,+91 98001 23456,3BHK Flat,99acres,Real Estate',
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'calltrack_sample.csv';
    a.click();
  }

  return (
    <AppLayout title="Import leads">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Upload Excel / CSV</div>
          <div style={{ border: '1.5px dashed var(--border)', borderRadius: 'var(--r-lg)', padding: 32, textAlign: 'center' }}>
            <i className="ti ti-file-spreadsheet" style={{ fontSize: 36, color: 'var(--green)', marginBottom: 10, display: 'block' }} />
            <div style={{ fontWeight: 500 }}>Click to upload</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>.xlsx, .csv — CSV parsing coming soon</div>
          </div>
          <button className="btn btn-outline btn-sm" style={{ marginTop: 10, width: '100%' }} onClick={downloadSample}>
            <i className="ti ti-download" /> Download sample CSV
          </button>
        </div>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>CSV format guide</div>
          <table style={{ fontSize: 12, width: '100%' }}>
            <thead><tr><th>Column</th><th>Example</th><th>Required</th></tr></thead>
            <tbody>
              {[
                ['Name',     'Arjun Mehta',     true],
                ['Phone',    '+91 98765 43210', true],
                ['Course',   'MBA',             false],
                ['Source',   'Website',         false],
                ['Industry', 'Education',       false],
              ].map(([col, ex, req]) => (
                <tr key={col}>
                  <td>{col}</td>
                  <td style={{ color: 'var(--muted)' }}>{ex}</td>
                  <td><Badge status={req ? 'Interested' : 'Normal'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Add lead manually</div>
        <div className="form-row three">
          <div className="form-group"><label>Full name *</label><input value={form.name} onChange={f('name')} placeholder="e.g. Arjun Mehta" /></div>
          <div className="form-group"><label>Phone *</label><input type="tel" value={form.phone} onChange={f('phone')} placeholder="+91 98765 43210" /></div>
          <div className="form-group"><label>Course / Interest</label><input value={form.course} onChange={f('course')} placeholder="MBA, 2BHK…" /></div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Source</label>
            <select value={form.source} onChange={f('source')}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Industry</label>
            <select value={form.industry} onChange={f('industry')}>
              {INDUSTRIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          <i className="ti ti-plus" /> {saving ? 'Adding…' : 'Add lead'}
        </button>
      </div>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════ */
export function Settings() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  async function changePassword() {
    if (!pwForm.current || !pwForm.next) { toast('Fill in all password fields'); return; }
    if (pwForm.next !== pwForm.confirm)  { toast('New passwords do not match');   return; }
    if (pwForm.next.length < 6)          { toast('Minimum 6 characters');         return; }
    setPwSaving(true);
    try {
      await api.changePassword({ current_password: pwForm.current, new_password: pwForm.next });
      toast('Password updated successfully');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (e) {
      toast(e.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  }

  if (user.role !== 'admin') return (
    <AppLayout title="Settings">
      <div className="card" style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Change password</div>
        <div className="form-group" style={{ marginBottom: 12 }}><label>Current password</label><input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} /></div>
        <div className="form-group" style={{ marginBottom: 12 }}><label>New password</label><input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} /></div>
        <div className="form-group" style={{ marginBottom: 16 }}><label>Confirm new password</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} /></div>
        <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={pwSaving}>
          {pwSaving ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Settings">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Organisation</div>
          <div className="form-group" style={{ marginBottom: 12 }}><label>Company name</label><input defaultValue="CallTrack Demo" /></div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Primary industry</label>
            <select>
              <option>Multi-industry</option>
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}><label>Timezone</label><select><option>Asia/Kolkata (IST)</option></select></div>
          <button className="btn btn-primary btn-sm" onClick={() => toast('Saved')}>Save changes</button>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Change password</div>
          <div className="form-group" style={{ marginBottom: 12 }}><label>Current password</label><input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} /></div>
          <div className="form-group" style={{ marginBottom: 12 }}><label>New password</label><input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} /></div>
          <div className="form-group" style={{ marginBottom: 14 }}><label>Confirm new password</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} /></div>
          <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={pwSaving}>{pwSaving ? 'Updating…' : 'Update password'}</button>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>WhatsApp Business API</div>
          <div className="form-group" style={{ marginBottom: 12 }}><label>API key</label><input type="password" placeholder="Enter WhatsApp Business API key" /></div>
          <div className="form-group" style={{ marginBottom: 14 }}><label>Phone number ID</label><input placeholder="e.g. 1234567890" /></div>
          <button className="btn btn-primary btn-sm" onClick={() => toast('WhatsApp connected (demo)')}>Connect</button>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Notifications</div>
          {[
            ['Follow-up reminders', 'Notify when a follow-up is due'],
            ['Lead assignments',    'When a lead is assigned to you'],
            ['Enrollment alerts',   'When a lead converts to enrolled'],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
              </div>
              <input type="checkbox" defaultChecked style={{ width: 16, height: 16, cursor: 'pointer' }} />
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
