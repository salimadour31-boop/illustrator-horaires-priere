const HP=require('./load')(); const adhan=require('adhan');
let fails=0, checks=0; const hist={};
function rnd(a,b){return a+Math.random()*(b-a);}
// Comparaison avec adhan-js (référence MIT) sur des lieux et dates aléatoires
const methods=[['mwl','MuslimWorldLeague'],['eg','Egyptian'],['uaq','UmmAlQura'],['dubai','Dubai'],['qatar','Qatar'],['kw','Kuwait'],['tr','Turkey'],['karachi','Karachi'],['isna','NorthAmerica']];
let maxd=0;
for(let n=0;n<6000;n++){
  const lat=rnd(-45,48), lon=rnd(-170,170), tz=Math.round(lon/15);
  const y=2000+Math.floor(rnd(0,60)), m=1+Math.floor(rnd(0,12)), d=1+Math.floor(rnd(0,28));
  const [mid,aname]=methods[n%methods.length]; const af=(n%3===0)?2:1;
  const P=HP.paramsFromMethod(mid,{asrFactor:af,imsakMinutes:10});
  const r=HP.computeDay(HP.jdn(y,m,d),{lat,lon,tz,dst:'none'},P).t;
  const p=adhan.CalculationMethod[aname](); if(af===2) p.madhab=adhan.Madhab.Hanafi;
  const coords=new adhan.Coordinates(lat,lon);
  // adhan interprets date components in local machine time; build date at noon UTC-safe
  const date=new Date(y,m-1,d);
  const pt=new adhan.PrayerTimes(coords,date,p);
  for(const k of ['fajr','sunrise','dhuhr','asr','maghrib','isha']){
    const t=pt[k]; if(!t||isNaN(t)) continue;
    // minutes locales du lieu / local minutes
    let lm=(t.getUTCHours()*60+t.getUTCMinutes()+tz*60); 
    let mine=r[k]; if(isNaN(mine)) continue;
    let diff=((lm-mine)%1440+1440+720)%1440-720;
    checks++; hist[diff]=(hist[diff]||0)+1; if(Math.abs(diff)>maxd) maxd=Math.abs(diff);
    if(Math.abs(diff)>1){ fails++; if(fails<8) console.log('DIFF',k,lat.toFixed(2),lon.toFixed(2),y,m,d,mid,af,'adhan',lm,'mine',mine); }
  }
}
console.log('checks',checks,'>1min',fails,'hist',JSON.stringify(hist),'max',maxd);
// Algérie : Alger 17/10/2026 attendu (adhan) 05:31 06:57 12:33 15:41 18:12 19:30
const P=HP.paramsFromMethod('dz'); const t=HP.computeDay(HP.jdn(2026,10,17),{lat:36.754,lon:3.059,tz:1,dst:'none'},P).t;
console.log(Object.keys(t).map(k=>k+' '+Math.floor(t[k]/60)+':'+HP.pad2(t[k]%60)).join(' | '));
// DST
console.log('EU 2026', HP.fmtDate(HP.lastWeekday(2026,3,0)), HP.fmtDate(HP.lastWeekday(2026,10,0)), 'US', HP.fmtDate(HP.nthWeekday(2026,3,0,2)), HP.fmtDate(HP.nthWeekday(2026,11,0,1)), 'EG', HP.fmtDate(HP.lastWeekday(2026,4,5)), HP.fmtDate(HP.lastWeekday(2026,10,4)));
// weekday vs JS Date
let wf=0; for(let i=0;i<20000;i++){const J=2400000+Math.floor(Math.random()*200000); const g=HP.fromJdn(J); const dt=new Date(Date.UTC(g.y,g.m-1,g.d)); if(dt.getUTCDay()!==HP.weekday(J)||HP.jdn(g.y,g.m,g.d)!==J) wf++;} console.log('weekday/jdn roundtrip fails',wf);
const dst=[HP.fmtDate(HP.lastWeekday(2026,3,0)),HP.fmtDate(HP.lastWeekday(2026,10,0)),HP.fmtDate(HP.nthWeekday(2026,3,0,2)),HP.fmtDate(HP.nthWeekday(2026,11,0,1)),HP.fmtDate(HP.lastWeekday(2026,4,5)),HP.fmtDate(HP.lastWeekday(2026,10,4))].join(' ');
const dstOk = dst==='29/03/2026 25/10/2026 08/03/2026 01/11/2026 24/04/2026 29/10/2026'
  && HP.isDST(HP.jdn(2026,10,24),'eu') && !HP.isDST(HP.jdn(2026,10,25),'eu') && !HP.isDST(HP.jdn(2026,3,28),'eu') && HP.isDST(HP.jdn(2026,3,29),'eu')
  && HP.isDST(HP.jdn(2026,7,1),'us') && !HP.isDST(HP.jdn(2026,11,1),'us') && HP.isDST(HP.jdn(2026,6,1),'eg') && !HP.isDST(HP.jdn(2026,12,1),'eg');
console.log('DST rules', dstOk ? 'OK' : 'FAIL '+dst);
process.exitCode = (fails>checks*0.01||wf||!dstOk)?1:0;
