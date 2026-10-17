const HP=require('./load')(); const adhan=require('adhan');
function rnd(a,b){return a+Math.random()*(b-a);}
const per={}; 
for(let n=0;n<8000;n++){
  const lat=rnd(-45,48), lon=rnd(-170,170), tz=Math.round(lon/15);
  const y=2000+Math.floor(rnd(0,60)), m=1+Math.floor(rnd(0,12)), d=1+Math.floor(rnd(0,28));
  const P=HP.paramsFromMethod('mwl',{asrFactor:(n%2)?2:1}); P.rounding='none';
  const r=HP.computeDay(HP.jdn(y,m,d),{lat,lon,tz,dst:'none'},P).t;
  const p=adhan.CalculationMethod.MuslimWorldLeague(); p.rounding=adhan.Rounding.None; if(n%2) p.madhab=adhan.Madhab.Hanafi;
  const pt=new adhan.PrayerTimes(new adhan.Coordinates(lat,lon),new Date(y,m-1,d),p);
  for(const k of ['fajr','sunrise','dhuhr','asr','maghrib','isha']){
    const t=pt[k]; if(!t||isNaN(t)||isNaN(r[k])) continue;
    let lm=t.getUTCHours()*60+t.getUTCMinutes()+t.getUTCSeconds()/60+t.getUTCMilliseconds()/60000+tz*60;
    let diff=((lm-r[k])%1440+1440+720)%1440-720;
    (per[k]=per[k]||[]).push(Math.abs(diff)*60);
  }
}
for(const k in per){const a=per[k].sort((x,y)=>x-y); console.log(k,'n',a.length,'median s',a[a.length>>1].toFixed(1),'p99 s',a[Math.floor(a.length*0.99)].toFixed(1),'max s',a[a.length-1].toFixed(1));}
