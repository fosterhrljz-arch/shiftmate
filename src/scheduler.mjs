import {clone,uid,weekDays,inWeek,duration,conflicts,stats,allIssues,mins} from './core.mjs';

const stamp=s=>Date.UTC(...s.date.split('-').map((v,i)=>Number(v)-(i===1?1:0)))/60000+mins(s.start);

// Maximize covered shifts. Workload ratio orders equivalent choices; it is not
// allowed to sacrifice coverage. A bounded search returns its best valid plan.
export function generateWeek(data,week,options={}){
  const next=clone(data);let added=0;
  for(const [day,date] of weekDays(week).entries())for(const t of next.templates.filter(t=>t.days.includes(day))){
    const existing=next.shifts.filter(s=>s.date===date&&s.role===t.role&&s.start===t.start&&s.end===t.end).length;
    for(let n=existing;n<t.count;n++){next.shifts.push({id:uid(),date,role:t.role,start:t.start,end:t.end,breakMinutes:t.breakMinutes,employeeId:null,notes:'',assignmentSource:'auto'});added++;}
  }
  const original=new Map(data.shifts.map(s=>[s.id,s.employeeId]));
  const movable=next.shifts.filter(s=>inWeek(s,week)&&(!s.employeeId||s.assignmentSource==='auto'||options.reconsiderManual));
  const movableIds=new Set(movable.map(s=>s.id));
  const fixed={...next,shifts:next.shifts.filter(s=>!movableIds.has(s.id))};
  const employees=next.employees.filter(e=>e.active);
  const limits=employees.map(e=>Math.round(e.maxHours*60));
  const base=employees.map(e=>Math.round(fixed.shifts.filter(s=>s.employeeId===e.id&&inWeek(s,week)).reduce((n,s)=>n+duration(s)*60,0)));
  const tasks=movable.map(s=>({shift:s,minutes:Math.round(duration(s)*60),start:stamp(s),end:stamp(s)+duration(s)*60,eligible:employees.flatMap((e,i)=>conflicts(fixed,s,e.id).length?[]:[i])}));
  const rest=next.settings.minRestHours*60;
  const clash=(a,b)=>a.start<b.end+rest&&b.start<a.end+rest;
  let used=[...base],assigned=employees.map(()=>[]),choice=Array(tasks.length).fill(-1);
  const can=(t,e)=>used[e]+t.minutes<=limits[e]+0.001&&!assigned[e].some(j=>clash(t,tasks[j]));
  const eligible=i=>tasks[i].eligible.filter(e=>can(tasks[i],e));
  const rank=(i,list)=>list.sort((a,b)=>{
    // Retain flexible employees for the remaining tasks that need them.
    const load=(used[a]/limits[a])-(used[b]/limits[b]);
    return load||tasks.filter(t=>t.eligible.includes(a)).length-tasks.filter(t=>t.eligible.includes(b)).length||employees[a].name.localeCompare(employees[b].name);
  });
  const assign=(i,e)=>{choice[i]=e;used[e]+=tasks[i].minutes;assigned[e].push(i);};
  const undo=(i,e)=>{choice[i]=-1;used[e]-=tasks[i].minutes;assigned[e].pop();};
  let best=Array(tasks.length).fill(-1),bestCount=0,nodes=0,limited=false;
  for(let i=0;i<tasks.length;i++){const e=employees.findIndex(e=>e.id===original.get(tasks[i].shift.id));if(e>=0&&tasks[i].eligible.includes(e)&&can(tasks[i],e))assign(i,e);}
  best=[...choice];bestCount=choice.filter(e=>e>=0).length;
  const viable=tasks.flatMap((t,i)=>t.eligible.length?[i]:[]);
  const reset=()=>{used=[...base];assigned=employees.map(()=>[]);choice.fill(-1);};
  // Multiple cheap starting arrangements improve results before backtracking.
  for(const order of [
    [...viable].sort((a,b)=>tasks[a].eligible.length-tasks[b].eligible.length||tasks[a].start-tasks[b].start),
    [...viable].sort((a,b)=>tasks[a].minutes-tasks[b].minutes||tasks[a].eligible.length-tasks[b].eligible.length),
    [...viable].sort((a,b)=>tasks[b].start-tasks[a].start)
  ]){
    reset();let count=0;for(const i of order){const list=rank(i,eligible(i));if(list.length){assign(i,list[0]);count++;}}
    if(count>bestCount){bestCount=count;best=[...choice];}
  }
  reset();
  const deadline=performance.now()+(options.timeLimitMs??1800),maxNodes=options.maxNodes??180000;
  function search(remaining,count){
    if(bestCount===viable.length)return;
    if(++nodes>maxNodes||(nodes%128===0&&performance.now()>deadline)){limited=true;return;}
    if(count>bestCount){bestCount=count;best=[...choice];}
    if(count+remaining.length<=bestCount)return;
    const choices=remaining.map(i=>({i,list:eligible(i)})).filter(x=>x.list.length);
    if(count+choices.length<=bestCount)return;
    const free=used.reduce((n,h,e)=>n+Math.max(0,limits[e]-h),0);
    let sum=0,capacity=0;for(const minutes of choices.map(x=>tasks[x.i].minutes).sort((a,b)=>a-b)){sum+=minutes;if(sum<=free+0.001)capacity++;else break;}
    if(count+capacity<=bestCount)return;
    choices.sort((a,b)=>a.list.length-b.list.length||tasks[b.i].minutes-tasks[a.i].minutes||tasks[a.i].start-tasks[b.i].start);
    const {i,list}=choices[0],restTasks=choices.slice(1).map(x=>x.i);
    for(const e of rank(i,list)){assign(i,e);search(restTasks,count+1);undo(i,e);if(limited||bestCount===viable.length)return;}
    search(restTasks,count);
  }
  search(viable,0);
  let filled=0,reassigned=0;
  tasks.forEach((t,i)=>{const id=best[i]<0?null:employees[best[i]].id;t.shift.employeeId=id;t.shift.assignmentSource='auto';if(id&&!original.get(t.shift.id))filled++;if(original.get(t.shift.id)&&original.get(t.shift.id)!==id)reassigned++;});
  return {data:next,added,filled,reassigned,open:stats(next,week).open,issues:allIssues(next,week),searchComplete:!limited,searchNodes:nodes,locked:fixed.shifts.filter(s=>inWeek(s,week)&&s.employeeId).length};
}
