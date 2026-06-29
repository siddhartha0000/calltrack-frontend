import { useState } from 'react';
import { api } from '../../lib/api';
import { Modal } from '../ui';
import { INDUSTRIES, SOURCES, STATUSES } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

export function AddLeadModal({ onClose, onCreated, users = [], currentUser }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', course: '',
    industry: 'Education', source: 'Walk-in',
    status: 'New', priority: 'Normal',
    assigned_to: currentUser?.role === 'admin' ? '' : currentUser?.id,
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function submit() {
    if (!form.name || !form.phone) { toast('Name and phone are required'); return; }
    setSaving(true);
    try {
      const lead = await api.createLead({ ...form, assigned_to: form.assigned_to || undefined });
      if (form.note) await api.addNote(lead.id, { body: form.note });
      toast('Lead added: ' + lead.name);
      onCreated?.(lead);
      onClose();
    } catch (e) { toast(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Add new lead" onClose={onClose}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          <i className="ti ti-plus" /> {saving ? 'Adding…' : 'Add lead'}
        </button>
      </>}>
      <div className="form-row">
        <div className="form-group"><label>Full name *</label><input placeholder="e.g. Arjun Mehta" value={form.name} onChange={f('name')} /></div>
        <div className="form-group"><label>Phone *</label><input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={f('phone')} /></div>
      </div>
      <div className="form-row three">
        <div className="form-group"><label>Course / Interest</label><input placeholder="MBA, 2BHK…" value={form.course} onChange={f('course')} /></div>
        <div className="form-group"><label>Industry</label>
          <select value={form.industry} onChange={f('industry')}>{INDUSTRIES.map(i => <option key={i}>{i}</option>)}</select></div>
        <div className="form-group"><label>Source</label>
          <select value={form.source} onChange={f('source')}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="form-row three">
        <div className="form-group"><label>Priority</label>
          <select value={form.priority} onChange={f('priority')}><option>Hot</option><option>Normal</option><option>Cold</option></select></div>
        <div className="form-group"><label>Status</label>
          <select value={form.status} onChange={f('status')}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
        {currentUser?.role === 'admin' && (
          <div className="form-group"><label>Assign to</label>
            <select value={form.assigned_to} onChange={f('assigned_to')}>
              <option value="">— Unassigned —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="form-row one">
        <div className="form-group"><label>Email</label><input type="email" placeholder="optional" value={form.email} onChange={f('email')} /></div>
      </div>
      <div className="form-row one">
        <div className="form-group"><label>Initial note</label><textarea placeholder="Any initial details…" value={form.note} onChange={f('note')} /></div>
      </div>
    </Modal>
  );
}
