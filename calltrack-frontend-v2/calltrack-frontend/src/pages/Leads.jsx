import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { LeadDetailPanel } from '../components/leads/DetailPanel';
import { AddLeadModal } from '../components/leads/AddLeadModal';
import { Spinner, EmptyState } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { initials, avColor, fmtDate, isOverdue, STATUSES } from '../lib/utils';

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100, sort, order: 'desc' };
      if (filter !== 'All') params.status = filter;
      if (search) params.search = search;
      const [res, stats] = await Promise.all([api.getLeads(params), api.getLeadStats()]);
      setLeads(res.data); setTotal(res.total);
      setCounts(stats.pipeline || {});
    } finally { setLoading(false); }
  }, [filter, search, sort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (user.role === 'admin') api.getUsers().then(setUsers); }, []);

  return (
    <AppLayout title={`Leads (${total})`} onSearch={setSearch} onAddLead={() => setShowAdd(true)}>
      <div className="page-header">
        <h2>Leads <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>({total})</span></h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="created_at">Recent first</option>
            <option value="name">A–Z</option>
            <option value="status">By status</option>
            <option value="followup_at">Follow-up date</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><i className="ti ti-plus" /> Add lead</button>
        </div>
      </div>

      <div className="filters-row">
        {['All', ...STATUSES].map(s => (
          <div key={s} className={`chip${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
            {s}{s !== 'All' ? ` (${counts[s] || 0})` : ''}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
        ) : leads.length === 0 ? (
          <EmptyState icon="ti-user-off" message="No leads found" />
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Phone</th><th>Course</th><th>Status</th>
                  <th>Agent</th><th>Follow-up</th><th>Source</th><th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => {
                  const [bg, color] = avColor(l.id);
                  const od = isOverdue(l.followup_at);
                  return (
                    <tr key={l.id} className={od ? 'overdue-row' : ''} onClick={() => setSelectedLead(l.id)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="av av-sm" style={{ background: bg, color }}>{initials(l.name)}</div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{l.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.industry}</div>
                          </div>
                          {l.priority === 'Hot' && <span className="hot-pill">HOT</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--brand)', fontSize: 12 }}>{l.phone}</td>
                      <td style={{ fontSize: 12 }}>{l.course || '—'}</td>
                      <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                      <td style={{ fontSize: 12 }}>{l.agent_name || '—'}</td>
                      <td style={{ fontSize: 12, color: od ? 'var(--red)' : 'var(--muted)', fontWeight: od ? 600 : 400 }}>
                        {fmtDate(l.followup_at)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{l.source}</td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); setSelectedLead(l.id); }}>
                          <i className="ti ti-chevron-right" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLead && <LeadDetailPanel leadId={selectedLead} onClose={() => setSelectedLead(null)} onUpdated={load} />}
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onCreated={load} users={users} currentUser={user} />}
    </AppLayout>
  );
}
