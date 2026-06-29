import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatCard, FunnelChart, EmptyState, Spinner } from '../components/ui';
import { LeadDetailPanel } from '../components/leads/DetailPanel';
import { AddLeadModal } from '../components/leads/AddLeadModal';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { fmtINR, fmtDate, isOverdue, STATUS_COLORS, initials, avColor } from '../lib/utils';

const STATUSES = ['New','Contacted','Interested','Enrolled','Lost'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [stats,        setStats]        = useState(null);
  const [recentLeads,  setRecentLeads]  = useState([]);
  const [followups,    setFollowups]    = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [users,        setUsers]        = useState([]);
  const [error,        setError]        = useState(null);
  const [loading,      setLoading]      = useState(true);

  // FIX: individual settled promises — one failing API call
  // no longer crashes the whole dashboard.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        api.getLeadStats(),
        api.getLeads({ limit: 6, sort: 'created_at', order: 'desc' }),
        user.role === 'admin'
          ? api.getFollowups()
          : api.getLeads({ overdue: 'true', limit: 10 }),
        user.role === 'admin' ? api.getUsers() : Promise.resolve([]),
      ]);

      const [statsRes, leadsRes, fuRes, usersRes] = results;

      if (statsRes.status       === 'fulfilled') setStats(statsRes.value);
      if (leadsRes.status       === 'fulfilled') setRecentLeads(leadsRes.value.data || []);
      if (usersRes.status       === 'fulfilled') setUsers(Array.isArray(usersRes.value) ? usersRes.value : []);

      if (fuRes.status === 'fulfilled') {
        const fu = fuRes.value;
        if (user.role === 'admin') {
          setFollowups([...(fu.overdue || []), ...(fu.today || [])]);
        } else {
          setFollowups(fu.data || []);
        }
      }

      // Surface error only if the critical stats call fails
      if (statsRes.status === 'rejected') {
        setError('Failed to load dashboard data. Please refresh.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => { load(); }, [load]);

  const total = stats
    ? Object.values(stats.pipeline).reduce((a, b) => a + b, 0)
    : 0;

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Dashboard">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--red)' }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
          <p>{error}</p>
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={load}>Retry</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" onAddLead={() => setShowAdd(true)}>
      <div className="stat-grid">
        <StatCard
          icon="ti-users" iconBg="var(--brand-bg)" iconColor="var(--brand)"
          value={total} label="Total leads"
          sub={`${stats?.pipeline?.New || 0} new`}
        />
        <StatCard
          icon="ti-award" iconBg="var(--green-bg)" iconColor="var(--green)"
          value={stats?.pipeline?.Enrolled || 0} label="Enrolled"
          sub={`${total ? Math.round((stats?.pipeline?.Enrolled || 0) / total * 100) : 0}% conversion`}
        />
        <StatCard
          icon="ti-calendar-event" iconBg="var(--amber-bg)" iconColor="var(--amber)"
          value={stats?.overdue_followups || 0} label="Overdue follow-ups"
          sub={`${stats?.today_followups || 0} due today`}
        />
        <StatCard
          icon="ti-currency-rupee" iconBg="var(--sky-bg)" iconColor="var(--sky)"
          value={fmtINR(stats?.fees?.paid || 0)} label="Fees collected"
          sub={`${stats?.calls_today || 0} calls today`}
        />
      </div>

      <div className="two-col-dash">
        <div className="card">
          <div className="section-title">Pipeline funnel</div>
          {stats?.pipeline && (
            <FunnelChart data={stats.pipeline} total={total} colors={STATUS_COLORS} />
          )}
        </div>
        <div className="card">
          <div className="section-title">Due follow-ups</div>
          {followups.length ? followups.slice(0, 6).map(l => {
            const [bg, color] = avColor(l.id);
            const od = isOverdue(l.followup_at);
            return (
              <div
                key={l.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setSelectedLead(l.id)}
              >
                <div className="av av-sm" style={{ background: bg, color }}>{initials(l.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.course || l.industry}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: od ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }}>
                  {od ? 'Overdue' : fmtDate(l.followup_at)}
                </div>
              </div>
            );
          }) : <EmptyState icon="ti-calendar-check" message="All caught up!" />}
          <button className="btn btn-outline btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => navigate('/followups')}>
            View all follow-ups
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="section-title" style={{ margin: 0 }}>Recent leads</div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/leads')}>View all</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Course</th><th>Status</th><th>Agent</th><th>Follow-up</th></tr>
            </thead>
            <tbody>
              {recentLeads.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon="ti-user-off" message="No leads yet" /></td></tr>
              ) : recentLeads.map(l => {
                const [bg, color] = avColor(l.id);
                return (
                  <tr key={l.id} onClick={() => setSelectedLead(l.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="av av-sm" style={{ background: bg, color }}>{initials(l.name)}</div>
                        <span style={{ fontWeight: 500 }}>{l.name}</span>
                        {l.priority === 'Hot' && <span className="hot-pill">HOT</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--brand)', fontSize: 12 }}>{l.phone}</td>
                    <td style={{ fontSize: 12 }}>{l.course || '—'}</td>
                    <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                    <td style={{ fontSize: 12 }}>{l.agent_name || '—'}</td>
                    <td style={{ fontSize: 12, color: isOverdue(l.followup_at) ? 'var(--red)' : 'var(--muted)' }}>
                      {fmtDate(l.followup_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLead && (
        <LeadDetailPanel
          leadId={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={load}
        />
      )}
      {showAdd && (
        <AddLeadModal
          onClose={() => setShowAdd(false)}
          onCreated={load}
          users={users}
          currentUser={user}
        />
      )}
    </AppLayout>
  );
}
