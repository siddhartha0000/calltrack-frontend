export const AV_COLORS = [
  ['#EFF6FF','#1D4ED8'], ['#ECFDF5','#065F46'], ['#EEEDFE','#3C3489'],
  ['#FAEEDA','#633806'], ['#FAECE7','#712B13'], ['#F0F9FF','#0369A1'],
];
export const STATUS_COLORS = {
  New:'#2563EB', Contacted:'#D97706', Interested:'#7C3AED', Enrolled:'#059669', Lost:'#DC2626',
};
export const DISPOSITIONS = [
  { label:'Interested', cls:'success' }, { label:'Follow-up', cls:'' },
  { label:'Callback', cls:'' },          { label:'Not answered', cls:'' },
  { label:'Busy', cls:'' },              { label:'Wrong number', cls:'' },
  { label:'Not interested', cls:'danger' }, { label:'Enrolled', cls:'success' },
  { label:'Lost', cls:'danger' },
];
export const STATUSES = ['New','Contacted','Interested','Enrolled','Lost'];
export const INDUSTRIES = ['Education','Real Estate','Sales / B2C','Other'];
export const SOURCES = ['Walk-in','Website','Referral','Social media','Just Dial','99acres','MagicBricks','Cold call','Other'];
export const WA_TEMPLATES = [
  'Hi! We wanted to follow up on your inquiry. When would be a good time to talk?',
  'Thank you for your interest! Our next batch starts soon. Shall we schedule a visit?',
  'Your documents are ready for review. Please contact us at your convenience.',
  'Hello! We have a special offer this week. Interested to know more?',
];

export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
export function avColor(id) {
  return AV_COLORS[Math.abs(id || 0) % AV_COLORS.length];
}
export function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function isOverdue(d) {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}
export function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
