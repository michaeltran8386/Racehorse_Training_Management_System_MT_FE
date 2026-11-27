import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { useAppLanguage } from '@/shared/lib/language';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { Modal } from '@/shared/components/ui/Modal';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/form/Input';
import { Select } from '@/shared/components/form/Select';
import { useToast } from '@/shared/components/ui/Toast';
import { localizeServerText, tr } from '@/shared/i18n/tr';
import { messageFor } from '@/shared/lib/messages';
import { createStaffWork, getWorkOverview, updateStaffWorkStatus, type WorkEvent, type WorkOverview } from '../workApi';
import styles from './WorkOverviewPage.module.css';

const roleLabel: Record<string, string> = { CLUB_MANAGER: 'Manager', VETERINARIAN: 'Veterinarian', GROOM: 'Care Staff' };
const kindLabel: Record<string, string> = { ADMISSION: 'Joint Inspection', SHIFT: 'Groom Shift', CARE: 'Care Task', PREVENTIVE: 'Preventive Care', MEDICAL: 'Clinical / Record', OTHER: 'Other Work' };
const stateLabel: Record<string, string> = { PENDING: 'Pending update', IN_PROGRESS: 'In progress', COMPLETED: 'Completed' };
const clubDay = (value = new Date()) => new Date(value.getTime() + 7 * 3600000).toISOString().slice(0, 10);
const shiftDay = (day: string, offset: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + offset * 86400000).toISOString().slice(0, 10);
const clock = (date: string, locale: string) => new Date(date).toLocaleTimeString(locale, { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
const isOverdue = (e: WorkEvent) => e.kind !== 'SHIFT' && e.status !== 'COMPLETED' && Date.parse(e.endsAt) < Date.now();
const isUnassigned = (e: WorkEvent) => !e.userIds.length || (e.kind === 'ADMISSION' && e.userIds.length < 2);

export default function WorkOverviewPage() {
  useTranslation();
  const { isVietnamese } = useAppLanguage();
  const dateLocale = isVietnamese ? 'vi-VN' : 'en-US';
  const user = useCurrentUser();
  const manager = user.role === 'CLUB_MANAGER';
  const toast = useToast();
  const [date, setDate] = useState(() => clubDay());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [role, setRole] = useState('');
  const [person, setPerson] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [attention, setAttention] = useState(false);
  const [data, setData] = useState<WorkOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(user.id);
  const [startsAt, setStartsAt] = useState(() => `${shiftDay(clubDay(), 1)}T09:00`);
  const [endsAt, setEndsAt] = useState(() => `${shiftDay(clubDay(), 1)}T10:00`);
  const [workLocation, setWorkLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const from = view === 'day' ? date : shiftDay(date, -((weekday + 6) % 7));
  const to = view === 'day' ? date : shiftDay(from, 6);
  const days = Array.from({ length: view === 'day' ? 1 : 7 }, (_, i) => shiftDay(from, i));

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    getWorkOverview(from, to).then(result => { if (active) setData(result); })
      .catch(err => { if (active) { setError(messageFor(err)); setData(null); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, version]);

  const conflicts = useMemo(() => {
    const result = new Set<string>();
    const timed = (data?.events ?? []).filter(e => !e.allDay && e.kind !== 'SHIFT' && e.status !== 'COMPLETED');
    for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j];
      if (a.userIds.some(id => b.userIds.includes(id)) && a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
        result.add(a.id); result.add(b.id);
      }
    }
    return result;
  }, [data]);
  const members = data?.members ?? [];
  const events = (data?.events ?? []).filter(e =>
    (!person || e.userIds.includes(person)) && (!role || e.userIds.some(id => members.some(m => m.id === id && m.role === role))) &&
    (!location || e.location === location) && (!status || e.status === status) && (!kind || e.kind === kind) &&
    (!attention || isOverdue(e) || isUnassigned(e) || conflicts.has(e.id)));

  async function saveWork(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !assignee || endsAt <= startsAt) { setFormError(tr('Enter a task title, assignee, and valid time range.')); return; }
    setBusy(true); setFormError('');
    try {
      await createStaffWork({ title: title.trim(), userId: assignee, startsAt: new Date(`${startsAt}:00+07:00`).toISOString(), endsAt: new Date(`${endsAt}:00+07:00`).toISOString(), location: workLocation.trim(), notes: notes.trim() });
      setCreating(false); setTitle(''); setNotes(''); setVersion(v => v + 1); toast.show(tr('Task added.'), 'ok');
    } catch (err) { setFormError(messageFor(err)); } finally { setBusy(false); }
  }
  async function changeStatus(event: WorkEvent, next: string) {
    if (!event.sourceId) return;
    if (next === 'CANCELLED' && !window.confirm(tr('Cancel this task and release the reserved time slot?'))) return;
    setBusy(true);
    try { await updateStaffWorkStatus(event.sourceId, next); setVersion(v => v + 1); }
    catch (err) { toast.show(messageFor(err), 'danger'); } finally { setBusy(false); }
  }
  function renderEvent(e: WorkEvent) {
    const closed = e.status === 'COMPLETED';
    return <article key={e.id} className={styles.event}>
      <div className={styles.eventHead}><Badge tone={closed ? 'ok' : isOverdue(e) ? 'danger' : 'info'}>{tr(stateLabel[e.status] ?? e.status)}</Badge><span>{tr(kindLabel[e.kind] ?? e.kind)}</span></div>
      <Link to={e.link} className={styles.eventTitle}>{localizeServerText(e.title)}</Link>
      <p>{e.allDay ? tr('All day · no specific time window') : `${clock(e.startsAt, dateLocale)} – ${clock(e.endsAt, dateLocale)}`} {e.location && `· ${localizeServerText(e.location)}`}</p>
      <p>{e.userIds.map(id => members.find(m => m.id === id)?.fullName).filter(Boolean).join(' · ') || tr('Unassigned')}</p>
      {e.notes && <p>{localizeServerText(e.notes)}</p>}
      {isUnassigned(e) && <Badge tone="warn">{tr('Missing assignee')}</Badge>}
      {isOverdue(e) && <Badge tone="danger">{tr('Update overdue')}</Badge>}
      {conflicts.has(e.id) && <Badge tone="danger">{tr('Schedule conflict')}</Badge>}
      {e.kind === 'SHIFT' && <Link className={styles.eventLink} to="/stable/shifts">{tr('Open Groom shift roster ↗')}</Link>}
      {e.kind === 'OTHER' && !closed && <div className={styles.actions}>
        {e.status === 'PENDING' && <Button size="sm" tone="secondary" disabled={busy} onClick={() => void changeStatus(e, 'IN_PROGRESS')}>{tr('Start')}</Button>}
        <Button size="sm" tone="secondary" disabled={busy} onClick={() => void changeStatus(e, 'COMPLETED')}>{tr('Complete')}</Button>
        {manager && <Button size="sm" tone="ghost" disabled={busy} onClick={() => void changeStatus(e, 'CANCELLED')}>{tr('Cancel')}</Button>}
      </div>}
    </article>;
  }

  return <div className={styles.page}>
    <PageHeader title={manager ? tr('Staff Schedule & Tasks') : tr('My Work Schedule')} description={tr('Unified view of Groom shifts, care tasks, and operational schedules. Use Groom Shift Roster to assign or swap shifts. Club time: UTC+7.')}
      action={<div className={styles.actions}><Button tone="secondary" disabled={loading} onClick={() => setVersion(v => v + 1)}>{tr('Refresh')}</Button><Link to="/stable/shifts" className={styles.rosterLink}>{tr('Open Groom Shift Roster')}</Link>{manager && <Button onClick={() => { setFormError(''); setCreating(true); }}>{tr('Add task')}</Button>}</div>} />
    <Card><div className={styles.filters}>
      <Field label={tr('Date')}><Input type="date" value={date} required onChange={e => { if (e.target.value) setDate(e.target.value); }} /></Field>
      <Field label={tr('View mode')}><Select value={view} onChange={e => setView(e.target.value as 'day' | 'week')} options={[{ value: 'day', label: tr('Daily') }, { value: 'week', label: tr('Weekly') }]} /></Field>
      <Field label={tr('Schedule type')}><Select value={kind} onChange={e => setKind(e.target.value)} options={[{ value: '', label: tr('All schedules') }, { value: 'SHIFT', label: tr('Groom Shift') }, { value: 'CARE', label: tr('Care Task') }, { value: 'ADMISSION', label: tr('Admission') }, { value: 'MEDICAL', label: tr('Clinical / Record') }, { value: 'PREVENTIVE', label: tr('Preventive Care') }, { value: 'OTHER', label: tr('Other Work') }]} /></Field>
      {manager && <><Field label={tr('Role')}><Select value={role} onChange={e => { setRole(e.target.value); setPerson(''); }} options={[{ value: '', label: tr('All') }, ...Object.entries(roleLabel).map(([value, label]) => ({ value, label: tr(label) }))]} /></Field>
        <Field label={tr('Staff member')}><Select value={person} onChange={e => setPerson(e.target.value)} options={[{ value: '', label: tr('All') }, ...members.filter(m => !role || m.role === role).map(m => ({ value: m.id, label: m.fullName }))]} /></Field></>}
      <Field label={tr('Zone / location')}><Select value={location} onChange={e => setLocation(e.target.value)} options={[{ value: '', label: tr('All') }, ...[...new Set((data?.events ?? []).map(e => e.location).filter(Boolean))].map(value => ({ value, label: value }))]} /></Field>
      <Field label={tr('Status')}><Select value={status} onChange={e => setStatus(e.target.value)} options={[{ value: '', label: tr('All') }, ...Object.entries(stateLabel).map(([value, label]) => ({ value, label: tr(label) }))]} /></Field>
    </div></Card>
    {error && <Alert tone="danger" action={<Button tone="secondary" onClick={() => setVersion(v => v + 1)}>{tr('Try again')}</Button>}>{error}</Alert>}
    {loading ? <p role="status">{tr('Loading work schedule…')}</p> : data && <>
      <div className={styles.metrics}>{[
        [tr('Total schedule items'), events.length], [tr('Groom shifts'), events.filter(e => e.kind === 'SHIFT').length],
        [tr('Completed'), events.filter(e => e.status === 'COMPLETED').length], [tr('Update overdue'), events.filter(isOverdue).length], [tr('Unassigned'), events.filter(isUnassigned).length],
      ].map(([label, count]) => <div key={label} className={styles.metric}><strong>{count}</strong><span>{label}</span></div>)}</div>
      <Card title={tr('Groom Shift Roster')}><p className={styles.hint}>{tr('Shifts appear alongside tasks for visibility. Edit shift assignments, copy weeks, and process shift swaps in Shift Roster.')}</p><Link className={styles.eventLink} to="/stable/shifts">{tr('Open Groom shift board ↗')}</Link></Card>
      <Card title={tr('Needs attention')}><div className={styles.actions}>
        <Button tone={attention ? 'primary' : 'secondary'} aria-pressed={attention} onClick={() => setAttention(v => !v)}>{attention ? tr('Show all tasks') : tr('Filter unassigned / overdue / conflicts')}</Button>
        {manager && <Link to="/incidents">{tr('Open incidents: {{count}}', { count: data.openIncidents })}</Link>}
      </div><p className={styles.hint}>{tr('Update overdue does not imply work was missed. Shifts and care tasks are separate items; do not use counts to rank staff.')}</p></Card>
      {manager && <Card title={tr('By staff member')}><div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>{tr('Staff member')}</th><th>{tr('Role')}</th><th>{tr('Shifts')}</th><th>{tr('Tasks')}</th><th>{tr('Completed')}</th><th>{tr('Needs attention')}</th></tr></thead><tbody>
        {members.filter(m => (!role || m.role === role) && (!person || person === m.id)).map(m => {
          const own = events.filter(e => e.userIds.includes(m.id));
          return <tr key={m.id}><td><button className={styles.person} onClick={() => setPerson(m.id)}>{m.fullName}</button></td><td>{tr(roleLabel[m.role] ?? m.role)}</td><td>{own.filter(e => e.kind === 'SHIFT').length}</td><td>{own.filter(e => e.kind !== 'SHIFT').length}</td><td>{own.filter(e => e.status === 'COMPLETED').length}/{own.length}</td><td>{own.filter(e => isOverdue(e) || conflicts.has(e.id)).length}</td></tr>;
        })}
      </tbody></table></div><p className={styles.hint}>{tr('Joint admissions count once in totals, while appearing under both assigned participants.')}</p></Card>}
      <section aria-label={tr('Work schedule')} className={view === 'week' ? styles.week : styles.day}>
        {days.map(day => { const items = events.filter(e => clubDay(new Date(e.startsAt)) <= day && clubDay(new Date(Date.parse(e.endsAt) - 1)) >= day); return <div className={styles.dayColumn} key={day}>
          <h2>{new Date(`${day}T12:00:00+07:00`).toLocaleDateString(dateLocale, { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: '2-digit', month: '2-digit' })} <span>({items.length})</span></h2>
          {items.length ? items.map(renderEvent) : <p className={styles.hint}>{tr('No tasks matching filters.')}</p>}
        </div>; })}
      </section>
    </>}
    {creating && <Modal title={tr('Add task')} subtitle={tr('Stable/facility inspections or other operational tasks. Schedule conflicts are checked upon saving.')} width={560} onClose={busy ? undefined : () => setCreating(false)}>
      <form className={styles.form} onSubmit={event => void saveWork(event)}>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label={tr('Task title *')}><Input required minLength={2} maxLength={150} value={title} onChange={e => setTitle(e.target.value)} /></Field>
        <Field label={tr('Assignee *')}><Select required value={assignee} onChange={e => setAssignee(e.target.value)} options={[{ value: '', label: tr('Select staff member') }, ...members.map(m => ({ value: m.id, label: `${m.fullName} · ${tr(roleLabel[m.role] ?? m.role)}` }))]} /></Field>
        <Field label={tr('Start (UTC+7) *')}><Input required type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} /></Field>
        <Field label={tr('End (UTC+7) *')}><Input required type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} /></Field>
        <Field label={tr('Location')}><Input maxLength={200} value={workLocation} onChange={e => setWorkLocation(e.target.value)} /></Field>
        <Field label={tr('Notes')}><Input maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
        <div className={styles.actions}><Button tone="secondary" disabled={busy} onClick={() => setCreating(false)}>{tr('Close')}</Button><Button type="submit" disabled={busy}>{busy ? tr('Saving…') : tr('Save task')}</Button></div>
      </form>
    </Modal>}
  </div>;
}
