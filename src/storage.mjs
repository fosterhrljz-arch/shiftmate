import {emptyData,sampleData,validateData,clone} from './core.mjs';
export const LEGACY_KEY='shiftmate.workspace.v1';
export const STORAGE_KEY='shiftmate.business.v1.1';
export const DEMO_KEY='shiftmate.demo.v1.1';
export const MODE_KEY='shiftmate.active.v1.1';
export const keyFor=mode=>mode==='demo'?DEMO_KEY:STORAGE_KEY;
export function loadWorkspace(storage=localStorage,requestedMode){
 try{
  const mode=requestedMode||(storage.getItem(MODE_KEY)==='demo'?'demo':'business');
  const raw=storage.getItem(keyFor(mode));
  if(raw){const data=validateData(JSON.parse(raw));if(data.workspaceKind!==mode)throw new Error('Workspace type does not match its storage location.');return {data,mode,error:'',legacy:null};}
  const legacy=storage.getItem(LEGACY_KEY);
  return {data:null,mode:null,error:'',legacy:legacy?validateData(JSON.parse(legacy)):null};
 }catch(e){return {data:null,mode:null,legacy:null,error:`Saved data could not be loaded: ${e.message} Nothing has been overwritten. Restore a backup to recover it.`};}
}
export function startWorkspace(mode,storage=localStorage){
 const raw=storage.getItem(keyFor(mode));
 const data=raw?validateData(JSON.parse(raw)):{...(mode==='demo'?sampleData():emptyData()),workspaceKind:mode};
 if(data.workspaceKind!==mode)throw new Error('This file belongs to a different workspace type.');
 if(!raw)storage.setItem(keyFor(mode),JSON.stringify(data));
 storage.setItem(MODE_KEY,mode);return data;
}
export function saveWorkspace(data,expectedRevision,storage=localStorage,mode='business'){
 validateData(data);if(data.workspaceKind&&data.workspaceKind!==mode)throw new Error('Demo and business data must stay separate.');
 const raw=storage.getItem(keyFor(mode));
 if(raw){const previous=validateData(JSON.parse(raw));if(previous.revision!==expectedRevision)throw new Error('This workspace changed in another tab. Reload before making further changes.');}
 else if(expectedRevision!==0)throw new Error('The saved workspace was removed in another tab. Reload before editing.');
 const saved={...data,workspaceKind:mode,revision:expectedRevision+1,savedAt:new Date().toISOString()};storage.setItem(keyFor(mode),JSON.stringify(saved));return saved;
}
export function isLegacyDemo(e){const names=['Sofia Chen','James Wilson','Ava Patel','Noah Brooks','Mia Rivera','Ethan Cole','Olivia Park','Lucas Reed'];const i=names.indexOf(e.name);return i>=0&&e.id===`emp-${i+1}`&&e.email===`${e.name.split(' ')[0].toLowerCase()}@example.com`;}
export function migrateLegacy(legacy,ids){
 validateData(legacy);const allowed=new Set(ids),data=clone(legacy);
 data.employees=data.employees.filter(e=>allowed.has(e.id)&&!isLegacyDemo(e));const keep=new Set(data.employees.map(e=>e.id));
 data.shifts=data.shifts.filter(s=>keep.has(s.employeeId));data.leave=data.leave.filter(l=>keep.has(l.employeeId));data.templates=[];
 data.workspaceKind='business';data.revision=0;if(data.settings.businessName==='Maple & Main')data.settings.businessName='My business';return data;
}
