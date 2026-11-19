import * as XLSX from '../vendor/xlsx.mjs';
import Papa from 'papaparse';
import {DAYS,availableWeek,employeeError,conflicts,shapeError,uid,clone,validDate,mins} from './core.mjs';
export const FIELDS=[['name','Employee name'],['roles','Position / roles'],['rate','Hourly rate'],['maxHours','Weekly hour limit'],['availability','Availability'],['date','Shift date'],['start','Start time'],['end','End time'],['hours','Working hours (time range)'],['breakMinutes','Unpaid break (minutes)'],['email','Email']];
export {detectMapping,detectType,readImport,sheetFromMatrix,TYPE_LABELS} from './import-detection.mjs';
import {summaryRow} from './import-detection.mjs';
export function parseTime(value){
  let s=String(value??'').trim();if(!s)return '';
  if(/^0?\.\d+$/.test(s)){let m=Math.round(Number(s)*1440);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
  const m=s.match(/^(\d{1,2})(?::(\d{2}))?(?::00)?\s*(am|pm)?$/i);if(!m)return s;
  let hour=Number(m[1]);const minute=Number(m[2]||0);if(m[3]){if(hour<1||hour>12)return s;hour=hour%12+(m[3].toLowerCase()==='pm'?12:0);}return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}
export function parseRange(s){const m=String(s).trim().match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i);return m?[parseTime(m[1]),parseTime(m[2])]:null;}
function parseDays(s){s=s.toLowerCase().trim();if(!s||/^(all|daily|every day|all days|mon-sun|monday-sunday)$/.test(s))return [0,1,2,3,4,5,6];if(s==='weekdays')return [0,1,2,3,4];if(s==='weekends')return [5,6];const map={mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6};const normalized=s.replace(/monday/g,'mon').replace(/tuesday/g,'tue').replace(/wednesday/g,'wed').replace(/thursday/g,'thu').replace(/friday/g,'fri').replace(/saturday/g,'sat').replace(/sunday/g,'sun').replace(/\s+to\s+/g,'-').replace(/[–—]/g,'-');const out=new Set();for(const part of normalized.split(/[,+/\s]+/).filter(Boolean)){if(part.includes('-')){const [a,b]=part.split('-').map(v=>map[v]);if(a===undefined||b===undefined)throw new Error('Use days such as Mon-Fri or Tue, Thu.');for(let i=a;;i=(i+1)%7){out.add(i);if(i===b)break;}}else{if(map[part]===undefined)throw new Error('Use days such as Mon-Fri or Tue, Thu.');out.add(map[part]);}}return [...out];}
export function parseAvailability(text,fallbackRange){
  if(!String(text).trim()&&!fallbackRange)return availableWeek();if(/^(none|unavailable|not available)$/i.test(String(text).trim()))return DAYS.map(()=>({enabled:false,start:'07:00',end:'22:00'}));
  const result=DAYS.map(()=>({enabled:false,start:'07:00',end:'22:00'}));
  for(const part of String(text||'All').split(';')){
    const match=part.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*$/i);
    const range=match?parseRange(match[1]):fallbackRange||['07:00','22:00'];
    if(!range||!Number.isFinite(mins(range[0]))||!Number.isFinite(mins(range[1]))||mins(range[1])<=mins(range[0]))throw new Error('Availability needs a valid time range, such as Mon-Fri 09:00-17:00.');
    for(const i of parseDays(match?part.slice(0,match.index).trim():part))result[i]={enabled:true,start:range[0],end:range[1]};
  }return result;
}
export function normalizeDate(s,order='MDY'){s=String(s).trim();const ymd=s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);if(ymd)return `${ymd[1]}-${ymd[2].padStart(2,'0')}-${ymd[3].padStart(2,'0')}`;if(validDate(s))return s;const m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(m)return `${m[3]}-${m[order==='DMY'?2:1].padStart(2,'0')}-${m[order==='DMY'?1:2].padStart(2,'0')}`;return s;}
export function mappedRows(sheet,map,options={}){
  return sheet.rows.map((source,i)=>{
    const excluded=summaryRow(source,sheet.headers,map);
    const r={row:sheet.rowRefs?.[i]??i+2,include:!excluded,excluded,recordType:options.type||sheet.type||'auto',dateOrder:options.dateOrder||'MDY'};
    for(const [field]of FIELDS)r[field]=map[field]!==''&&map[field]!==undefined?source[Number(map[field])]||'':'';
    r.name=r.name.trim();r.roles=r.roles.trim();r.date=normalizeDate(r.date,r.dateOrder);r.start=parseTime(r.start);r.end=parseTime(r.end);
    return r;
  });
}
export {prepareImport} from './prepare-import.mjs';
export {XLSX};
