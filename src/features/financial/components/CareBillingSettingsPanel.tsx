import { effectiveClubNow } from "@/shared/lib/demo-clock";
import {useEffect,useState} from 'react';
import {api} from '@/shared/lib/api';
import {messageFor} from '@/shared/lib/messages';
import {Card} from '@/shared/components/ui/Card';
import {Button} from '@/shared/components/ui/Button';
import {Alert} from '@/shared/components/ui/Alert';
import {Input} from '@/shared/components/form/Input';
import {Field} from '@/shared/components/form/Field';
import {tr} from '@/shared/i18n/tr';
type Policy={cutoverPeriod?:string|null;examUnitPrice?:string|number|null};
export function CareBillingSettingsPanel(){
  const [policy,setPolicy]=useState<Policy|null>(null);const [period,setPeriod]=useState('');const [price,setPrice]=useState('');const [confirmed,setConfirmed]=useState(false);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [version,setVersion]=useState(0);
  const [reconciliation,setReconciliation]=useState<{scanned:number;limit:number;items:Array<{id:string;title:string;date:string;reason:string}>}|null>(null);
  useEffect(()=>{let current=true;setLoading(true);api<Policy|null>('GET','/invoices/care-billing-policy').then(result=>{if(current){setPolicy(result);setPeriod(result?.cutoverPeriod??'');setPrice(result?.examUnitPrice?.toString()??'');setError('');}}).catch(e=>{if(current)setError(messageFor(e));}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[version]);
  async function save(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{await api('PATCH','/invoices/care-billing-policy',{...(period?{cutoverPeriod:period}:{}),...(price?{examUnitPrice:Number(price)}:{})});setNotice(tr('Billing policy saved. Existing invoice snapshots remain unchanged.'));setVersion(v=>v+1);}catch(e){setError(messageFor(e));}finally{setBusy(false);}}
  async function reconcile(){if(busy)return;setBusy(true);setError('');try{setReconciliation(await api('GET','/invoices/usage-reconciliation'));}catch(e){setError(messageFor(e));}finally{setBusy(false);}}
  return <Card><details><summary>{tr('Actual medical usage billing settings')}</summary>
    {error&&<Alert tone="danger">{error}<Button tone="ghost" onClick={()=>setVersion(v=>v+1)}>{tr('Try again')}</Button></Alert>}{notice&&<Alert tone="ok">{notice}</Alert>}
    {loading?<p role="status">{tr('Loading...')}</p>:<form onSubmit={save} style={{display:'grid',gap:12,maxWidth:640,paddingTop:12}}>
      <p>{tr('Before the cutover month, new invoices use the existing medical package. From the cutover month, new invoices use actual usage snapshots. The cutover can be set once; historical invoices and prices are preserved.')}</p>
      <Field label={tr('First month of actual usage billing')}><Input type="month" min={new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(effectiveClubNow())} value={period} disabled={Boolean(policy?.cutoverPeriod)||busy} onChange={e=>{setPeriod(e.target.value);setConfirmed(false);}} /></Field>
      {period&&!policy?.cutoverPeriod&&<label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} /> {tr('I confirm this cutover month for new invoices.')}</label>}
      <Field label={tr('Examination tariff (VND)')} hint={tr('Optional. No exam fee is added automatically; record each charge from its clinical record.')}><Input type="number" min={1} max={1000000000} step={1} value={price} onChange={e=>setPrice(e.target.value)} /></Field>
      <Button type="submit" disabled={busy||(!price&&!period)||Boolean(period&&!policy?.cutoverPeriod&&!confirmed)}>{tr('Save billing policy')}</Button>
    </form>}
    <Button tone="secondary" onClick={reconcile} disabled={busy||loading}>{tr('Find medication tasks needing reconciliation')}</Button>
    {reconciliation&&<div><p>{reconciliation.items.length} {tr('tasks require verified prescription links')} · {reconciliation.scanned}/{reconciliation.limit} {tr('tasks scanned')}</p>{reconciliation.items.map(task=><p key={task.id}>{task.title} · {task.date.slice(0,10)} · {task.id}<br/>{task.reason}</p>)}</div>}
  </details></Card>;
}
