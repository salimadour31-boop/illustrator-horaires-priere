const {HP,rand,setSeed,makeData,layout,frame,fmt}=require('./sim');
let checks=0, fails=0; function ok(c,msg){checks++; if(!c){fails++; console.log('FAIL',msg);} }
const cities=HP.cities(); const C=n=>cities.find(c=>c.name.indexOf(n)>=0);
const keys=['imsak','fajr','sunrise','dhuhr','asr','maghrib','isha'];
function run(frames,S){ const A=HP.analyze(HP.buildTable(HP.atomsFromFrames(frames),{blocks:S.blocks,rtlBlocks:S.rtlBlocks}),S); return A; }
function has(A,code){ return A.diags.some(d=>d.code===code); }
const alger=C('16 Alger'), oran=C('31 Oran'); const L=c=>({lat:c.lat,lon:c.lon,tz:c.tz,dst:c.dst});
const P=HP.paramsFromMethod('dz'); const J=HP.jdn(2027,2,8); // Ramadan 1448 (approx.)
// 0) structure : toutes les cellules lues, en-têtes reconnus, dans les 5 dispositions
for(const kind of ['cells','tabbed','columns','rowframes','spaces']) for(const lang of ['fr','ar']){
  setSeed(5); const d=makeData({loc:L(alger),P,startJ:J,n:30,keys,errRate:0});
  const A=run(layout(kind,d,keys,{lang}),{startJ:J,loc:L(alger),P,tol:2,cities});
  ok(A.cells.length===30*7,`${kind}/${lang} cells ${A.cells.length}`);
  ok(A.stats.errors===0,`${kind}/${lang} errors ${A.stats.errors}`);
  const lab=A.cols.filter(c=>c.prayer); ok(lab.length===7 && lab.every(c=>c.label===c.prayer),`${kind}/${lang} labels `+lab.map(c=>c.prayer+'='+c.label).join(','));
  ok(!A.diags.some(x=>x.level!=='info'),`${kind}/${lang} spurious diags `+A.diags.map(x=>x.code).join(','));
}
// 1) tableau décalé d'un jour / one-day shift
{ setSeed(1); const d=makeData({loc:L(alger),P,startJ:J+1,n:30,keys,errRate:0});
  const A=run(layout('tabbed',d,keys),{startJ:J,loc:L(alger),P,tol:1,cities}); ok(has(A,'shift') && A.diags.find(x=>x.code==='shift').v===1,'shift +1 '+A.diags.map(x=>x.code+':'+x.v).join(',')); }
// 2) mauvaise ville / wrong city (Oran times checked as Alger)
{ setSeed(2); const d=makeData({loc:L(oran),P,startJ:J,n:30,keys,errRate:0});
  const A=run(layout('cells',d,keys),{startJ:J,loc:L(alger),P,tol:2,cities}); const dc=A.diags.find(x=>x.code==='city'); ok(dc && dc.city.name.indexOf('Oran')>=0,'city '+(dc&&dc.city.name)+' '+A.diags.map(x=>x.code).join(','));
  ok(A.diags.filter(x=>x.code==='colOffset').length>=5,'col offsets for city'); }
// 3) heure d'été oubliée sur une colonne / DST on one column
{ setSeed(3); const d=makeData({loc:L(alger),P,startJ:J,n:30,keys,errRate:0}); d.rows.forEach(r=>r.w.isha+=60);
  const A=run(layout('columns',d,keys),{startJ:J,loc:L(alger),P,tol:2,cities}); ok(has(A,'colHour'),'colHour '+A.diags.map(x=>x.code).join(','));
  ok(A.cols.find(c=>c.prayer==='isha'),'isha still assigned with +60'); }
// 4) Asr hanafite / Hanafi Asr
{ setSeed(4); const P2=HP.paramsFromMethod('dz',{asrFactor:2}); const d=makeData({loc:L(alger),P:P2,startJ:J,n:30,keys,errRate:0});
  const A=run(layout('tabbed',d,keys),{startJ:J,loc:L(alger),P,tol:2,cities}); ok(has(A,'asr'),'asr hanafi '+A.diags.map(x=>x.code).join(',')); }
// 5) angles d'Égypte / Egyptian angles
{ setSeed(5); const P2=HP.paramsFromMethod('dz'); P2.fajrAngle=19.5; P2.ishaAngle=17.5; const d=makeData({loc:L(alger),P:P2,startJ:J,n:30,keys,errRate:0});
  const A=run(layout('tabbed',d,keys),{startJ:J,loc:L(alger),P,tol:2,cities}); const m=A.diags.find(x=>x.code==='method'); ok(m && m.m.fajr===19.5,'method '+(m&&m.m.id)+' '+A.diags.map(x=>x.code).join(',')); }
// 6) date de début erronée (mois faux) / wrong start date by a month
{ setSeed(6); const d=makeData({loc:L(alger),P,startJ:J+40,n:30,keys,errRate:0});
  const A=run(layout('tabbed',d,keys),{startJ:J,loc:L(alger),P,tol:2,cities}); const m=A.diags.find(x=>x.code==='startDate'); ok(m && Math.abs(m.v-40)<=1,'startDate '+(m&&m.v)+' '+A.diags.map(x=>x.code).join(',')); }
// 7) format 12 h (Asr 3:41, Isha 7:30)
{ setSeed(7); const d=makeData({loc:L(alger),P,startJ:J,n:20,keys,errRate:0.08});
  const fr=layout('tabbed',d,keys,{h12:true}); const A=run(fr,{startJ:J,loc:L(alger),P,tol:2,cities,search:false});
  ok(A.cols.filter(c=>c.fit&&c.fit.mode12).length===3,'mode12 cols '+A.cols.filter(c=>c.fit&&c.fit.mode12).map(c=>c.prayer));
  ok(A.stats.errors===new Set(d.injected.map(x=>x.row+x.key)).size,'12h errors '+A.stats.errors+' vs '+d.injected.length);
  const plan=HP.planFixes(A,'calc'); ok(plan.every(p=>!/^1[3-9]|^2/.test(p.newText) || ['sunrise','dhuhr'].includes(p.cell.prayer)),'12h output kept 12h: '+plan.map(p=>p.cell.prayer+' '+p.newText).join(' ')); }
// 8) remplissage de cases vides / filling placeholders
{ setSeed(8); const d=makeData({loc:L(alger),P,startJ:J,n:15,keys,errRate:0});
  const lines=['Jour\tFajr\tChourouk\tDohr\tAsr\tMaghreb\tIcha']; d.rows.forEach((r,i)=>lines.push((i+1)+'\t--:--\t--:--\t--:--\t--:--\t--:--\t--:--'));
  const F=frame(lines.join('\r'),50,700,{point:false,width:300}); const A=run([F],{startJ:J,loc:L(alger),P,tol:2,cities,search:false});
  ok(A.placeholders.length===15*6,'placeholders '+A.placeholders.length);
  const plan=HP.planFixes(A,'calc',{}); ok(plan.length===90,'fill plan '+plan.length);
  const api={text:()=>F.contents, replaceChar:(i,s)=>{F.contents=F.contents.slice(0,i)+s+F.contents.slice(i+1);}, removeChar:i=>{F.contents=F.contents.slice(0,i)+F.contents.slice(i+1);}, insertAfter:(i,s)=>{F.contents=F.contents.slice(0,i+1)+s+F.contents.slice(i+1);}};
  const r=HP.applyToFrame(api,plan); ok(r.done.length===90,'fill applied '+r.done.length);
  const A2=run([F],{startJ:J,loc:L(alger),P,tol:0,cities,search:false}); ok(A2.cells.length===90 && A2.stats.errors===0,'filled table exact '+A2.cells.length+' '+A2.stats.errors); }
// 9) remplissage sans en-têtes, ordre utilisateur, droite à gauche / fill without headers, RTL order
{ const lines=[]; for(let i=0;i<10;i++) lines.push(['--:--','--:--','--:--','--:--','--:--',String(i+1)].join('\t'));
  const F=frame(lines.join('\r'),50,700,{point:false,width:300,rtl:true});
  const A=run([F],{startJ:J,loc:L(alger),P,tol:2,cities,search:false,fillOrder:['fajr','dhuhr','asr','maghrib','isha'],rtlColumns:true});
  const order=A.cols.filter(c=>c.prayer).sort((a,b)=>b.x-a.x).map(c=>c.prayer).join(','); ok(order==='fajr,dhuhr,asr,maghrib,isha','rtl fill order '+order);
  // la 1re cellule logique (à droite à l'écran) reçoit Fajr / first logical cell (rightmost on screen) gets Fajr
  const plan=HP.planFixes(A,'none',true); const api={text:()=>F.contents, replaceChar:(i,s)=>{F.contents=F.contents.slice(0,i)+s+F.contents.slice(i+1);}, removeChar:i=>{F.contents=F.contents.slice(0,i)+F.contents.slice(i+1);}, insertAfter:(i,s)=>{F.contents=F.contents.slice(0,i+1)+s+F.contents.slice(i+1);}};
  HP.applyToFrame(api,plan); const t0=HP.computeDay(J,L(alger),P).t; const first=F.contents.split('\r')[0].split('\t');
  ok(first[0]===HP.formatTime(t0.fajr,{hourDigits:2,sep:':',digits:'latin'}) && first[4]===HP.formatTime(t0.isha,{hourDigits:2,sep:':',digits:'latin'}),'rtl logical fill '+first.join(' ')); }
// 10) jour du mois faux, jour de la semaine faux, ligne dupliquée, ordre / wrong day number, weekday, duplicated row, order
{ setSeed(10); const d=makeData({loc:L(alger),P,startJ:J,n:20,keys,errRate:0});
  d.rows[6].w=Object.assign({},d.rows[5].w);
  const fr=layout('tabbed',d,keys,{lang:'fr'}); let c=fr[0].contents.split('\r');
  let f=c[4].split('\t'); f[0]=String(+f[0]+1); c[4]=f.join('\t');
  f=c[9].split('\t'); f[1]='Mardi'===f[1]?'Jeudi':'Mardi'; c[9]=f.join('\t');
  f=c[12].split('\t'); const tmp=f[5]; f[5]=f[6]; f[6]=tmp; c[12]=f.join('\t');
  fr[0].contents=c.join('\r');
  const A=run(fr,{startJ:J,loc:L(alger),P,tol:2,cities,search:false});
  ok(A.diags.some(x=>x.code==='dayNum'&&x.row.index===3),'dayNum '+A.diags.filter(x=>x.code==='dayNum').map(x=>x.row.index));
  ok(A.diags.some(x=>x.code==='weekday'&&x.row.index===8),'weekday '+A.diags.filter(x=>x.code==='weekday').map(x=>x.row.index));
  ok(A.diags.some(x=>x.code==='dupRow'&&x.row.index===6),'dupRow');
  ok(A.diags.some(x=>x.code==='order'&&x.row.index===11),'order '+A.diags.filter(x=>x.code==='order').map(x=>x.row.index)); }
// 11) calendrier officiel avec minutes de précaution différentes : mode « fautes internes »
{ setSeed(11); const P2=HP.paramsFromMethod('dz'); P2.adj.dhuhr=3; P2.adj.asr=2; const d=makeData({loc:L(alger),P:P2,startJ:J,n:30,keys,errRate:0.06});
  const fr=layout('tabbed',d,keys); const A=run(fr,{startJ:J,loc:L(alger),P,tol:1,cities,search:false});
  ok(A.diags.filter(x=>x.code==='colOffset').map(x=>x.col.prayer).sort().join(',')==='asr,dhuhr','offset cols '+A.diags.filter(x=>x.code==='colOffset').map(x=>x.col.prayer+x.v));
  const inj=new Set(d.injected.map(x=>x.row+':'+x.key)); const intl=A.cells.filter(c=>c.internal).map(c=>c.row.index+':'+c.prayer);
  ok(intl.every(k=>inj.has(k)) && intl.length===inj.size,'internal = injected '+intl.length+' vs '+inj.size);
  const plan=HP.planFixes(A,'internal'); const F=fr[0]; const api={text:()=>F.contents, replaceChar:(i,s)=>{F.contents=F.contents.slice(0,i)+s+F.contents.slice(i+1);}, removeChar:i=>{F.contents=F.contents.slice(0,i)+F.contents.slice(i+1);}, insertAfter:(i,s)=>{F.contents=F.contents.slice(0,i+1)+s+F.contents.slice(i+1);}};
  HP.applyToFrame(api,plan); const A2=run(fr,{startJ:J,loc:L(alger),P:P2,tol:0,cities,search:false}); ok(A2.stats.errors===0,'internal fix restores official values exactly: '+A2.stats.errors); }
// 12) deux blocs côte à côte (1-15 | 16-30) / two blocks side by side
{ setSeed(12); const d=makeData({loc:L(alger),P,startJ:J,n:30,keys,errRate:0.05});
  const d1={rows:d.rows.slice(0,15)}, d2={rows:d.rows.slice(15)};
  const f1=layout('tabbed',d1,keys), f2=layout('tabbed',d2,keys); f2[0].bounds=[f2[0].bounds[0]+420,f2[0].bounds[1],f2[0].bounds[2]+420,f2[0].bounds[3]];
  const A=run([f1[0],f2[0]],{startJ:J,loc:L(alger),P,tol:2,cities,search:false,blocks:2});
  const inj=new Set(d.injected.map(x=>x.row+':'+x.key)); const er=A.cells.filter(c=>c.status==='error').map(c=>c.row.index+':'+c.prayer);
  ok(A.rows===30 && er.length===inj.size && er.every(k=>inj.has(k)),'2 blocks '+A.rows+' '+er.length+'/'+inj.size);
  const A1=run([f1[0],f2[0]],{startJ:J,loc:L(alger),P,tol:2,cities,search:false,blocks:1}); ok(A1.rows===15,'without blocks option, side-by-side rows merge into 15 rows (expected)'); }
// 13) chiffres arabes conservés à la correction / Arabic-Indic digits kept
{ setSeed(13); const d=makeData({loc:L(alger),P,startJ:J,n:10,keys,errRate:0.2});
  const fr=layout('spaces',d,keys,{lang:'ar',arDigits:true}); const A=run(fr,{startJ:J,loc:L(alger),P,tol:2,cities,search:false});
  const plan=HP.planFixes(A,'calc'); ok(plan.length>0 && plan.every(p=>/^[٠-٩]{2}:[٠-٩]{2}$/.test(p.newText)),'arabic digits '+plan.map(p=>p.newText).join(' ')); }
// 14) DST Europe : Paris, fin mars / Paris across DST change
{ const par=C('Paris'); const Jp=HP.jdn(2027,3,20); setSeed(14); const d=makeData({loc:L(par),P:HP.paramsFromMethod('fr12'),startJ:Jp,n:20,keys:['fajr','dhuhr','maghrib'],errRate:0});
  const A=run(layout('tabbed',d,['fajr','dhuhr','maghrib']),{startJ:Jp,loc:L(par),P:HP.paramsFromMethod('fr12'),tol:1,cities,search:false});
  ok(A.stats.errors===0 && A.cells.length===60,'paris dst '+A.stats.errors);
  const r0=HP.computeDay(HP.jdn(2027,3,27),L(par),HP.paramsFromMethod('fr12')).t.dhuhr, r1=HP.computeDay(HP.jdn(2027,3,28),L(par),HP.paramsFromMethod('fr12')).t.dhuhr; ok(r1-r0>55,'dst jump '+(r1-r0)); }
// 15) dates écrites JJ/MM dans les lignes priment sur la date saisie / written dates override
{ setSeed(15); const d=makeData({loc:L(alger),P,startJ:J+3,n:12,keys,errRate:0});
  const A=run(layout('tabbed',d,keys,{dateCells:true}),{startJ:J,loc:L(alger),P,tol:2,cities,search:false});
  ok(A.dateInfo.fromCells===12 && A.stats.errors===0,'written dates '+A.dateInfo.fromCells+' '+A.stats.errors); }
// 16) analyse de cellules
{ const p=HP.parseCell('Fajr 05h12'); ok(p.times.length===1&&p.times[0].h===5&&p.times[0].m===12&&p.label==='fajr','05h12');
  ok(HP.parseCell('12.03.2026').times.length===0,'date not time'); ok(HP.parseCell('١٩:٤٥').times[0].h===19,'arabic digits parse');
  ok(HP.parseCell('7:30 pm').times[0].pm===true,'pm'); ok(HP.parseCell('٧:٣٠ م').times[0].pm===true,'arabic pm');
  ok(HP.parseCell('--:--').placeholders.length===1,'placeholder'); ok(HP.parseCell('00:00').placeholders.length===1 && HP.parseCell('00:00').times.length===0,'00:00 placeholder');
  ok(HP.parseCell('1 500,00 DA').times.length===0,'price not time'); ok(HP.parseCell('الخميس').weekday===4,'weekday ar');
  ok(HP.parseCell('12 مارس').date.m===3,'month ar'); ok(HP.parseCell('15 جانفي 2027').date.y===2027,'jan dz');
  ok(HP.labelOf('العشاء')==='isha' && HP.labelOf('Chourouk')==='sunrise' && HP.labelOf('Iftar')==='maghrib' && HP.labelOf('Imsak')==='imsak','labels');
  ok(HP.formatTime(19*60+5,{hourDigits:1,sep:':',digits:'latin',suffix:' pm'},true)==='7:05 pm','format 12h');
  ok(HP.formatTime(5*60+5,{hourDigits:2,sep:'h',digits:'arabic',suffix:''})==='٠٥h٠٥','format ar'); }
console.log({checks,fails}); process.exitCode=fails?1:0;
