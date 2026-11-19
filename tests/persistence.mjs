import {chromium} from 'playwright';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const channel=process.env.BROWSER_CHANNEL||'chrome';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const profile=await mkdtemp(path.join(tmpdir(),'shiftmate-persistence-'));
const options={channel,headless:true,offline:true,viewport:{width:1280,height:800}};
let context;
try{
 context=await chromium.launchPersistentContext(profile,options);let page=await context.newPage();await page.goto(pathToFileURL(path.join(root,'ShiftMate.html')).href);await page.getByRole('button',{name:'Start empty workspace',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Business name',{exact:true}).fill('Restart persistence verified');await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByText('Settings saved.',{exact:true}).waitFor();await context.close();context=null;
 context=await chromium.launchPersistentContext(profile,options);page=await context.newPage();await page.goto(pathToFileURL(path.join(root,'ShiftMate.html')).href);await page.getByRole('heading',{name:'Weekly schedule',exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shiftmate.business.v1.1')).settings.businessName),'Restart persistence verified');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shiftmate.business.v1.1')).employees.length),0);console.log(`PASS ${channel}: data survives a complete browser process restart.`);
}finally{await context?.close();if(path.dirname(path.resolve(profile))===path.resolve(tmpdir())&&path.basename(profile).startsWith('shiftmate-persistence-'))await rm(profile,{recursive:true,force:true});}
