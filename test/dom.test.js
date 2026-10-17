const {makeTF,makeDoc,run,find}=require('./dommock'); const {HP,setSeed,makeData,layout}=require('./sim');
const fs=require('fs'), os=require('os'), path=require('path');
let checks=0, fails=0; function ok(c,m){checks++; if(!c){fails++; console.log('FAIL',m);}}
const JSX=path.join(__dirname,'..','HorairesPriere.jsx'); const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hp-'));
const cities=HP.cities(); const alger=cities[15]; const L={lat:alger.lat,lon:alger.lon,tz:1,dst:'none'};
const keys=['imsak','fajr','sunrise','dhuhr','asr','maghrib','isha']; const P=HP.paramsFromMethod('dz'); const J=HP.jdn(2027,2,8);
function tfsFromLayout(frames){ return frames.map(f=>makeTF(f.contents,{bounds:f.bounds,point:f.point})); }
function settingsDriver({start='08/02/2027',action='calc',fill=false,markers=true,clickApply=true,lang=null}={}){
  let n=0; return function(w){ n++;
    const title=w.text; 
    if(/v1\.0\.0/.test(title)){ // réglages
      if(lang){ const dd=find(w,c=>c.type==='dropdownlist'&&c.items.length===2&&c.items[0].text==='Français'); if(dd.selection.index!==(lang==='fr'?0:1)){ dd.selection=lang==='fr'?0:1; dd.onChange(); return; } }
      const edits=w.all.filter(c=>c.type==='edittext');
      const st=edits.find(e=>/\d{2}\/\d{2}\/\d{4}/.test(e.text)); st.text=start;
      const radios=w.all.filter(c=>c.type==='radiobutton'); radios.forEach(r=>r.value=false); radios[action==='analyse'?0:action==='calc'?1:2].value=true;
      const cbs=w.all.filter(c=>c.type==='checkbox'); cbs.find(c=>/Remplir|Fill/.test(c.text)).value=fill; cbs.find(c=>/repères|markers/.test(c.text)).value=markers;
      find(w,c=>c.type==='button'&&c.props.name==='ok').onClick();
    } else { // résultats
      w._list=find(w,c=>c.type==='listbox'); global.__lastResults=w;
      const ap=w.all.find(c=>c.type==='button'&&/^(Appliquer|Apply)/.test(c.text));
      if(clickApply&&ap) ap.onClick(); else find(w,c=>c.type==='button'&&c.props.name==='cancel').onClick();
    } }; }
// 1) aucun document / no document
{ const al=[]; run(JSX,{doc:null,driver:()=>{},userData:tmp,alerts:al}); ok(al.length===1&&/Aucun document/.test(al[0]),'no doc '+al); }
// 2) rien de sélectionné / nothing selected
{ const al=[]; run(JSX,{doc:makeDoc([]),driver:()=>{},userData:tmp,alerts:al}); ok(al.length===1&&/Rien de sélectionné/.test(al[0]),'no sel '+al); }
// 3) sélection sans heures / selection without times
{ const al=[]; const d=makeDoc([makeTF('Bonjour',{bounds:[0,100,50,90]})]); run(JSX,{doc:d,driver:settingsDriver(),userData:tmp,alerts:al}); ok(al.some(a=>/Aucune heure/.test(a)),'no times '+al); }
// 4) tableau à tabulations avec erreurs : correction appliquée
for (const kind of ['tabbed','cells','columns','rowframes','spaces']) {
  setSeed(42); const data=makeData({loc:L,P,startJ:J,n:30,keys,errRate:0.06});
  const tfs=tfsFromLayout(layout(kind,data,keys,{lang:kind==='spaces'?'ar':'fr'}));
  const grp={typename:'GroupItem',pageItems:tfs};
  const doc=makeDoc([grp]); const al=[];
  const fontsBefore=tfs.map(t=>t._fmt.map(f=>f.font).join(''));
  run(JSX,{doc,driver:settingsDriver(),userData:tmp,alerts:al});
  const inj=new Set(data.injected.map(x=>x.row+':'+x.key));
  const res=global.__lastResults; ok(res&&res._list.rows.length===inj.size,`${kind} listed ${res&&res._list.rows.length} vs ${inj.size}`);
  ok(al.some(a=>new RegExp('^'+inj.size+' cellule').test(a)),`${kind} applied alert `+al.join('|'));
  // relecture : plus d'erreur / re-read: no error
  const frames=tfs.map(t=>({contents:t.contents,bounds:t.geometricBounds,point:t.kind==='POINT',anchor:t.anchor,metric:()=>({size:10,leading:14}),rtl:()=>null}));
  const A=HP.analyze(HP.buildTable(HP.atomsFromFrames(frames),{}),{startJ:J,loc:L,P,tol:2,search:false});
  ok(A.stats.errors===0&&A.cells.length===30*7,`${kind} after fix errors ${A.stats.errors} cells ${A.cells.length}`);
  // mise en forme : longueur des attributs = longueur du texte, polices des caractères inchangées (même longueur)
  ok(tfs.every(t=>t._fmt.length===t.contents.length),`${kind} formatting array in sync`);
  ok(tfs.every((t,i)=>t._fmt.map(f=>f.font).join('')===fontsBefore[i]),`${kind} per-char fonts kept`);
  // repères : un rectangle + une étiquette par cellule fausse / markers
  const layer=doc.layers[0]; ok(layer&&layer.printable===false&&layer.items.filter(x=>x.kind==='rect').length>=inj.size,`${kind} markers ${layer&&layer.items.length}`);
}
// 5) Analyser seulement : rien ne change / analyse only: nothing changes
{ setSeed(7); const data=makeData({loc:L,P,startJ:J,n:15,keys,errRate:0.1}); const tfs=tfsFromLayout(layout('tabbed',data,keys)); const before=tfs.map(t=>t.contents).join('|');
  const doc=makeDoc(tfs); const al=[]; run(JSX,{doc,driver:settingsDriver({action:'analyse'}),userData:tmp,alerts:al});
  ok(tfs.map(t=>t.contents).join('|')===before,'analyse only unchanged'); ok(!global.__lastResults.all.some(c=>c.type==='button'&&/^Appliquer/.test(c.text)),'no apply button in analyse mode'); }
// 6) remplissage / fill
{ const lines=['Jour\tFajr\tChourouk\tDohr\tAsr\tMaghreb\tIcha']; for(let i=0;i<10;i++) lines.push((i+1)+'\t--:--\t--:--\t--:--\t--:--\t--:--\t--:--');
  const tf=makeTF(lines.join('\r'),{bounds:[50,700,350,546],point:false}); const doc=makeDoc([tf]); const al=[];
  run(JSX,{doc,driver:settingsDriver({action:'analyse',fill:true}),userData:tmp,alerts:al});
  ok(!/--:--/.test(tf.contents),'filled all placeholders'); const first=tf.contents.split('\r')[1].split('\t'); const t=HP.computeDay(J,L,P).t;
  ok(first[1]===HP.formatTime(t.fajr,{hourDigits:2,sep:':',digits:'latin'})&&first[6]===HP.formatTime(t.isha,{hourDigits:2,sep:':',digits:'latin'}),'filled values '+first.join(' ')); }
// 7) bloc verrouillé non modifié / locked frame untouched
{ setSeed(9); const data=makeData({loc:L,P,startJ:J,n:15,keys,errRate:0.15}); const fr=layout('tabbed',data,keys)[0]; const tf=makeTF(fr.contents,{bounds:fr.bounds,point:false,locked:true});
  const before=tf.contents; const al=[]; run(JSX,{doc:makeDoc([tf]),driver:settingsDriver(),userData:tmp,alerts:al}); ok(tf.contents===before && al.some(a=>/^0 cellule/.test(a)),'locked frame kept '+al); }
// 8) réglages mémorisés et anglais / remembered settings and English UI
{ const al=[]; setSeed(10); const data=makeData({loc:L,P,startJ:J,n:10,keys,errRate:0.2}); const tfs=tfsFromLayout(layout('tabbed',data,keys));
  run(JSX,{doc:makeDoc(tfs),driver:settingsDriver({lang:'en',action:'analyse'}),userData:tmp,alerts:al});
  const cfg=fs.readFileSync(path.join(tmp,'HorairesPriere_reglages.txt'),'utf8'); ok(/lang=en/.test(cfg)&&/start=08\/02\/2027/.test(cfg),'settings saved '+cfg.slice(0,80));
  ok(/Written/.test(JSON.stringify(global.__lastResults._list.props.columnTitles)),'english results'); }
// 9) rapport .txt / report
{ setSeed(11); const data=makeData({loc:L,P,startJ:J,n:10,keys,errRate:0.2}); const tfs=tfsFromLayout(layout('tabbed',data,keys)); const out=path.join(tmp,'rapport.txt'); const al=[];
  const drv=function(w){ if(/v1\.0\.0/.test(w.text)){ settingsDriver({action:'analyse',lang:'fr'})(w); } else { w.all.find(c=>c.type==='button'&&/rapport|report/i.test(c.text)).onClick(); w.close(); } };
  run(JSX,{doc:makeDoc(tfs),driver:drv,userData:tmp,alerts:al,saveTo:out}); const txt=fs.readFileSync(out,'utf8');
  ok(/Horaires de prière/.test(txt)&&/Alger/.test(txt)&&/faute de frappe probable|faux/.test(txt),'report content'); ok(txt.charCodeAt(0)===0xFEFF,'BOM'); }
console.log({checks,fails}); process.exitCode=fails?1:0;
