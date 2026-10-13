// India-only extract from GeoNames cities1000 and admin1CodesASCII (CC BY 4.0).
// Download/unzip the official dumps into work/geonames before regenerating.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const admin=readFileSync('work/geonames/admin1CodesASCII.txt','utf8');
const cities=readFileSync('work/geonames/cities1000.txt','utf8');
const states=admin.split('\n').filter(line=>line.startsWith('IN.')).map(line=>{const [code,name]=line.trim().split('\t');return {code:code.slice(3),name:name==='Andaman and Nicobar'?'Andaman and Nicobar Islands':name,cities:[]};});
for(const line of cities.split('\n')){const data=line.split('\t');if(data[8]!=='IN')continue;const state=states.find(s=>s.code===data[10]);if(state&&data[2]&&data[2].length<=80)state.cities.push(data[2]);}
for(const state of states){state.cities=[...new Set(state.cities)].sort();}
if(states.length!==36||!states.find(s=>s.name==='Rajasthan')?.cities.includes('Jaipur'))throw Error('Unexpected India data');
mkdirSync('src/features/addresses',{recursive:true});
writeFileSync('src/features/addresses/india.json',JSON.stringify(states.sort((a,b)=>a.name.localeCompare(b.name))));
writeFileSync('src/features/addresses/data-source.json',JSON.stringify({provider:'GeoNames',license:'CC BY 4.0',source:'https://download.geonames.org/export/dump/',date:new Date().toISOString().slice(0,10),cities1000Sha256:createHash('sha256').update(cities).digest('hex'),admin1Sha256:createHash('sha256').update(admin).digest('hex')},null,2));
console.log(JSON.stringify({states:states.length,cities:states.reduce((n,s)=>n+s.cities.length,0)}));
