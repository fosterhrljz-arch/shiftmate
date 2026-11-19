import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import * as XLSX from '../vendor/xlsx.mjs';
import {monday,addDays} from '../src/core.mjs';
const out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../samples');await mkdir(out,{recursive:true});const week=monday();
const roster=[
 ['Harbor Table - employee records'],['Fictional business data for testing'],[],
 ['Employee name','Position','Hourly rate (CNY)','Weekly hour limit','Availability','Email'],
 ['Mei Lin','Manager','￥32.00',40,'Mon-Sun 08:00-20:00','mei@example.com'],
 ['Daniel Reed','Cook','￥28.00',40,'Mon-Sun 08:00-22:00','daniel@example.com'],
 ['Priya Shah','Cook / Server','￥26.00',32,'Tue-Sun 08:00-22:00','priya@example.com'],
 ['Nina Patel','Server','￥20.00',32,'Mon-Sun 09:00-22:00','nina@example.com'],
 ['Nina Patel','Cashier','','','',''],
 ['Alex Morgan','Server; Cashier','￥20.00',32,'Mon-Sun 09:00-22:00','alex@example.com'],
 ['Owen Brooks','Cashier','￥19.00',24,'Mon-Fri 10:00-18:00','owen@example.com'],
 ['Grace Chen','Server','￥21.00',24,'Fri-Sun 09:00-22:00','grace@example.com'],
 ['Grand Total','','',224,'','']
];
const summary=[['Employee','Position','Total hours','Labor cost'],['Nina Patel','Server',8,160],['Grand Total','',8,160]];
const shifts=[['Harbor Table - approved shift records'],[],['Employee name','Position','Shift date','Start time','End time','Unpaid break (minutes)'],['Nina Patel','Cashier',week,'09:00','13:00',0],['Nina Patel','Server',addDays(week,1),'11:00','15:00',0],['TOTAL','','','','','']];
const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(summary),'Labor summary');XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(roster),'Employee roster');XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(shifts),'Shift records');
for(const [ext,type]of [['xlsx','xlsx'],['xls','biff8']])await writeFile(path.join(out,`harbor-table.${ext}`),XLSX.write(book,{type:'buffer',bookType:type,compression:true}));
await writeFile(path.join(out,'harbor-team.csv'),XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(roster)));
await writeFile(path.join(out,'harbor-shifts.csv'),XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(shifts)));
await writeFile(path.join(out,'harbor-summary.csv'),XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(summary)));
await writeFile(path.join(out,'role-update.csv'),'Employee name,Position,Hourly rate\nNina Patel,Barista,20\nNina Patel,server,20\n');
await writeFile(path.join(out,'conflicting-pay.csv'),'Employee name,Position,Hourly rate\nNina Patel,Server,20\nNina Patel,Cashier,25\n');
console.log('Created realistic roster, shift, summary, multi-role and conflicting-pay fixtures.');
