// Build a portable illustrated guide from the small Markdown subset in README.
// No runtime JavaScript, external fonts or third-party renderer is needed.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(path.join(root,'README.md'),'utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline=s=>escape(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img alt="$1" src="$2" loading="lazy">').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
const lines=source.split(/\r?\n/),parts=[],contents=[];
for(let i=0;i<lines.length;){
 const line=lines[i];if(!line.trim()){i++;continue;}
 if(line.startsWith('```')){const code=[];for(i++;i<lines.length&&!lines[i].startsWith('```');i++)code.push(lines[i]);i++;parts.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);continue;}
 const heading=line.match(/^(#{1,3}) (.+)/);if(heading){const n=heading[1].length,id=slug(heading[2]);parts.push(`<h${n} id="${id}">${inline(heading[2])}</h${n}>`);if(n===2)contents.push(`<a href="#${id}">${inline(heading[2])}</a>`);i++;continue;}
 if(line.startsWith('|')){const rows=[];while(i<lines.length&&lines[i].startsWith('|'))rows.push(lines[i++]);const cells=s=>s.split('|').slice(1,-1).map(x=>x.trim());parts.push('<div class="table-scroll"><table><thead><tr>'+cells(rows[0]).map(x=>`<th>${inline(x)}</th>`).join('')+'</tr></thead><tbody>'+rows.slice(2).map(row=>'<tr>'+cells(row).map(x=>`<td>${inline(x)}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>');continue;}
 if(/^(\d+\. |- )/.test(line)){const ordered=/^\d/.test(line),tag=ordered?'ol':'ul',items=[];const start=ordered?` start="${parseInt(line)}"`:'';while(i<lines.length&&/^(\d+\. |- )/.test(lines[i])){let item=lines[i++].replace(/^(\d+\. |- )/,'');while(i<lines.length&&/^ {2}\S/.test(lines[i]))item+=' '+lines[i++].trim();items.push(`<li>${inline(item)}</li>`);}parts.push(`<${tag}${start}>${items.join('')}</${tag}>`);continue;}
 // These authored image tags are kept so the mobile gallery retains its widths.
 if(line.startsWith('<img ')){parts.push(`<div class="mobile-gallery">${line}</div>`);i++;continue;}
 const paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(#|\||```|<img |\d+\. |- )/.test(lines[i]))paragraph.push(lines[i++]);parts.push(`<p>${inline(paragraph.join(' '))}</p>`);
}
await writeFile(path.join(root,'GUIDE.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ShiftMate v1.1 — Illustrated guide</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f7f9;color:#17192e;font:16px/1.7 system-ui,sans-serif}main{max-width:1100px;margin:auto;background:white;padding:44px 60px}h1,h2,h3{line-height:1.25}h1{font-size:36px}h2{margin-top:56px;padding-top:20px;border-top:1px solid #e1e4ed}a{color:#5144c6}nav{display:flex;flex-wrap:wrap;gap:8px 20px;padding:20px;background:#f5f3ff;border-radius:8px}nav a{font-size:14px}img{max-width:100%;height:auto;border:1px solid #e1e4ed;border-radius:8px}p>img{margin:12px 0}li{margin:9px 0}code{font:0.9em/1.5 Consolas,monospace;background:#f3f4f7;padding:2px 5px;border-radius:4px}pre{background:#f3f4f7;padding:20px;overflow:auto}pre code{padding:0}table{border-collapse:collapse;width:100%}th,td{text-align:left;border:1px solid #e1e4ed;padding:10px 14px}th{background:#f5f3ff}.table-scroll{overflow:auto}.mobile-gallery{display:flex;flex-wrap:wrap;align-items:flex-start;gap:16px}.mobile-gallery img{max-width:100%}.launch{display:inline-block;background:#6155d9;color:white;text-decoration:none;padding:10px 18px;border-radius:6px;margin-bottom:14px}@media(max-width:650px){main{padding:24px 18px}h1{font-size:28px}nav{display:block}nav a{display:block;margin:5px 0}}@media print{body{background:white}main{padding:0}nav,.launch{display:none}img{max-height:650px;object-fit:contain}h2{break-after:avoid}}
</style></head><body><main><a class="launch" href="ShiftMate.html">Open ShiftMate</a><nav aria-label="Guide contents">${contents.join('')}</nav>${parts.join('\n')}</main></body></html>`);
console.log('Built GUIDE.html with local screenshots.');
