export const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const uid = () => globalThis.crypto.randomUUID();
export const clone = x => structuredClone(x);
export const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const today = () => iso(new Date());
export const dateObj = s => new Date(`${s}T12:00:00`);
export function addDays(s,n) { const d = dateObj(s); d.setDate(d.getDate()+n); return iso(d); }
export function monday(s=today()) { return addDays(s,-((dateObj(s).getDay()+6)%7)); }
export const dayIndex = s => (dateObj(s).getDay()+6)%7;
export const weekDays = w => Array.from({length:7},(_,i)=>addDays(w,i));
export const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s||'') && !isNaN(dateObj(s)) && iso(dateObj(s))===s;
export const mins = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s||'') ? Number(s.slice(0,2))*60+Number(s.slice(3)) : NaN;
export const duration = s => (mins(s.end)-mins(s.start))/60;
export const inWeek = (s,w) => s.date>=w && s.date<=addDays(w,6);
export const hoursFor = (data,id,w) => data.shifts.filter(s=>s.employeeId===id&&inWeek(s,w)).reduce((n,s)=>n+duration(s),0);
export const fmtHours = n => Number(n.toFixed(2)).toString();
export const dateLabel = (d,opts={month:'short',day:'numeric'}) => dateObj(d).toLocaleDateString('en-US',opts);
export const weekLabel = w => `${dateLabel(w)} – ${dateLabel(addDays(w,6))}, ${dateObj(addDays(w,6)).getFullYear()}`;
export const availableWeek = () => DAYS.map(()=>({enabled:true,start:'07:00',end:'22:00'}));
export function roles(data) { return [...new Set([...data.employees.flatMap(e=>e.roles),...data.templates.map(t=>t.role),...data.shifts.map(s=>s.role)])].sort(); }
export function shapeError(s) {
  if(!validDate(s.date)) return 'Choose a valid shift date.';
  if(!Number.isFinite(duration(s)) || duration(s)<=0) return 'End time must be after start time. Overnight shifts must be split into separate days.';
  if(!s.role?.trim()) return 'A position is required.';
  if(!Number.isFinite(s.breakMinutes)||s.breakMinutes<0||s.breakMinutes>=duration(s)*60) return 'Unpaid break must be shorter than the shift.';
  return '';
}
export function conflicts(data,s,employeeId=s.employeeId) {
  const invalid=shapeError(s); if(invalid) return [invalid];
  if(!employeeId) return [];
  const e=data.employees.find(e=>e.id===employeeId); if(!e) return ['Employee no longer exists.'];
  const errors=[];
  if(!e.active) errors.push('Employee is inactive.');
  if(!e.roles.includes(s.role)) errors.push(`Not qualified for ${s.role}.`);
  const a=e.availability[dayIndex(s.date)];
  if(!a?.enabled || mins(s.start)<mins(a.start) || mins(s.end)>mins(a.end)) errors.push('Outside employee availability.');
  if(data.leave.some(l=>l.employeeId===e.id&&l.status==='approved'&&l.start<=s.date&&l.end>=s.date)) errors.push('Approved time off.');
  const others=data.shifts.filter(x=>x.id!==s.id&&x.employeeId===e.id);
  if(others.some(x=>x.date===s.date&&mins(x.start)<mins(s.end)&&mins(x.end)>mins(s.start))) errors.push('Overlaps another shift.');
  const rest=data.settings.minRestHours*60;
  const stamp=x=>Date.UTC(...x.date.split('-').map((v,i)=>Number(v)-(i===1?1:0)))/60000+mins(x.start);
  const start=stamp(s),end=start+duration(s)*60;
  if(rest>0&&others.some(x=>{const a=stamp(x),b=a+duration(x)*60; return (b<=start&&start-b<rest)||(end<=a&&a-end<rest);})) errors.push(`Less than ${data.settings.minRestHours} hours between shifts.`);
  const total=others.filter(x=>inWeek(x,monday(s.date))).reduce((n,x)=>n+duration(x),0)+duration(s);
  if(total>e.maxHours+0.001) errors.push(`Exceeds ${e.maxHours}h weekly limit (${fmtHours(total)}h).`);
  return errors;
}
export function candidates(data,s,excludeId='') {
  return data.employees.filter(e=>e.id!==excludeId&&!conflicts(data,s,e.id).length).map(e=>({employee:e,hours:hoursFor({...data,shifts:data.shifts.filter(x=>x.id!==s.id)},e.id,monday(s.date))})).sort((a,b)=>(a.hours/a.employee.maxHours)-(b.hours/b.employee.maxHours)||a.hours-b.hours||a.employee.name.localeCompare(b.employee.name));
}
export function employeeError(e) {
  if(!e.name?.trim()||e.name.length>120) return 'Enter an employee name (1–120 characters).';
  if(!e.roles?.length||e.roles.some(r=>!r.trim()||r.length>60)) return 'Enter at least one valid position.';
  if(!Number.isFinite(e.rate)||e.rate<0||e.rate>10000) return 'Hourly rate must be between 0 and 10,000.';
  if(!Number.isFinite(e.maxHours)||e.maxHours<=0||e.maxHours>168) return 'Weekly limit must be greater than 0 and at most 168.';
  if(!Array.isArray(e.availability)||e.availability.length!==7||e.availability.some(a=>typeof a.enabled!=='boolean'||(a.enabled&&(!Number.isFinite(mins(a.start))||!Number.isFinite(mins(a.end))||mins(a.end)<=mins(a.start))))) return 'Check each day’s availability. End must be after start.';
  return '';
}
export function allIssues(data,w) { return data.shifts.filter(s=>s.employeeId&&(!w||inWeek(s,w))).flatMap(s=>conflicts(data,s).map(message=>({shift:s,message}))); }
export function stats(data,w) {
  const shifts=data.shifts.filter(s=>inWeek(s,w)), assigned=shifts.filter(s=>s.employeeId);
  return {hours:assigned.reduce((n,s)=>n+duration(s),0), cost:assigned.reduce((n,s)=>n+(duration(s)-s.breakMinutes/60)*(data.employees.find(e=>e.id===s.employeeId)?.rate||0),0),open:shifts.filter(s=>!s.employeeId).length,team:new Set(assigned.map(s=>s.employeeId)).size,total:shifts.length};
}
export {generateWeek} from './scheduler.mjs';
export function approveLeave(data,id) {
  const next=clone(data),l=next.leave.find(l=>l.id===id); if(!l) throw new Error('Time-off request not found.');
  l.status='approved'; let opened=0;
  for(const s of next.shifts) if(s.employeeId===l.employeeId&&s.date>=l.start&&s.date<=l.end){s.employeeId=null;opened++;}
  return {data:next,opened};
}
export function validateData(d) {
  if(!d||d.schema!==1||!Array.isArray(d.employees)||!Array.isArray(d.shifts)||!Array.isArray(d.leave)||!Array.isArray(d.templates)||!d.settings) throw new Error('This is not a supported ShiftMate backup.');
  if(!Number.isSafeInteger(d.revision)||d.revision<0) throw new Error('This workspace has an invalid save revision. Restore an exported ShiftMate backup.');
  if(d.employees.length>500||d.shifts.length>50000||d.leave.length>10000||d.templates.length>100) throw new Error('Backup exceeds app capacity.');
  for(const key of ['employees','shifts','leave','templates']) {const ids=d[key].map(x=>x.id);if(ids.some(x=>typeof x!=='string'||!x)||new Set(ids).size!==ids.length)throw new Error(`Invalid or duplicate ${key} IDs.`);}
  for(const e of d.employees) if(employeeError(e)||typeof e.active!=='boolean') throw new Error(`Invalid employee: ${e.name||'unnamed'}.`);
  for(const s of d.shifts) if(shapeError(s)||(s.employeeId&&!d.employees.some(e=>e.id===s.employeeId))) throw new Error('Invalid shift in backup.');
  for(const l of d.leave) if(!d.employees.some(e=>e.id===l.employeeId)||!validDate(l.start)||!validDate(l.end)||l.end<l.start||!['pending','approved','declined'].includes(l.status)) throw new Error('Invalid time-off request.');
  for(const t of d.templates) if(!t.role||!Number.isInteger(t.count)||t.count<1||t.count>20||!Array.isArray(t.days)||!t.days.length||t.days.some(n=>!Number.isInteger(n)||n<0||n>6)||shapeError({...t,date:'2026-01-01'})) throw new Error('Invalid staffing requirement.');
  if(typeof d.settings.businessName!=='string'||d.settings.businessName.length>120||!['USD','EUR','GBP','CAD','AUD','CNY'].includes(d.settings.currency)||!Number.isFinite(d.settings.minRestHours)||d.settings.minRestHours<0||d.settings.minRestHours>24)throw new Error('Invalid workspace settings.');
  return d;
}
export function emptyData(){return {schema:1,revision:0,employees:[],shifts:[],leave:[],templates:[],settings:{businessName:'My business',currency:'USD',minRestHours:10}};}
export function sampleData(w=monday()) {
  const d=emptyData();d.workspaceKind='demo';d.settings.businessName='Maple & Main';
  const seed=[['Sofia Chen','Manager',24,40],['James Wilson','Barista',18,32],['Ava Patel','Barista',18,28],['Noah Brooks','Cashier',17,24],['Mia Rivera','Server',17,32],['Ethan Cole','Cook',23,40],['Olivia Park','Server',17,28],['Lucas Reed','Cook',22,32]];
  d.employees=seed.map(([name,role,rate,maxHours],i)=>({id:`emp-${i+1}`,name,roles:[role],rate,maxHours,active:true,email:`${name.split(' ')[0].toLowerCase()}@example.com`,availability:availableWeek()}));
  const plans=[[[0,1,3,4,6],'09:00','17:00'],[[0,2,4,5,6],'07:00','11:00'],[[0,1,2,5,6],'12:00','16:00'],[[0,2,3,5],'10:00','14:00'],[[0,2,3,5],'11:00','16:00'],[[0,1,3],'10:00','18:00'],[[1,4,5,6],'16:00','20:00'],[[2,4],'16:00','22:00']];
  plans.forEach(([days,start,end],i)=>days.forEach(day=>d.shifts.push({id:uid(),employeeId:d.employees[i].id,role:seed[i][1],date:addDays(w,day),start,end,breakMinutes:0,notes:''})));
  d.shifts.push({id:uid(),employeeId:null,role:'Server',date:addDays(w,1),start:'11:00',end:'15:00',breakMinutes:0,notes:''},{id:uid(),employeeId:null,role:'Barista',date:addDays(w,5),start:'08:00',end:'12:00',breakMinutes:0,notes:''});
  d.leave=[{id:uid(),employeeId:'emp-8',start:addDays(w,6),end:addDays(w,6),type:'Personal',reason:'Family day',status:'approved'},{id:uid(),employeeId:'emp-3',start:addDays(w,8),end:addDays(w,9),type:'Vacation',reason:'A short trip',status:'pending'}];
  d.templates=[['Manager','09:00','17:00',[0,1,2,3,4]],['Barista','07:00','11:00',[0,1,2,3,4,5,6]],['Barista','12:00','16:00',[0,1,2,3,4,5,6]],['Cashier','10:00','14:00',[0,1,2,3,4,5,6]],['Server','11:00','16:00',[0,1,2,3,4,5,6]],['Server','16:00','20:00',[0,1,2,3,4,5,6]],['Cook','10:00','18:00',[0,1,2,3,4,5,6]]].map(([role,start,end,days])=>({id:uid(),role,start,end,days,count:1,breakMinutes:0}));
  return d;
}
