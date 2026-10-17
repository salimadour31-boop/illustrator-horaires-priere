// Vérification syntaxique ES3 stricte (mots réservés interdits même comme propriétés) puis ES5
// Strict ES3 syntax check (reserved words refused even as property names), then ES5
const acorn=require('acorn'), fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','HorairesPriere.jsx'),'utf8');
acorn.parse(src,{ecmaVersion:3,allowReserved:'never'}); acorn.parse(src,{ecmaVersion:5});
const bad=[/\.forEach\(/,/\.map\(/,/\.filter\(/,/\bJSON\./,/\.trim\(\)/,/=>/,/\blet\s/,/\bconst\s/,/`/,/Object\.keys/,/Array\.isArray/,/\.reduce\(/,/\.some\(/,/\.every\(/,/\[\]\.indexOf|\w+s\.indexOf\(/];
const hits=[]; src.split('\n').forEach((l,i)=>bad.forEach(b=>{ if(b.test(l)) hits.push((i+1)+': '+l.trim().slice(0,90)); }));
if (hits.length) { console.log('API ES5+ suspectes :\n'+hits.join('\n')); process.exitCode=1; } else console.log('acorn ES3 (allowReserved: never) + ES5 OK, aucune API ES5+ —', src.split('\n').length, 'lignes');
