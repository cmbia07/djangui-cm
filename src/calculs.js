// Règles de calcul : cotisations, partage, solde, amendes, prêts, périodes, droits.
const tierOf=(r,m)=>m&&m.tr?(r.tiers||[]).find(t=>t.id==m.tr):null;
// Montant d'un membre pour un mois : m.h liste les changements {m: mois de départ, a: montant}, triés par mois.
// Avant le premier changement, c'est le montant de base (libre, palier ou montant de la réunion).
const mbase=(r,m)=>(m&&+m.c>0)?+m.c:(tierOf(r,m)?+tierOf(r,m).a||0:(+r.mt||0));
const mamt=(r,m,mois)=>{const h=m&&m.h;if(h&&h.length){const q=mois==null?curMo(r):+mois;let a=null;for(const e of h)if(e.m<=q)a=e.a;if(a!=null)return a}return mbase(r,m)};
// Montant d'un mois : celui figé au paiement s'il existe, sinon celui prévu pour ce mois.
const montantMois=(r,x,m)=>{const k=m+'-'+x.id,g=(r.cota||{})[k];return r.cot[k]&&g!=null?g:mamt(r,x,m)};
// Sans mois : le total attendu aujourd'hui. Avec un mois : le total attendu de ce mois.
const tot=(r,m)=>{if(m==null)return act(r).reduce((s,x)=>s+mamt(r,x),0);const g=r.cota||{},pre=m+'-';let s=0;for(const x of r.mem){const k=pre+x.id;if(r.cot[k]&&g[k]!=null)s+=g[k];else if(!sab(r,x.id))s+=mamt(r,x,m)}for(const x of r.anc||[]){const k=pre+x.id;if(r.cot[k])s+=g[k]||0}return s};
// Le montant est figé au paiement (r.cota) : changer un montant ne modifie pas les mois passés.
const col=(r,m)=>{const g=r.cota||{},pre=m+'-';let s=0;for(const x of r.mem){const k=pre+x.id;if(r.cot[k])s+=g[k]!=null?g[k]:(sab(r,x.id)?0:mamt(r,x,m))}for(const x of r.anc||[]){const k=pre+x.id;if(r.cot[k])s+=g[k]||0}return s};
function figer(r){r.cota=r.cota||{};r.cotra=r.cotra||{};for(const k in r.cot){if(!r.cot[k]||r.cota[k]!=null)continue;const m=r.mem.find(x=>x.id==k.slice(k.indexOf('-')+1));if(m&&!sab(r,m.id))r.cota[k]=mamt(r,m,moisCle(k))}for(const k in r.cotr||{})if(r.cotr[k]&&r.cotra[k]==null)r.cotra[k]=r.rp||0}
const fiP=(r,m)=>r.fi.filter(x=>x.p&&(m==null||x.m==m));
// Mois restants après le mois du dépôt : janvier sur une période janvier-décembre compte 11 mois.
const bkOn=r=>!!(r.bk&&r.bk.on),bdInt=(r,x)=>Math.round(x.a*(+x.t||0)/100*Math.max(0,periodN(r)-x.m-1)*100)/100;
const bdHeld=r=>(r.bd||[]).filter(x=>!x.ret).reduce((s,x)=>s+x.a,0),bdPaid=r=>(r.bd||[]).filter(x=>x.ret).reduce((s,x)=>s+bdInt(r,x),0);
const solde=r=>sum(r.en)+sum(fiP(r))-sum(r.am)+loanRep(r)-loanOut(r)+bdHeld(r)-bdPaid(r);
const colr=(r,m)=>{const p=r.cotr||{},g=r.cotra||{};return tous(r).reduce((s,x)=>{const k=m+'-'+x.id;return p[k]?s+(g[k]!=null?g[k]:(r.rp||0)):s},0)};
const bl=(r,m)=>{const b=r.be[m];return Array.isArray(b)?b:(b?[b]:[])};
const shareOf=(r,m,id)=>{const b=bl(r,m),c=col(r,m),md=(r.bm||{})[m];if(!b.length)return 0;if(md=='c')return c;if(md=='w'){const w=b.reduce((s,i)=>s+montantMois(r,fm(r,i),m),0),me=montantMois(r,fm(r,id),m);return w>0?c*me/w:c/b.length}return c/b.length};
const share1=(r,m)=>{const n=bl(r,m).length,c=col(r,m);return !n?0:((r.bm||{})[m]=='c'?c:c/n)};
const planned=r=>{const o=new Set();for(let i=0;i<periodN(r);i++)bl(r,i).forEach(x=>o.add(x));return o};
const unplanned=r=>{const p=planned(r);return act(r).filter(x=>!p.has(x.id))};
function fineOf(r,m,id){const st=att(r,m,id),c=r.fr||{};if(st=='a')return Math.max(0,+c.abs||0);if(st=='r'){const x=(r.lt||{})[m+'-'+id]||{},h=Math.max(1,+x.h||1);if(x.ag&&x.ex)return 0;return x.ag?h*Math.max(0,+c.lh||0):Math.max(0,+c.lb||0)}return 0}
function syncFine0(r,m,id){const k=m+'-'+id;if((r.wv||{})[k])return;const a=fineOf(r,m,id),e=r.fi.find(x=>x.auto===k),st=att(r,m,id),x=(r.lt||{})[k]||{};const lab=st=='a'?'Absence':('Retard '+Math.max(1,+x.h||1)+' h'+(x.ag?'':' (argent et membre)'));if(a>0){if(e){e.a=a;e.l=lab}else r.fi.push({id:uid(),mid:id,l:lab,a,m,p:false,auto:k})}else if(e&&!e.p)r.fi=r.fi.filter(y=>y!==e)}
const unj=(r,m,id)=>att(r,m,id)=='a'&&!((r.lt||{})[m+'-'+id]||{}).ex;
function csCount(r,m,id){let n=0;for(let j=m;j>=0&&unj(r,j,id);j--)n++;return n}
function csFine(r,m,id){const c=r.fr||{};return c.co&&unj(r,m,id)&&csCount(r,m,id)>=(+c.cn||2)?Math.max(0,+c.ca||0):0}
const fineAll=(r,m,id)=>fineOf(r,m,id)+csFine(r,m,id);
function syncCs(r,m,id){const key=m+'-'+id+'c';if((r.wv||{})[key])return;const a=csFine(r,m,id),e=r.fi.find(x=>x.auto===key);if(a>0){const lab='Absences consécutives non justifiées ('+csCount(r,m,id)+')';if(e){e.a=a;e.l=lab}else r.fi.push({id:uid(),mid:id,l:lab,a,m,p:false,auto:key})}else if(e&&!e.p)r.fi=r.fi.filter(y=>y!==e)}
function syncFine(r,m,id){syncFine0(r,m,id);syncCs(r,m,id);for(let j=m+1;j<periodN(r);j++){if(att(r,j,id)=='a')syncCs(r,j,id);else break}}
const defD0=()=>new Date().getFullYear()+'-01',defD1=()=>new Date().getFullYear()+'-12';
const pm=s=>{const p=String(s||'').split('-');return {y:+p[0]||new Date().getFullYear(),m:Math.max(0,Math.min(11,(+p[1]||1)-1))}};
const ym=(y,m)=>y+'-'+String(m+1).padStart(2,'0');
const addMo=(s,k)=>{const a=pm(s),t=a.y*12+a.m+k;return ym(Math.floor(t/12),((t%12)+12)%12)};
const idx=s=>{const a=pm(s);return a.y*12+a.m};
const periodN=r=>{r=r||R()||{};return Math.max(1,Math.min(360,idx(r.d1||defD1())-idx(r.d0||defD0())+1))};
const mlab=(i,l,r)=>{r=r||R()||{};const a=pm(r.d0||defD0()),t=a.m+i;return (l=='en'?MEN:M)[t%12]+' '+(a.y+Math.floor(t/12))};
const ML=()=>Array.from({length:periodN()},(_,i)=>mlab(i,LG));
const curMo=r=>{if(!r)return 0;const n=new Date(),i=n.getFullYear()*12+n.getMonth()-idx(r.d0||defD0());return Math.max(0,Math.min(periodN(r)-1,i))};
const sab=(r,id)=>!!(r.sab||{})[id],act=r=>r.mem.filter(x=>!sab(r,x.id));
const aidOn=(r,k)=>!((r.ai||{})[k]&&r.ai[k].on===false);
const aidAmt=(r,k)=>{const c=(r.ai||{})[k];return c&&c.a!=null?c.a:(/^(FCFA|XOF)$/.test(r.dv||'FCFA')?AID[k][1]:'')};
const lnOn=r=>!!(r.ln&&r.ln.on),lnM=r=>Math.max(1,Math.floor(+((r.ln||{}).mois))||3),lnT=r=>Math.max(0,+((r.ln||{}).taux)||0);
const lockedF=r=>r.lk===true||!!(r.sd&&r.sd[0]&&new Date().toISOString().slice(0,10)>=r.sd[0]);
// La dernière mensualité reprend l'arrondi : le total remboursé égale toujours le total dû.
const lnDue=x=>Math.round(x.a*(1+(+x.t||0)/100)*100)/100,lnMonthly=(r,x)=>Math.floor(lnDue(x)/x.n),lnInst=(r,x,k)=>k<x.n-1?lnMonthly(r,x):Math.round((lnDue(x)-lnMonthly(r,x)*(x.n-1))*100)/100;
const loanRep=(r,m)=>(r.lo||[]).reduce((t,x)=>t+(x.ps||[]).reduce((s,k,i)=>m==null||k==m?s+lnInst(r,x,i):s,0),0);
const loanOut=(r,m)=>sum((r.lo||[]).filter(x=>m==null||x.m==m));
const att=(r,m,id)=>(r.at||{})[m+'-'+id],attN=(r,m,s)=>r.mem.filter(x=>att(r,m,x.id)==s).length;
const BR={pres:'Président',cens:'Censeur',sec:'Secrétaire',tres:'Trésorier'};
const roleOf=(r,id)=>Object.entries(BR).filter(([k])=>(r.bu||{})[k]==id).map(([,n])=>n).join(', ');
const bUsers=r=>r.bw?Object.values(r.bu||{}).map(id=>(r.mem.find(x=>x.id==id)||{}).u).filter(Boolean):[];
const isW=r=>(r.w||[]).includes(ME)||bUsers(r).includes(ME)||!!(r.ou&&r.ou==ME);
const canPres=r=>!DB||ADM||!!(ME&&((r.mem.find(x=>x.id==(r.bu||{}).pres)||{}).u===ME));
