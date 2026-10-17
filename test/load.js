const fs=require('fs'), vm=require('vm');
module.exports=function(){ const ctx={console}; vm.createContext(ctx); const src=['engine','cities','collect'].map(f=>fs.readFileSync((process.env.HP_SRC||(__dirname+'/../src'))+'/'+f+'.js','utf8')).join('\n'); vm.runInContext(src+'\nthis.HP=HP;',ctx); return ctx.HP; };
