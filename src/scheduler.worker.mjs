import {generateWeek} from './scheduler.mjs';
self.onmessage=({data})=>{try{self.postMessage({result:generateWeek(data.data,data.week,data.options)});}catch(e){self.postMessage({error:e.message});}};
