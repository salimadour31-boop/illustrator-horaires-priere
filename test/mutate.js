// Tests de mutation : chaque défaut volontaire doit faire échouer au moins un test
// Mutation tests: each deliberate bug must make at least one test fail
const fs=require('fs'), os=require('os'), path=require('path'), {spawnSync}=require('child_process');
const M=[
 ['engine','Asr hanafite/shafi : ombre mesurée à minuit', 'Math.tan(Math.abs(lat * HP.DEG - decNoon))', 'Math.tan(Math.abs(lat * HP.DEG))'],
 ['engine','heure d\'été UE : fin en septembre', 'HP.lastWeekday(y, 10, 0)', 'HP.lastWeekday(y, 9, 0)'],
 ['engine','lever/coucher sans réfraction', "return -0.8333; }, -1", "return 0; }, -1"],
 ['engine','modification char par char décalée', "edits.push({ pos: i, del: 1, ins: newT.charAt(i) })", "edits.push({ pos: i + 1, del: 1, ins: newT.charAt(i) })"],
 ['collect','miroir droite-gauche oublié', 'a.x = rtl ? r - w * (mid / len)', 'a.x = false ? r - w * (mid / len)'],
 ['engine','tolérance de ligne trop large', 'var tolY = Math.max(1.2, 0.45 * pitch);', 'var tolY = Math.max(1.2, 1.2 * pitch);'],
];
let killed=0;
for (const [file,name,from,to] of M){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mut-')); for (const f of ['engine','cities','collect','ui']) fs.copyFileSync(path.join(__dirname,'..','src',f+'.js'),path.join(dir,f+'.js'));
  const p=path.join(dir,file+'.js'); const s=fs.readFileSync(p,'utf8'); if(!s.includes(from)) { console.log('MISSING',name); continue; } fs.writeFileSync(p,s.replace(from,to));
  let dead=false; for (const t of ['astro','diag','table']) { const r=spawnSync('node',[path.join(__dirname,t+'.test.js')],{env:Object.assign({},process.env,{HP_SRC:dir,TZ:'UTC'}),encoding:'utf8',timeout:600000}); if(r.status!==0||/fails: [1-9]|FAIL/.test(r.stdout)) { dead=true; console.log('tué / killed:',name,'par',t); break; } }
  if(!dead) console.log('SURVIVANT / survived:',name); else killed++;
}
console.log('mutations tuées',killed,'/',M.length);
