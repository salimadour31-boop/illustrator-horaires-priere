// Générateur de tableaux simulés / simulated table generator
const HP=require('./load')();
let seed=1; function rand(){ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; }
function setSeed(s){seed=s;}
const AR_D='٠١٢٣٤٥٦٧٨٩';
function toAr(s){return s.replace(/[0-9]/g,d=>AR_D[+d]);}
function fmt(min,{pad=true,sep=':',ar=false,h12=false}={}){ let v=((min%1440)+1440)%1440,h=Math.floor(v/60),m=v%60; if(h12){h=h%12; if(!h)h=12;} let s=(pad&&h<10?'0':'')+h+sep+(m<10?'0':'')+m; return ar?toAr(s):s; }
const NAMES={fr:{imsak:'Imsak',fajr:'Fajr',sunrise:'Chourouk',dhuhr:'Dohr',asr:'Asr',maghrib:'Maghreb',isha:'Icha'},ar:{imsak:'الإمساك',fajr:'الفجر',sunrise:'الشروق',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'}};
const WD={fr:['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],ar:['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']};
// Construit les données : rows[i] = {J, times:{key:min}, written:{key:min}}
function makeData({loc,P,startJ,n,keys,errRate=0.05,maxErr=30}){
  const rows=[], injected=[];
  for(let i=0;i<n;i++){ const t=HP.computeDay(startJ+i,loc,P).t; const w={};
    for(const k of keys){ let v=t[k]; if(rand()<errRate){ let d=0; while(Math.abs(d)<4) d=Math.round((rand()*2-1)*maxErr); v+=d; injected.push({row:i,key:k,d}); } w[k]=v; }
    rows.push({J:startJ+i,t,w}); }
  return {rows,injected};
}
// Descripteur de bloc / frame descriptor
function frame(contents,l,t,{point=true,size=10,leading=14,width=null,rtl=null}={}){
  const lines=contents.split(/\r|\n|\u0003/); const maxLen=Math.max(...lines.map(x=>x.length));
  const w=width||Math.max(8,maxLen*size*0.55); const h=lines.length*leading;
  return {contents,bounds:[l,t,l+w,t-h],point,anchor:[l,t-size*0.8],metric:()=>({size,leading}),rtl:()=>rtl};
}
// Dispositions / layouts
function layout(kind,data,keys,opt={}){
  const lang=opt.lang||'fr', ar=!!opt.arDigits, frames=[], X0=50, Y0=700, cw=opt.cw||42, rh=opt.rh||14;
  const fm=(v,k)=>fmt(v,{ar,h12:opt.h12&&HP.idx(['asr','maghrib','isha'],k)>=0,sep:opt.sep||':'});
  const dayCell=r=>{const g=HP.fromJdn(r.J); return opt.dateCells? (String(g.d).padStart(2,'0')+'/'+String(g.m).padStart(2,'0')) : String(g.d);};
  const wdCell=r=>WD[lang][HP.weekday(r.J)];
  let cols=[...keys];
  if(kind==='cells'){ // une cellule par bloc
    const head=['', ''].concat(keys.map(k=>NAMES[lang][k]));
    head.forEach((h,c)=>{ if(h) frames.push(frame(h,X0+c*cw,Y0)); });
    data.rows.forEach((r,i)=>{ const y=Y0-(i+1)*rh; frames.push(frame(dayCell(r),X0,y)); frames.push(frame(wdCell(r),X0+cw,y,{width:cw-4}));
      keys.forEach((k,c)=>frames.push(frame(fm(r.w[k],k),X0+(c+2)*cw,y))); });
  } else if(kind==='tabbed'){ // un seul bloc à tabulations
    const lines=[['Jour','',...keys.map(k=>NAMES[lang][k])].join('\t')];
    data.rows.forEach(r=>lines.push([dayCell(r),wdCell(r),...keys.map(k=>fm(r.w[k],k))].join('\t')));
    frames.push(frame(lines.join('\r'),X0,Y0,{point:false,width:(keys.length+2)*cw}));
  } else if(kind==='columns'){ // un bloc par colonne
    frames.push(frame(data.rows.map(dayCell).join('\r'),X0,Y0-rh,{}));
    keys.forEach((k,c)=>{ frames.push(frame(NAMES[lang][k],X0+(c+1)*cw,Y0+2)); frames.push(frame(data.rows.map(r=>fm(r.w[k],k)).join('\r'),X0+(c+1)*cw,Y0-rh)); });
  } else if(kind==='rowframes'){ // un bloc par ligne
    frames.push(frame(['',...keys.map(k=>NAMES[lang][k])].join('\t'),X0,Y0,{width:(keys.length+1)*cw}));
    data.rows.forEach((r,i)=>frames.push(frame([dayCell(r),...keys.map(k=>fm(r.w[k],k))].join('\t'),X0,Y0-(i+1)*rh,{width:(keys.length+1)*cw})));
  } else if(kind==='spaces'){ // espaces, arabe RTL
    const lines=[keys.map(k=>NAMES[lang][k]).reverse().join('   ')];
    data.rows.forEach(r=>lines.push(keys.map(k=>fm(r.w[k],k)).reverse().join('   ')+'   '+wdCell(r)+' '+dayCell(r)));
    frames.push(frame(lines.join('\r'),X0,Y0,{point:true,rtl:false}));
  }
  return frames;
}
module.exports={HP,rand,setSeed,fmt,makeData,layout,frame,NAMES,toAr};
