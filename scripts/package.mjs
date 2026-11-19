import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
const zip=new JSZip(),checksums=[];
async function add(relative){const absolute=path.join(root,relative);for(const entry of await readdir(absolute,{withFileTypes:true})){if(['node_modules','.git','SHA256SUMS.txt'].includes(entry.name)||entry.name.endsWith('.zip'))continue;const file=path.join(relative,entry.name);if(entry.isDirectory())await add(file);else{const bytes=await readFile(path.join(root,file)),name=file.replaceAll('\\','/');zip.file('ShiftMate/'+name,bytes);checksums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);}}}
await add('');
const manifest=checksums.sort().join('\n')+'\n';await writeFile(path.join(root,'SHA256SUMS.txt'),manifest);zip.file('ShiftMate/SHA256SUMS.txt',manifest);
const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}});const target=path.join(root,`../ShiftMate-v${version}.zip`);await writeFile(target,bytes);console.log(`Packaged ${target} (${(bytes.length/1024/1024).toFixed(2)} MB) SHA-256 ${createHash('sha256').update(bytes).digest('hex')}`);
