import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { messageFor } from '@/shared/lib/messages';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { Select } from '@/shared/components/form/Select';
import { Textarea } from '@/shared/components/form/Textarea';
import { Field } from '@/shared/components/form/Field';
import { tr } from '@/shared/i18n/tr';
import type { ShiftRosterItem } from '../types/shiftRoster';

export const rosterStartsAt=(row:ShiftRosterItem)=>new Date(`${row.date.slice(0,10)}T${row.shift.startTime.slice(0,5)}:00+07:00`).getTime();
const describe=(row:ShiftRosterItem)=>`${row.date.slice(0,10)} · ${row.shift.name} · ${row.zone.name} · ${row.groom.fullName}`;
export function ShiftSwapRequestModal({selected,rosters,onClose}:{selected:ShiftRosterItem;rosters:ShiftRosterItem[];onClose:()=>void}) {
  const user=useCurrentUser();
  const [now,setNow]=useState(() => effectiveClubNow().getTime());
  const own=selected.groomUserId===user.id;
  const choices=rosters.filter(row=>row.groomUserId===user.id && rosterStartsAt(row)>now);
  const [sourceId,setSourceId]=useState(own?selected.id:choices.length===1?choices[0].id:'');
  const [targetMode,setTargetMode]=useState<'cover'|'exchange'>(own?'cover':'exchange');
  const [targetId,setTargetId]=useState(own?'':selected.id);
  const [people,setPeople]=useState<Array<{id:string;fullName:string}>>([]);
  const [reason,setReason]=useState('');const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [loading,setLoading]=useState(false);const [busy,setBusy]=useState(false);
  useEffect(()=>{const timer=setInterval(()=>setNow(effectiveClubNow().getTime()),15000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(targetMode!=='cover'||!sourceId){setLoading(false);return;}
    let active=true;setLoading(true);setError('');setPeople([]);setTargetId('');
    api<Array<{id:string;fullName:string}>>('GET',`/shift-rosters/swap-candidates?rosterId=${encodeURIComponent(sourceId)}`).then(rows=>{if(active)setPeople(rows);}).catch(e=>{if(active)setError(messageFor(e));}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[sourceId,targetMode]);
  const source=rosters.find(row=>row.id===sourceId);
  const available=rosterStartsAt(selected)>now && !!source && rosterStartsAt(source)>now;
  const targets=rosters.filter(row=>row.groomUserId!==user.id && rosterStartsAt(row)>now);
  async function submit(e:React.FormEvent){
    e.preventDefault();if(busy||!source||!targetId||!reason.trim()||rosterStartsAt(source)<=effectiveClubNow().getTime()||rosterStartsAt(selected)<=effectiveClubNow().getTime())return;
    setBusy(true);setError('');
    try{const result=await api<{requested:boolean}>('POST',`/shift-rosters/${source.id}/swap-request`,{reason:reason.trim(),...(targetMode==='cover'?{targetGroomUserId:targetId}:{targetRosterId:targetId})});
      if(!result.requested)throw new Error('Request was not recorded.');
      setNotice(tr('Request recorded. Current assignments remain in force until the club manager updates them.'));
    }catch(e){setError(messageFor(e));}finally{setBusy(false);}
  }
  return <Modal title={own?tr('Your shift details'):tr('Colleague shift details')} onClose={busy?undefined:onClose}>
    <p>{describe(selected)}</p>
    {error&&<Alert tone="danger">{error}</Alert>}
    {notice?<Alert tone="ok">{notice}</Alert>:rosterStartsAt(selected)<=now?<><p>{tr('This shift has started or ended. A swap request is no longer available.')}</p>{own&&<Link to="/stable/my-shift">{tr('Open today’s checklist')}</Link>}</>:<form onSubmit={submit}>
      {!own&&<Field label={tr('Your shift to exchange')}><Select value={sourceId} onChange={e=>setSourceId(e.target.value)} options={[{value:'',label:tr('Choose your future shift')},...choices.map(row=>({value:row.id,label:describe(row)}))]} /></Field>}
      {own&&<Field label={tr('Request type')}><Select value={targetMode} onChange={e=>{setTargetMode(e.target.value as 'cover'|'exchange');setTargetId('');}} options={[{value:'cover',label:tr('Ask a colleague to cover')},{value:'exchange',label:tr('Exchange two future shifts')}]} /></Field>}
      {targetMode==='cover'?<Field label={tr('Available colleague')}><Select value={targetId} disabled={loading} onChange={e=>setTargetId(e.target.value)} options={[{value:'',label:loading?tr('Loading...'):tr('Select Groom')},...people.map(person=>({value:person.id,label:person.fullName}))]} /></Field>:own?<Field label={tr('Colleague shift')}><Select value={targetId} onChange={e=>setTargetId(e.target.value)} options={[{value:'',label:tr('Select a future colleague shift')},...targets.map(row=>({value:row.id,label:describe(row)}))]} /></Field>:null}
      <Field label={tr('Reason')}><Textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)} required /></Field>
      <Button tone="primary" type="submit" disabled={!available||loading||busy||!targetId||!reason.trim()}>{busy?tr('Saving…'):tr('Request this shift change')}</Button>
    </form>}
  </Modal>;
}
