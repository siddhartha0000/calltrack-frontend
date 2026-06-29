import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Avatar, Badge } from '../ui';
import { fmtDate, fmtINR, isOverdue, DISPOSITIONS, STATUS_COLORS, STATUSES, WA_TEMPLATES } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

const TABS = ['Profile', 'Calls', 'Notes', 'Timeline', 'Fees'];

export function LeadDetailPanel({ leadId, onClose, onUpdated }) {
  const [lead, setLead] = useState(null);
  const [tab, setTab] = useState('Profile');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    setTab('Profile');
    setLoading(true);
    api.getLead(leadId).then(data => { setLead(data); setLoading(false); }).catch(() => setLoading(false));
  }, [leadId]);

  async function setStatus(status) {
    await api.updateLead(lead.id, { status });
    setLead(l => ({ ...l, status }));
    onUpdated?.();
    toast('Status → ' + status);
  }

  if (!leadId) return null;

  return (
    <div className={`detail-panel ${leadId ? 'open' : ''}`}>
      <div className="dp-header">
        <button className="btn btn-icon btn-outline" onClick={onClose}><i className="ti ti-x" /></button>
        {lead && <Avatar name={lead.name} id={lead.id} size="md" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{lead?.name || '…'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{lead?.phone} · {lead?.course}</div>
        </div>
        {lead && <Badge status={lead.status} />}
      </div>

      {lead && (
        <div className="dp-stage">
          {STATUSES.map(s => (
            <button key={s} className="stage-btn" onClick={() => setStatus(s)}
              style={{
                borderColor: STATUS_COLORS[s] + '60',
                background: lead.status === s ? STATUS_COLORS[s] + '18' : 'transparent',
                color: lead.status === s ? STATUS_COLORS[s] : 'var(--muted)',
              }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="dp-tabs">
        {TABS.map(t => (
          <button key={t} className={`dp-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="dp-body">
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          : lead ? <TabContent tab={tab} lead={lead} setLead={setLead} onUpdated={onUpdated} />
          : null}
      </div>
    </div>
  );
}

function TabContent({ tab, lead, setLead, onUpdated }) {
  if (tab === 'Profile') return <ProfileTab lead={lead} setLead={setLead} onUpdated={onUpdated} />;
  if (tab === 'Calls')   return <CallsTab lead={lead} setLead={setLead} />;
  if (tab === 'Notes')   return <NotesTab lead={lead} setLead={setLead} />;
  if (tab === 'Timeline')return <TimelineTab lead={lead} />;
  if (tab === 'Fees')    return <FeesTab lead={lead} setLead={setLead} />;
}

function ProfileTab({ lead, setLead, onUpdated }) {
  const [fuDate, setFuDate] = useState(lead.followup_at?.slice(0, 10) || '');
  const [fuNote, setFuNote] = useState(lead.followup_note || '');

  async function saveFollowup() {
    await api.updateLead(lead.id, { followup_at: fuDate || null, followup_note: fuNote });
    setLead(l => ({ ...l, followup_at: fuDate, followup_note: fuNote }));
    onUpdated?.();
    toast('Follow-up saved');
  }

  const fields = [
    ['Phone', <a href={`tel:${lead.phone}`} style={{ color: 'var(--brand)' }}>{lead.phone}</a>],
    ['Email', lead.email || '—'],
    ['Course / Interest', lead.course || '—'],
    ['Industry', lead.industry],
    ['Source', lead.source],
    ['Priority', <Badge status={lead.priority} />],
    ['Agent', lead.agent_name || '—'],
    ['Added', fmtDate(lead.created_at)],
  ];

  return (
    <>
      <div className="section-title">Contact info</div>
      {fields.map(([k, v]) => (
        <div className="field-row" key={k}>
          <span className="field-key">{k}</span>
          <span className="field-val">{v}</span>
        </div>
      ))}
      <div className="divider" />
      <div className="section-title">Follow-up</div>
      <div className="field-row">
        <span className="field-key">Date</span>
        <span className="field-val" style={{ color: isOverdue(lead.followup_at) ? 'var(--red)' : '' }}>
          {fmtDate(lead.followup_at)}
        </span>
      </div>
      <div className="field-row">
        <span className="field-key">Note</span>
        <span className="field-val">{lead.followup_note || '—'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)}
          style={{ flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)' }} />
        <input type="text" value={fuNote} onChange={e => setFuNote(e.target.value)} placeholder="Note…"
          style={{ flex: 2, padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)' }} />
        <button className="btn btn-sm btn-primary" onClick={saveFollowup}>Save</button>
      </div>
    </>
  );
}

function CallsTab({ lead, setLead }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ call_type: 'Outbound', disposition: '', duration: '', remark: '', followup_at: '', followup_note: '' });
  const [selDisp, setSelDisp] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!selDisp) { toast('Select a disposition'); return; }
    setSaving(true);
    try {
      const res = await api.logCall(lead.id, { ...form, disposition: selDisp });
      setLead(l => ({ ...l, calls: [res, ...l.calls] }));
      setShowForm(false);
      setSelDisp('');
      toast('Call logged');
    } finally { setSaving(false); }
  }

  return (
    <>
      <button className="btn btn-primary btn-sm" style={{ marginBottom: 14 }} onClick={() => setShowForm(v => !v)}>
        <i className="ti ti-plus" /> Log call
      </button>
      {showForm && (
        <div className="card-sm" style={{ marginBottom: 14 }}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group">
              <label>Call type</label>
              <select value={form.call_type} onChange={e => setForm(f => ({ ...f, call_type: e.target.value }))}>
                <option>Outbound</option><option>Inbound</option><option>WhatsApp call</option>
              </select>
            </div>
            <div className="form-group">
              <label>Duration</label>
              <input placeholder="e.g. 5 min" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
          </div>
          <div className="section-title">Disposition</div>
          <div className="disp-grid" style={{ marginBottom: 10 }}>
            {DISPOSITIONS.map(d => (
              <button key={d.label} className={`disp-btn${selDisp === d.label ? ` sel ${d.cls}` : ''}`} onClick={() => setSelDisp(d.label)}>
                {d.label}
              </button>
            ))}
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>Remarks</label>
            <textarea value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} placeholder="What was discussed…" />
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group">
              <label>Follow-up date</label>
              <input type="date" value={form.followup_at} onChange={e => setForm(f => ({ ...f, followup_at: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Follow-up note</label>
              <input value={form.followup_note} onChange={e => setForm(f => ({ ...f, followup_note: e.target.value }))} placeholder="e.g. Call after 3pm" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save call'}</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
      {lead.calls?.length ? lead.calls.map((c, i) => (
        <div className="call-item" key={i}>
          <div className="call-icon" style={{ background: c.call_type === 'Inbound' ? 'var(--green-bg)' : 'var(--brand-bg)', color: c.call_type === 'Inbound' ? 'var(--green)' : 'var(--brand)' }}>
            <i className={`ti ti-phone-${c.call_type === 'Inbound' ? 'incoming' : 'outgoing'}`} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{c.call_type} · {c.duration || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmtDate(c.called_at)} · {c.logged_by_name}</div>
            <Badge status={c.disposition} />
            <div style={{ fontSize: 13, marginTop: 6 }}>{c.remark}</div>
          </div>
        </div>
      )) : <div className="empty-state"><i className="ti ti-phone-off" /><p>No calls yet</p></div>}
    </>
  );
}

function NotesTab({ lead, setLead }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await api.addNote(lead.id, { body: text });
      setLead(l => ({ ...l, notes: [res, ...l.notes] }));
      setText('');
      toast('Note saved');
    } finally { setSaving(false); }
  }

  return (
    <>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Add a note…"
        style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontFamily: 'inherit', fontSize: 13, minHeight: 80, marginBottom: 8, color: 'var(--text)' }} />
      <button className="btn btn-primary btn-sm" style={{ marginBottom: 16 }} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save note'}
      </button>
      {lead.notes?.length ? lead.notes.map((n, i) => (
        <div key={i} style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>{n.body}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{n.author_name} · {fmtDate(n.created_at)}</div>
        </div>
      )) : <div style={{ color: 'var(--hint)', fontSize: 13 }}>No notes yet</div>}
    </>
  );
}

function TimelineTab({ lead }) {
  const events = [
    { e: 'Lead created', t: lead.created_at, bg: 'var(--brand-bg)', c: 'var(--brand)', ic: 'ti-user-plus' },
    ...(lead.calls || []).map(c => ({ e: `${c.call_type} — ${c.disposition}`, t: c.called_at, bg: 'var(--green-bg)', c: 'var(--green)', ic: 'ti-phone' })),
    ...(lead.notes || []).map(n => ({ e: `Note by ${n.author_name}`, t: n.created_at, bg: 'var(--purple-bg)', c: 'var(--purple)', ic: 'ti-note' })),
    { e: `Current status: ${lead.status}`, t: lead.updated_at, bg: 'var(--amber-bg)', c: 'var(--amber)', ic: 'ti-flag' },
  ].sort((a, b) => new Date(b.t) - new Date(a.t));

  return (
    <>
      {events.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: ev.bg, color: ev.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              <i className={`ti ${ev.ic}`} />
            </div>
            {i < events.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 14, margin: '4px 0' }} />}
          </div>
          <div style={{ paddingTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.e}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmtDate(ev.t)}</div>
          </div>
        </div>
      ))}
    </>
  );
}

function FeesTab({ lead, setLead }) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Cash');
  const [saving, setSaving] = useState(false);
  const pct = lead.fee_total > 0 ? Math.round(lead.fee_paid / lead.fee_total * 100) : 0;

  async function record() {
    if (!amount) return;
    setSaving(true);
    try {
      await api.recordPayment(lead.id, { amount: parseFloat(amount), payment_mode: mode });
      const newPaid = parseFloat(lead.fee_paid) + parseFloat(amount);
      setLead(l => ({ ...l, fee_paid: newPaid, fee_status: newPaid >= l.fee_total && l.fee_total > 0 ? 'Paid' : 'Partial' }));
      setAmount('');
      toast(fmtINR(amount) + ' recorded');
    } finally { setSaving(false); }
  }

  return (
    <>
      {[['Total fees', fmtINR(lead.fee_total), ''],
        ['Paid', fmtINR(lead.fee_paid), 'var(--green)'],
        ['Balance', fmtINR(lead.fee_total - lead.fee_paid), lead.fee_total - lead.fee_paid > 0 ? 'var(--red)' : 'var(--green)'],
        ['Status', <Badge status={lead.fee_status || 'Not started'} />, ''],
        ['Due date', fmtDate(lead.fee_due_date), ''],
      ].map(([k, v, c]) => (
        <div className="field-row" key={k}>
          <span className="field-key">{k}</span>
          <span className="field-val" style={{ color: c || 'var(--text)' }}>{v}</span>
        </div>
      ))}
      {lead.fee_total > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, color: 'var(--muted)' }}>
            <span>Collection progress</span><span style={{ fontWeight: 600, color: 'var(--text)' }}>{pct}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--green)' }} /></div>
        </div>
      )}
      <div className="divider" />
      <div className="section-title">Record payment</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="number" placeholder="Amount (₹)" value={amount} onChange={e => setAmount(e.target.value)}
          style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)' }} />
        <select value={mode} onChange={e => setMode(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)' }}>
          <option>Cash</option><option>UPI</option><option>Cheque</option><option>Online transfer</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={record} disabled={saving}>Record</button>
      </div>
    </>
  );
}
