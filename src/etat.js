// État global, enregistrement et petits utilitaires.
const M=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const AID={mariage:['Mariage',50000],dparent:['Décès d’un parent',50000],denfant:['Décès d’un enfant',75000],anniv:['Anniversaire',10000],naissance:['Naissance',25000]};
let S={r:[],cur:null},mo=new Date().getMonth(),tab='mois',sub='ent',nw=false,DB=null,U=null,ME=null,ADM=true,PF={},tmr,CFG={max:10000000,maxm:200},SUP=true,DEL=null,WHO=null,LG='fr',LGSET=false,MOI=null,GB=false,NT=null;
try{const l=localStorage.getItem('djcmlg');if(l){LG=l;LGSET=true}}catch(e){}
try{const o=JSON.parse(localStorage.getItem('djcm'));if(o)S=o}catch(e){}
const R=()=>S.r.find(r=>r.id==S.cur);
const RW=()=>{if(SB)return false;const r=R();return !DB||SUP||(!(r&&r.off)&&(ADM||!r||isW(r)))};
const save=()=>{if(SB)return;try{localStorage.setItem('djcm',JSON.stringify(S))}catch(e){}if(!DB||!RW())return;const r=R();if(!r)return;stamp(r);clearTimeout(tmr);tmr=setTimeout(()=>DB.collection('reunions').doc(r.id).set(r).then(()=>{if(ERR){ERR='';render()}}).catch(e=>{ERR='Enregistrement refusé ('+((e&&e.code)||'erreur')+') : vos changements ne sont pas partagés.';render()}),300)};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CUR={FCFA:'FCFA',XOF:'F CFA',EUR:'€',USD:'$',GBP:'£',CAD:'$ CA',CHF:'CHF',MAD:'DH',NGN:'₦'};const CN={FCFA:'Franc CFA (Afrique centrale)',XOF:'Franc CFA (Afrique de l’Ouest)',EUR:'Euro €',USD:'Dollar américain $',GBP:'Livre sterling £',CAD:'Dollar canadien',CHF:'Franc suisse',MAD:'Dirham marocain',NGN:'Naira ₦'};const cu=()=>(R()||{}).dv||'FCFA';const f=n=>(+n||0).toLocaleString('fr-FR')+' '+CUR[cu()];
const v=id=>document.getElementById(id).value.trim();
const tous=r=>r.mem.concat(r.anc||[]),fm=(r,id)=>r.mem.find(x=>x.id==id)||(r.anc||[]).find(x=>x.id==id);
const nm=(r,id)=>{const m=fm(r,id);return m?esc(m.n):'—'};
const sum=a=>a.reduce((s,x)=>s+x.a,0);
const opts=(r,sel)=>r.mem.map(m=>`<option value="${m.id}" ${m.id==sel?'selected':''}>${esc(m.n)}</option>`).join('');
let DET='',ERR='',LAST=null,GR=null;const nmT=(r,id)=>{const m=fm(r,id);return m?m.n:'—'};
