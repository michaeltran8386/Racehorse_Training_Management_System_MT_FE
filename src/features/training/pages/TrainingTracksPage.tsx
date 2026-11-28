import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { messageFor } from '@/shared/lib/messages';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/form/Input';
import { Select } from '@/shared/components/form/Select';
import { tr } from '@/shared/i18n/tr';
import type { TrainingTrackChoice } from '../components/TrainingTrackPicker';

export default function TrainingTracksPage(){
  const user=useCurrentUser();
  return user.role==='CLUB_MANAGER'?<TrainingTracksEditor/>:<Navigate to="/403" replace/>;
}
function TrainingTracksEditor(){
  const [tracks,setTracks]=useState<TrainingTrackChoice[]>([]);const [version,setVersion]=useState(0);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [id,setId]=useState('');const [code,setCode]=useState('');const [name,setName]=useState('');const [surface,setSurface]=useState('TURF');const [capacity,setCapacity]=useState(6);const [active,setActive]=useState(true);
  const [legacy,setLegacy]=useState<Array<{id:string;scheduledDate:string;horseId:string;horse?:{name:string};trackId?:string|null;trackSurface?:string;status:string}>>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [from,setFrom]=useState(()=>new Date(effectiveClubNow().getTime()+7*3600000).toISOString().slice(0,10));
  const [to,setTo]=useState(()=>new Date(effectiveClubNow().getTime()+31*86400000+7*3600000).toISOString().slice(0,10));
  useEffect(()=>{
    let current=true;setLoading(true);setError('');setSelected([]);
    if(!from || !to || from>to || +new Date(to)-+new Date(from)>366*86400000){setError(tr('Choose a valid workout range of at most one year.'));setLoading(false);return()=>{current=false;};}
    Promise.all([api<TrainingTrackChoice[]>('GET','/training/tracks?includeInactive=true'),api<typeof legacy>('GET',`/training/workouts?from=${from}&to=${to}`)]).then(([rows,workouts])=>{if(current){setTracks(rows);setLegacy(workouts.filter(row=>!row.trackId && ['SCHEDULED','BLOCKED'].includes(row.status) && +new Date(row.scheduledDate)>effectiveClubNow().getTime()));}}).catch(e=>{if(current)setError(messageFor(e));}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[version,from,to]);
  function edit(row?:TrainingTrackChoice){setId(row?.id??'');setCode(row?.code??'');setName(row?.name??'');setSurface(row?.surface??'TURF');setCapacity(row?.capacity??6);setActive(row?.isActive??true);setSelected([]);setError('');setNotice('');}
  async function save(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try{await api(id?'PATCH':'POST',id?`/training/tracks/${id}`:'/training/tracks',{code:code.trim(),name:name.trim(),surface,capacity,isActive:active});setVersion(v=>v+1);setNotice(tr('Training track saved.'));}catch(e){setError(messageFor(e));}finally{setBusy(false);}}
  async function map(){if(busy||!id||!selected.length)return;setBusy(true);setError('');setNotice('');
    try{const result=await api<{mapped:number}>('POST',`/training/tracks/${id}/map-legacy-workouts`,{workoutIds:selected});setNotice(`${result.mapped} ${tr('legacy workouts mapped. Blocked workouts remain blocked.')}`);setVersion(v=>v+1);}catch(e){setError(messageFor(e));}finally{setBusy(false);}}
  return <div style={{display:'grid',gap:20}}>
    <PageHeader title={tr('Physical training tracks')} description={tr('Each track has its own capacity. Surface type does not identify a track.')} />
    {error&&<Alert tone="danger">{error}<Button tone="ghost" onClick={()=>setVersion(v=>v+1)}>{tr('Try again')}</Button></Alert>}{notice&&<Alert tone="info">{notice}</Alert>}
    <Card><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><Field label={tr('Workouts from')}><Input type="date" nativePicker value={from} onChange={e=>setFrom(e.target.value)} /></Field><Field label={tr('Workouts through')}><Input type="date" nativePicker value={to} onChange={e=>setTo(e.target.value)} /></Field></div><p>{tr('Choose the period containing the legacy workouts that need a verified physical track.')}</p></Card>
    {loading?<p role="status">{tr('Loading...')}</p>:<Card><div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{tracks.map(row=><Button key={row.id} tone={id===row.id?'primary':'secondary'} onClick={()=>edit(row)} disabled={busy}>{row.code} · {row.name} · {row.capacity} · {row.isActive?tr('Active'):tr('Inactive')}</Button>)}<Button tone="ghost" onClick={()=>edit()} disabled={busy}>{tr('New training track')}</Button></div></Card>}
    <Card><form onSubmit={save} style={{display:'grid',gap:12,maxWidth:640}}>
      <Field label={tr('Track code')}><Input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} pattern="[A-Z0-9][A-Z0-9_-]{0,29}" maxLength={30} required /></Field>
      <Field label={tr('Track name')}><Input value={name} onChange={e=>setName(e.target.value)} maxLength={100} required /></Field>
      <Field label={tr('Surface')}><Select value={surface} onChange={e=>setSurface(e.target.value)} options={['TURF','DIRT','SYNTHETIC'].map(value=>({value,label:value}))} /></Field>
      <Field label={tr('Maximum simultaneous horses')}><Input type="number" min={1} max={6} step={1} value={capacity} onChange={e=>setCapacity(Number(e.target.value))} required /></Field>
      <label><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} /> {tr('Active')}</label>
      <p>{tr('Move or cancel future workouts before deactivating a track or changing its surface/capacity.')}</p>
      <Button tone="primary" type="submit" disabled={busy||!name.trim()||!code.trim()}>{busy?tr('Saving…'):tr('Save track')}</Button>
    </form></Card>
    {id&&<Card title={tr('Verify the physical track for legacy workouts')}>
      <p>{tr('Select only workouts confirmed to use this track. Capacity, rest and trainer conflicts are rechecked. No historical prices or results are changed.')}</p>
      <div style={{display:'grid',gap:12}}>{legacy.filter(row=>row.trackSurface===surface).map(row=><label key={row.id} style={{overflowWrap:'anywhere'}}><input type="checkbox" disabled={busy} checked={selected.includes(row.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,row.id]:ids.filter(v=>v!==row.id))} /> {row.horse?.name??row.horseId} · {new Date(row.scheduledDate).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · {row.status} · {row.id}</label>)}</div>
      <Button tone="secondary" disabled={busy||!selected.length||!active} onClick={()=>void map()}>{tr('Confirm verified mapping')}</Button>
    </Card>}
  </div>;
}
