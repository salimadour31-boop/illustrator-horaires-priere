// DOM Illustrator et ScriptUI simulés / simulated Illustrator DOM and ScriptUI
const fs=require('fs'), vm=require('vm'), os=require('os'), path=require('path');
function makeTF(contents,{bounds,point=true,size=10,leading=14,rtl=null,locked=false}){
  const tf={typename:'TextFrame',_c:contents,locked,layer:{locked:false},kind:point?'POINT':'AREA',geometricBounds:bounds,anchor:[bounds[0],bounds[1]-size*0.8],_attrsLog:[]};
  Object.defineProperty(tf,'contents',{get(){return tf._c;},set(v){tf._c=String(v);}});
  // attributs par caractère (pour vérifier que la mise en forme suit) / per-char attributes
  tf._fmt=Array.from(contents).map((_,i)=>({size,leading,autoLeading:false,font:'F'+(i%3)}));
  tf.characters=new Proxy({},{get(_,p){ if(p==='length') return tf._c.length; const i=+p; if(isNaN(i)) return undefined; if(i<0||i>=tf._c.length) throw new Error('index out of range '+i);
      return {get contents(){return tf._c.charAt(i);}, set contents(v){ v=String(v); const f=tf._fmt[i]; tf._c=tf._c.slice(0,i)+v+tf._c.slice(i+1); tf._fmt.splice(i,1,...Array.from(v).map(()=>Object.assign({},f))); },
        remove(){ tf._c=tf._c.slice(0,i)+tf._c.slice(i+1); tf._fmt.splice(i,1); }, characterAttributes:tf._fmt[i]}; }});
  tf.paragraphs=new Proxy({},{get(_,p){ return {paragraphAttributes:{paragraphDirection: rtl===null?undefined:(rtl?'ParagraphDirectionType.RIGHT_TO_LEFT_DIRECTION':'ParagraphDirectionType.LEFT_TO_RIGHT_DIRECTION')}}; }});
  return tf;
}
function makeDoc(items){
  const layers=[]; const doc={documentColorSpace:'RGB',selection:items,layers};
  layers.add=function(){ const L={name:'',locked:false,visible:true,printable:true,items:[]};
    L.pageItems=new Proxy(L.items,{get(t,p){ if(p==='length') return t.length; const i=+p; if(!isNaN(i)) return t[i]; return t[p]; }});
    L.pathItems={rectangle(top,left,w,h){ const r={kind:'rect',top,left,w,h,remove(){L.items.splice(L.items.indexOf(r),1);}}; L.items.push(r); return r; }};
    L.textFrames={add(){ const t={kind:'text',contents:'',position:[0,0],textRange:{characterAttributes:{}},remove(){L.items.splice(L.items.indexOf(t),1);}}; L.items.push(t); return t; }};
    L.zOrder=function(){}; layers.push(L); return L; };
  return doc;
}
// ScriptUI : chaque fenêtre appelle driver(window) pendant show()
function scriptUI(driver){
  function Ctl(type,text,props){ this.type=type; this.text=text===undefined?'':text; this.props=props||{}; this.children=[]; this.items=[]; this.value=false; this.selection=null;
    if(type==='dropdownlist'&&Array.isArray(text)){ this.items=text.map((t,i)=>({text:t,index:i})); this.text=''; const self=this; let sel=null;
      Object.defineProperty(this,'selection',{get(){return sel;},set(v){ sel=(typeof v==='number')?self.items[v]:v; }}); } }
  Ctl.prototype.add=function(type,bounds,text,props){ const c=new Ctl(type,text,props); c.parent=this; c.root=this.root||this; (c.root.all=c.root.all||[]).push(c); this.children.push(c);
    if(type==='listbox'){ c.rows=[]; c.add=function(kind,t){ const it={text:t,subItems:[{},{},{},{},{}]}; c.rows.push(it); return it; }; }
    return c; };
  function Window(type,title){ Ctl.call(this,'window',title); this.root=this; this.all=[]; this._closed=null; }
  Window.prototype=Object.create(Ctl.prototype);
  Window.prototype.close=function(v){ this._closed=(v===undefined?2:v); };
  Window.prototype.show=function(){ this._closed=null; driver(this); return this._closed===null?2:this._closed; };
  return Window;
}
function run(jsxPath, {doc, driver, userData, alerts=[], confirms=true, saveTo=null, locale='fr_FR'}){
  const ctx={ console, alert:(m)=>alerts.push(String(m)), confirm:()=>confirms,
    app:{documents:{length:doc?1:0}, activeDocument:doc},
    TextType:{POINTTEXT:'POINT',AREATEXT:'AREA'}, DocumentColorSpace:{CMYK:'CMYK',RGB:'RGB'}, ZOrderMethod:{BRINGTOFRONT:1},
    RGBColor:function(){}, CMYKColor:function(){}, $:{locale},
    Window:scriptUI(driver),
    Folder:{userData},
    File:function(p){ this.fsName=p; this.name=path.basename(p); this._buf=''; },
  };
  ctx.File.prototype={ get exists(){ return fs.existsSync(this.fsName); }, open(m){ this._m=m; if(m==='r'){ this._lines=fs.readFileSync(this.fsName,'utf8').split('\n'); this._li=0; } else this._buf=''; return true; },
    get eof(){ return this._li>=this._lines.length || (this._li===this._lines.length-1 && this._lines[this._li]===''); }, readln(){ return this._lines[this._li++]; },
    writeln(s){ this._buf+=s+'\n'; }, write(s){ this._buf+=s; }, close(){ if(this._m==='w') fs.writeFileSync(this.fsName,this._buf); } };
  ctx.File.saveDialog=()=> saveTo? new ctx.File(saveTo): null;
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(jsxPath,'utf8'),ctx); return ctx;
}
// Pilotes / drivers
function find(w,pred){ return w.all.find(pred); }
module.exports={makeTF,makeDoc,run,find};
