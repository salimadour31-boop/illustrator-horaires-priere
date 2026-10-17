const {HP,setSeed,makeData,layout}=require('./sim');
const cities=HP.cities(); const a=cities[15], o=cities[30]; const L=c=>({lat:c.lat,lon:c.lon,tz:c.tz,dst:c.dst});
const P=HP.paramsFromMethod('dz'); const J=HP.jdn(2027,2,8); const keys=['imsak','fajr','sunrise','dhuhr','asr','maghrib','isha'];
let calls=0; const orig=HP.sun; HP.sun=function(jd){calls++; return orig(jd);};
for (const [name,loc] of [['ok',L(a)],['wrongcity',L(o)]]){
 setSeed(3); const d=makeData({loc,P,startJ:J,n:30,keys,errRate:0.03}); const fr=layout('tabbed',d,keys);
 calls=0; let t=Date.now(); const A=HP.analyze(HP.buildTable(HP.atomsFromFrames(fr),{}),{startJ:J,loc:L(a),P,tol:2,cities});
 console.log(name,'ms',Date.now()-t,'sun() calls',calls, A.diags.map(x=>x.code).join(','));
}
// annual table 365 rows
setSeed(4); const d=makeData({loc:L(a),P,startJ:HP.jdn(2027,1,1),n:365,keys,errRate:0.01}); const fr=layout('tabbed',d,keys);
calls=0; let t=Date.now(); const A=HP.analyze(HP.buildTable(HP.atomsFromFrames(fr),{}),{startJ:HP.jdn(2027,1,1),loc:L(a),P,tol:2,cities});
console.log('annual ms',Date.now()-t,'sun() calls',calls,'errors',A.stats.errors,'injected',d.injected.length);
