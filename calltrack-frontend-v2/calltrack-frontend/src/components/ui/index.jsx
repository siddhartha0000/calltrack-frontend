import { initials, avColor } from '../../lib/utils';

export function Avatar({ name, id, size = 'md' }) {
  const [bg, color] = avColor(id);
  return (
    <div className={`av av-${size}`} style={{ background: bg, color }}>
      {initials(name)}
    </div>
  );
}

export function Badge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function Spinner() {
  return <div className="spinner" />;
}

export function EmptyState({ icon = 'ti-mood-empty', message = 'Nothing here yet' }) {
  return (
    <div className="empty-state">
      <i className={`ti ${icon}`} />
      <p>{message}</p>
    </div>
  );
}

export function StatCard({ icon, iconBg, iconColor, value, label, sub }) {
  return (
    <div className="stat-card">
      <div className="sc-icon" style={{ background: iconBg, color: iconColor }}>
        <i className={`ti ${icon}`} />
      </div>
      <div className="sc-val">{value}</div>
      <div className="sc-label">{label}</div>
      {sub && <div className="sc-sub">{sub}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-icon btn-outline" onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function FunnelChart({ data, total, colors }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div>
      {Object.entries(data).map(([label, count]) => (
        <div className="funnel-row" key={label}>
          <div className="f-lbl">{label}</div>
          <div className="f-bar-wrap">
            <div className="f-bar" style={{ width: `${Math.round(count / max * 100)}%`, background: colors?.[label] || '#2563EB' }} />
          </div>
          <div className="f-cnt">{count}</div>
          <div className="f-pct">{total ? Math.round(count / total * 100) : 0}%</div>
        </div>
      ))}
    </div>
  );
}
