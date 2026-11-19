import {clone,uid,availableWeek,employeeError,conflicts,shapeError} from './core.mjs';
import {parseTime,parseRange,parseAvailability,normalizeDate} from './importer.mjs';
export const identity=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const numeric=value=>{const text=String(value).replace(/(?:USD|CNY|RMB|EUR|GBP|CAD|AUD)/gi,'').replace(/[$£€¥￥\s]/g,'');if(!/^(?:\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(text))return NaN;return Number(text.replaceAll(',',''));};
const splitRoles=value=>String(value||'').split(/[,;|/]/).map(r=>r.trim()).filter(Boolean);

export function prepareImport(data,rows){
 const next=clone(data),errors=[],warnings=[],changes=[],groups=new Map(),roleNames=new Map();
 next.employees.flatMap(e=>e.roles).forEach(r=>roleNames.set(identity(r),r));
 const canonicalRole=r=>{const k=identity(r);if(!roleNames.has(k))roleNames.set(k,r);return roleNames.get(k);};
 const activeRows=rows.filter(r=>r.include&&!r.excluded);
 for(const raw of activeRows){
  const r={...raw,name:raw.name.trim().replace(/\s+/g,' '),date:normalizeDate(raw.date,raw.dateOrder),start:parseTime(raw.start),end:parseTime(raw.end)};
  if(!r.name){errors.push({row:r.row,message:'Employee name is required.'});continue;}
  if(['summary','calendar','unknown'].includes(r.recordType)){errors.push({row:r.row,message:'Confirm Employee list or Shift records before importing.'});continue;}
  const k=identity(r.name);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);
 }
 let employeesAdded=0,employeesUpdated=0,shiftsAdded=0,duplicates=0;
 const grouped=[];
 for(const [nameKey,records]of groups){
  const first=records[0],matches=next.employees.filter(e=>identity(e.name)===nameKey);
  if(matches.length>1){errors.push({row:first.row,message:'Multiple existing employees share this name. Resolve their names before importing.'});continue;}
  const existing=matches[0];const e=existing?clone(existing):{id:uid(),name:first.name,roles:[],rate:0,maxHours:40,email:'',active:true,availability:availableWeek()};
  const seenRoles=new Set(e.roles.map(identity));for(const r of records)for(const role of splitRoles(r.roles)){const canonical=canonicalRole(role);if(!seenRoles.has(identity(canonical))){e.roles.push(canonical);seenRoles.add(identity(canonical));}}
  if(!e.roles.length){e.roles=['Team member'];warnings.push(`${e.name}: position defaults to Team member.`);}
  for(const [field,label]of [['rate','hourly rate'],['maxHours','weekly limit'],['email','email']]){
   const provided=records.filter(r=>String(r[field]||'').trim()!=='').map(r=>({row:r.row,value:field==='email'?r[field].trim():numeric(r[field])}));
   const unique=new Set(provided.map(x=>field==='email'?identity(x.value):x.value));
   if(unique.size>1){errors.push({row:provided.at(-1).row,message:`${e.name} has different ${label} values in this file. Correct them to one consistent value or leave repeated cells blank.`});continue;}
   if(provided.length){e[field]=provided[0].value;}else if(!existing&&field!=='email')warnings.push(`${e.name}: ${label} defaults to ${field==='rate'?'0':'40h'}.`);
  }
  const availabilityRecords=records.filter(r=>r.availability.trim()||((r.recordType==='employees'||!r.date)&&(r.hours||r.start||r.end)));
  if(availabilityRecords.length){
   let combined=null;const specified=new Map();
   for(const r of availabilityRecords){try{
    let range=null;if(r.recordType==='employees'||!r.date){if(r.hours){range=parseRange(r.hours);if(!range)throw new Error('Working hours must be a range such as 09:00-17:00.');}else if(r.start||r.end)range=[r.start,r.end];}
    const a=parseAvailability(r.availability,range);combined??=a.map(d=>({...d,enabled:false}));
    a.forEach((day,i)=>{if(day.enabled){if(specified.has(i)&&JSON.stringify(specified.get(i))!==JSON.stringify(day))throw new Error(`${e.name} has different availability windows for the same weekday. Correct these rows before importing.`);specified.set(i,day);combined[i]=day;}});
   }catch(err){errors.push({row:r.row,message:err.message});}}
   if(combined)e.availability=combined;
  }else if(!existing)warnings.push(`${e.name}: availability defaults to all days, 07:00-22:00.`);
  const invalid=employeeError(e);if(invalid){errors.push({row:first.row,message:`${e.name}: ${invalid}`});continue;}
  if(existing){next.employees[next.employees.findIndex(x=>x.id===e.id)]=e;employeesUpdated++;const added=e.roles.filter(r=>!existing.roles.some(old=>identity(old)===identity(r)));if(added.length)changes.push(`${e.name}: add ${added.join(', ')}; keep existing positions.`);for(const k of ['rate','maxHours','email','availability'])if(JSON.stringify(e[k])!==JSON.stringify(existing[k]))changes.push(`${e.name}: update ${k==='maxHours'?'weekly limit':k==='rate'?'hourly rate':k}.`);}
  else{next.employees.push(e);employeesAdded++;}
  grouped.push({e,records,existing});
 }
 for(const {e,records}of grouped)for(const r of records){
  const isShift=r.recordType==='shifts'||(r.recordType!=='employees'&&Boolean(r.date));
  if(!isShift)continue;
  try{
   const rowRoles=[...new Set(splitRoles(r.roles).map(canonicalRole))];
   if(rowRoles.length>1||(!rowRoles.length&&e.roles.length>1))throw new Error('Each shift needs one position. Enter its specific role; employee qualifications are kept separately.');
   const range=r.hours?parseRange(r.hours):null;if(r.hours&&!range)throw new Error('Working hours must be a time range, not a total number of hours.');
   const s={id:uid(),employeeId:e.id,role:rowRoles[0]||e.roles[0],date:r.date,start:r.start||range?.[0]||'',end:r.end||range?.[1]||'',breakMinutes:r.breakMinutes===''?0:numeric(r.breakMinutes),notes:'Imported',assignmentSource:'manual'};
   const invalid=shapeError(s);if(invalid)throw new Error(invalid);
   const repeat=next.shifts.find(x=>x.employeeId===s.employeeId&&x.date===s.date&&x.start===s.start&&x.end===s.end&&x.role===s.role);
   if(repeat){if(repeat.breakMinutes!==s.breakMinutes)throw new Error('This shift already exists with a different unpaid break. Edit the saved shift to change it.');duplicates++;continue;}
   const issues=conflicts(next,s);if(issues.length)throw new Error(issues.join(' '));next.shifts.push(s);shiftsAdded++;
  }catch(err){errors.push({row:r.row,message:err.message});}
 }
 for(const {e,records,existing}of grouped)if(existing)for(const s of next.shifts.filter(s=>s.employeeId===e.id)){const issues=conflicts(next,s);if(issues.length)errors.push({row:records[0].row,message:`${e.name}, ${s.date}: ${issues.join(' ')}`});}
 if(!activeRows.length)errors.push({row:'—',message:'Include at least one employee or shift record. Summary rows cannot be imported.'});
 if(next.employees.length>500||next.shifts.length>50000)errors.push({row:'—',message:'Workspace capacity exceeded.'});
 return {data:next,errors,warnings:[...new Set(warnings)],changes,employeesAdded,employeesUpdated,shiftsAdded,duplicates,skipped:rows.filter(r=>r.excluded).length};
}
