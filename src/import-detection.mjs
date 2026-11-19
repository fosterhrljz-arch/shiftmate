import * as XLSX from '../vendor/xlsx.mjs';
import Papa from 'papaparse';

const key=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={
 name:['name','employeename','employeefullname','employee','staffname','staff','fullname','teammember'],
 roles:['position','positions','role','roles','jobtitle','job','primaryrole','qualifiedroles'],
 rate:['hourlyrate','rate','hourlypay','hourlywage','wage','payrate','hourlyrateusd','hourlyratecny','rateperhour'],
 maxHours:['maxhours','weeklyhourlimit','maxweeklyhours','maximumweeklyhours','contracthours','contractedhours','maximumhours','weeklylimit'],
 availability:['availability','availabledays','daysavailable','workdays','available','weeklyavailability'],
 date:['date','shiftdate','workdate'],start:['start','starttime','shiftstart','clockin'],end:['end','endtime','shiftend','clockout'],
 hours:['workinghours','shifttime','timerange','workhours','shift'],breakMinutes:['break','breakminutes','unpaidbreakminutes'],email:['email','emailaddress']
};
export function detectMapping(headers,rows=[]){
 const map={};for(const [field,names]of Object.entries(aliases)){const matches=headers.flatMap((h,i)=>names.includes(key(h))?[i]:[]);map[field]=matches.length===1?String(matches[0]):'';}
 // Generic 'Hours' often means a total, and 'Day' often contains weekdays.
 const hours=headers.findIndex(h=>key(h)==='hours');
 if(map.hours===''&&hours>=0&&rows.some(r=>/\d.*(?:-|–|—|to).*\d/.test(r[hours]))&&rows.filter(r=>String(r[hours]||'').trim()).every(r=>/\d.*(?:-|–|—|to).*\d/.test(r[hours])))map.hours=String(hours);
 const day=headers.findIndex(h=>key(h)==='day');if(map.date===''&&day>=0&&rows.some(r=>/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(r[day])))map.date=String(day);
 return map;
}
export const TYPE_LABELS={employees:'Employee list',shifts:'Shift records',summary:'Summary table',calendar:'Calendar grid',unknown:'Needs review'};
export function detectType(headers,rows,map=detectMapping(headers,rows)){
 const keys=headers.map(key),metrics=keys.filter(k=>/^(total|scheduled|paid|overtime|estimated|labor|labour|average|avg|headcount|weeklyhours|hoursworked|hours$)/.test(k));
 if(keys.filter(k=>/^(mon|tue|wed|thu|fri|sat|sun)(day)?\d*$/.test(k)).length>=3)return {type:'calendar',reason:'This sheet lays out days across columns. Choose a row-per-shift sheet instead.'};
 if(map.date!==''&&((map.start!==''&&map.end!=='')||map.hours!==''))return {type:'shifts',reason:'Dated rows with start and end times.'};
 if(metrics.length>=2||(metrics.length&&map.date===''&&map.rate===''&&map.maxHours===''&&map.availability===''))return {type:'summary',reason:'Totals or reporting columns were found, rather than individual shift details or an employee roster.'};
 if(map.name!==''&&['roles','rate','maxHours','availability','email'].some(k=>map[k]!==''))return {type:'employees',reason:'Employee names with roster details.'};
 return {type:'unknown',reason:'Choose the record type and confirm the name column before continuing.'};
}
export function summaryRow(source,headers,map){
 const text=String(source[Number(map.name)]??source.find(v=>String(v).trim())??'').trim();
 if(/^(?:grand\s+total|sub\s*total|totals?|average|avg|summary|headcount|total\s+(?:hours|cost|pay|employees|staff)|open\s+shifts?)\b\s*[:(\d-]*/i.test(text))return 'Summary or open-shift row';
 if(text&&key(text)===key(headers[Number(map.name)]))return 'Repeated header row';
 if(source.every(v=>!String(v??'').trim()))return 'Empty row';
 return '';
}
export function sheetFromMatrix(name,matrix,rowOffset=0,headerIndex){
 const candidates=matrix.slice(0,30).map((row,i)=>{const map=detectMapping(row,matrix.slice(i+1,i+11));return {i,score:Object.values(map).filter(v=>v!=='').length*2+(map.name!==''?8:0)};});
 const chosen=headerIndex??[...candidates].sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.i??0;
 const width=Math.max(0,...matrix.map(r=>r.length));
 const headers=Array.from({length:width},(_,i)=>String(matrix[chosen]?.[i]||`Column ${i+1}`));
 const rows=matrix.slice(chosen+1).map(r=>Array.from({length:width},(_,i)=>String(r[i]??'')));
 const rowRefs=rows.map((_,i)=>rowOffset+chosen+i+2);
 const mapping=detectMapping(headers,rows),detected=detectType(headers,rows,mapping);
 return {name,matrix,rowOffset,headerIndex:chosen,headers,rows,rowRefs,mapping,...detected};
}
export async function readImport(file){
 if(file.size>10*1024*1024)throw new Error('Please use a file smaller than 10 MB.');
 if(!/\.(csv|tsv|xlsx|xls)$/i.test(file.name))throw new Error('Choose a CSV, TSV, XLSX or XLS file.');
 let sheets;
 if(/\.(csv|tsv)$/i.test(file.name)){
  const bytes=new Uint8Array(await file.arrayBuffer());let text;
  try{text=new TextDecoder(bytes[0]===255&&bytes[1]===254?'utf-16le':bytes[0]===254&&bytes[1]===255?'utf-16be':'utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('Cannot read this text encoding. Save the CSV as UTF-8 in Excel and try again.');}
  text=text.replace(/^\uFEFF/,'');const sep=text.match(/^sep=(.)\r?\n/i);if(sep)text=text.slice(sep[0].length);
  const parsed=Papa.parse(text,{skipEmptyLines:false,delimiter:sep?.[1]||(/\.tsv$/i.test(file.name)?'\t':''),dynamicTyping:false});
  if(parsed.errors.some(e=>e.code!=='UndetectableDelimiter'))throw new Error(`CSV could not be read: ${parsed.errors[0].message}`);
  const matrix=parsed.data;while(matrix.length&&matrix.at(-1).every(v=>!String(v).trim()))matrix.pop();
  sheets=[{name:'Sheet 1',matrix,rowOffset:sep?1:0}];
 }else{
  const book=XLSX.read(await file.arrayBuffer(),{type:'array',cellNF:true,cellDates:false,sheetRows:2032});
  if(book.Custprops?.ShiftMateWorkspace==='demo')throw new Error('This is a demo export. Demo spreadsheets cannot be imported into your business workspace. Use your original employee file.');
  sheets=book.SheetNames.map(name=>{
   const sheet=book.Sheets[name],ref=sheet['!fullref']||sheet['!ref'];if(!ref)return {name,matrix:[],rowOffset:0};
   const range=XLSX.utils.decode_range(ref);if(range.e.r-range.s.r>2030||range.e.c-range.s.c>=100)throw new Error('Use at most 2,000 records and 100 columns per worksheet.');
   const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:'',blankrows:true});
   matrix.forEach((row,i)=>row.forEach((v,j)=>{
    const c=sheet[XLSX.utils.encode_cell({r:range.s.r+i,c:range.s.c+j})];
    // Use the raw numeric cell: sheet_to_json may create a Date using the
    // 1900 epoch even when the workbook explicitly uses the 1904 epoch.
    if(c?.t==='n'&&c.z&&XLSX.SSF.is_date(c.z)){
     const d=XLSX.SSF.parse_date_code(c.v,{date1904:book.Workbook?.WBProps?.date1904});
     if(d)row[j]=c.v<1?`${String(d.H).padStart(2,'0')}:${String(d.M).padStart(2,'0')}`:`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    }else if(v instanceof Date){
     row[j]=v.getFullYear()<1901?`${String(v.getHours()).padStart(2,'0')}:${String(v.getMinutes()).padStart(2,'0')}`:`${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    }else row[j]=String(v??'');
   }));
   return {name,matrix,rowOffset:range.s.r};
  });
 }
 return sheets.filter(s=>s.matrix.length>1).map(s=>{const result=sheetFromMatrix(s.name,s.matrix,s.rowOffset);if(result.rows.length>2000||result.headers.length>100)throw new Error('Use at most 2,000 records and 100 columns per worksheet.');return result;});
}
