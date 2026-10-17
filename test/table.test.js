const {HP,rand,setSeed,makeData,layout}=require('./sim');
let checks=0, fails=0; function ok(c,msg){checks++; if(!c){fails++; if(fails<25) console.log('FAIL',msg);}}
const cities=HP.cities(); const KEYSETS=[['fajr','sunrise','dhuhr','asr','maghrib','isha'],['imsak','fajr','dhuhr','asr','maghrib','isha'],['fajr','dhuhr','asr','maghrib','isha']];
const kinds=['cells','tabbed','columns','rowframes','spaces'];
let found=0, injectedTot=0, fp=0, fixedOk=0, fixedTot=0, colOk=0, colTot=0;
for(let s=1;s<=300;s++){
  setSeed(s*7919);
  const city=cities[Math.floor(rand()*58)]; const loc={lat:city.lat,lon:city.lon,tz:city.tz,dst:city.dst};
  const P=HP.paramsFromMethod('dz'); const startJ=HP.jdn(2026,1,1)+Math.floor(rand()*700); const n=10+Math.floor(rand()*25);
  const keys=KEYSETS[s%3]; const kind=kinds[s%5]; const lang=(s%2)?'fr':'ar';
  const data=makeData({loc,P,startJ,n,keys});
  const frames=layout(kind,data,keys,{lang,arDigits:(s%4===0),h12:(s%6===1)});
  const atoms=HP.atomsFromFrames(frames);
  const table=HP.buildTable(atoms,{});
  const S={startJ,loc,P,tol:2,search:false};
  const A=HP.analyze(table,S);
  ok(A.rows===n, `rows ${A.rows}!=${n} kind ${kind} s${s}`);
  // colonnes bien reconnues
  const assigned=A.cols.filter(c=>c.prayer).map(c=>c.prayer).sort().join(',');
  colTot++; if(assigned===[...keys].sort().join(',')) colOk++; else if(fails<25) console.log('cols',kind,assigned,'vs',keys.join(','),'s'+s);
  // erreurs injectées toutes trouvées, pas de faux positifs
  const errs=A.cells.filter(c=>c.status==='error');
  const inj=new Set(data.injected.map(x=>x.row+':'+x.key));
  injectedTot+=inj.size;
  for(const e of errs){ const key=(e.row.index)+':'+e.prayer; if(inj.has(key)) found++; else { fp++; if(fp<10) console.log('FP',kind,key,e.diff,'s'+s); } }
  // correction puis nouvelle analyse
  const plan=HP.planFixes(A,'calc',null);
  const byF={}; for(const it of plan){ (byF[it.atom.fi]=byF[it.atom.fi]||[]).push(it); }
  for(const fi in byF){ const F=frames[fi]; const api={text:()=>F.contents, replaceChar:(i,str)=>{F.contents=F.contents.slice(0,i)+str+F.contents.slice(i+1);}, removeChar:i=>{F.contents=F.contents.slice(0,i)+F.contents.slice(i+1);}, insertAfter:(i,str)=>{F.contents=F.contents.slice(0,i+1)+str+F.contents.slice(i+1);} };
    const r=HP.applyToFrame(api,byF[fi]); fixedTot+=byF[fi].length; fixedOk+=r.done.length; ok(!r.failed.length,'apply failed '+JSON.stringify(r.failed.map(f=>f.why))); }
  const A2=HP.analyze(HP.buildTable(HP.atomsFromFrames(frames),{}),S);
  ok(A2.cells.filter(c=>c.status==='error').length===0, `remaining errors after fix kind ${kind} s${s}: `+A2.cells.filter(c=>c.status==='error').map(c=>c.row.index+':'+c.prayer+':'+c.atom.text+'/'+c.diff).join(' '));
  ok(A2.cells.length===A.cells.length, 'cell count changed after fix');
  const P3=HP.planFixes(A2,'calc',null); ok(P3.length===0,'idempotent');
}
console.log({checks,fails,injectedTot,found,fp,fixedTot,fixedOk,colOk,colTot});
process.exitCode=fails?1:0;
