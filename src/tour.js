// Lot A, étape 3, en ligne : bureau du tour, ordre de passage (bénéficiaires du mois), cotisations,
// et retrait d'un membre avec l'accord du bureau. Le serveur vérifie tous les droits ; l'écran n'affiche
// les boutons qu'à ceux que le serveur acceptera.
const POSTES=[['president','Président'],['secretaire','Secrétaire'],['censeur','Censeur'],['tresorier','Trésorier']];
let ORDC=false,COT={cle:'',lignes:null,attente:false,msg:''},VANN=null,RETC=null,RETV={fiche:'',raison:''};

// Numéro du mois d'une date du serveur (AAAA-MM-JJ), compté depuis le début de la réunion.
const e3Idx=(r,s)=>idx(String(s).slice(0,7))-idx(r.d0);
const e3Fiche=(r,id)=>r.mem.find(m=>m.id==id)||(r.anc||[]).find(m=>m.id==id);
const e3Nom=(r,id)=>{const m=e3Fiche(r,id);if(!m)return 'Membre';return m.n+(r.mem.some(x=>x.id==id)?'':' (retiré)')};
// Le nom affiché, suivi du nom réel pour ceux qui le voient.
const e3NomComplet=m=>m.n+(m.nr&&m.nr!==m.n?` (${m.nr})`:'');
// Qui tient quel poste dans le tour en cours.
const e3Postes=r=>{const t=entTour(r),o={};if(!t)return o;for(const p of ((r.lotA||{}).postes||[]))if(p.tour_id==t.id)o[p.poste]=p.membre_id;return o};
const e3Ordre=r=>{const t=entTour(r);return t?((r.lotA||{}).ordre||[]).filter(x=>x.tour_id==t.id):[]};
const e3Benef=(r,m)=>e3Ordre(r).filter(x=>e3Idx(r,x.mois)==m).map(x=>x.membre_id);

// Après une action réussie : on recharge la réunion, en restant sur le même onglet et le même mois.
async function e3Recharger(){const id=R().id,t=tab,m=mo;await sbOuvrir(id);if(R()&&R().id==id&&!ERR){tab=t;mo=m;MOI=S.cur}COT.cle='';render()}
const e3Rpc=(fn,args)=>accAction(async()=>{const {error}=await SB.rpc(fn,args);if(error)throw error;await e3Recharger()});

// ---------------------------------------------------------------- Bureau (onglet Membres)
function bureauSbUI(r){const t=entTour(r);if(!t)return '';const p=e3Postes(r),edit=r.role=='createur'&&t.etat=='preparation'&&!r.off;
return `<h2>Bureau du tour ${t.numero}</h2><div class="c">${POSTES.map(([k,l])=>`<div class="r"><span>${l}</span>${edit
?`<select class="ac" id="poste-${k}" style="width:auto;max-width:62%" onchange="e3Designer('${k}',this.value)"><option value="">— libre —</option>${r.mem.map(m=>`<option value="${m.id}"${p[k]==m.id?' selected':''}>${esc(e3NomComplet(m))}</option>`).join('')}</select>`
:`<b>${p[k]?esc(e3Nom(r,p[k])):'<span class="mu">libre</span>'}</b>`}</div>`).join('')}<div class="mu" style="margin-top:6px">${edit
?'Une même personne peut tenir 2 postes tant que la réunion compte moins de 8 membres.'
:t.etat=='preparation'?'Le créateur désigne le bureau pendant la préparation du tour.':'Le tour a commencé : le bureau est verrouillé 🔒'}</div></div>`}
function e3Designer(p,fiche){return e3Rpc('designer_poste',{r:R().id,p,fiche:fiche||null})}

// ---------------------------------------------------------------- Ordre de passage (onglet Calendrier)
function ordreUI(r){const t=entTour(r);if(!t)return '<div class="c"><span class="mu">Aucun tour en cours.</span></div>';
const o=e3Ordre(r),moi=entMoi(r),d=Math.max(0,e3Idx(r,t.debut)),edit=txPrepare(r)&&!r.off;
const fin=Math.max(periodN(r)-1,...o.map(x=>e3Idx(r,x.mois))),mois=Array.from({length:Math.max(0,fin-d+1)},(_,k)=>d+k);
const mien=moi&&o.find(x=>x.membre_id==moi.id),places=new Set(o.map(x=>x.membre_id)),reste=r.mem.filter(m=>!sab(r,m.id)&&!places.has(m.id));
let h=`<h2>Ordre de passage — tour ${t.numero}</h2>`;
if(moi)h+=`<div class="c" style="border-left-color:var(--ac)">${mien?`⭐ Votre mois : <b>${mlab(e3Idx(r,mien.mois),'fr')}</b>`:'<span class="mu">Vous n’avez pas encore de mois.</span>'}</div>`;
h+=`<div class="c">${mois.map(j=>{const b=e3Benef(r,j);return `<div class="r"><span>${mlab(j,'fr')}</span><b>${b.length?b.map(id=>(moi&&id==moi.id?'⭐ ':'')+esc(e3Nom(r,id))).join(' + '):'<span class="mu">—</span>'}</b></div>`}).join('')}</div>`;
if(reste.length&&!edit)h+=`<div class="mu">Pas encore placé${reste.length>1?'s':''} : ${reste.map(m=>esc(m.n)).join(', ')}</div>`;
if(edit){h+=`<h2>Préparer l’ordre</h2><div class="c"><div class="mu">Choisissez un mois pour chaque membre. Plusieurs membres peuvent recevoir le même mois.</div>${r.mem.filter(m=>!sab(r,m.id)).map(m=>{const x=o.find(y=>y.membre_id==m.id),cur=x?e3Idx(r,x.mois):-1;
return `<div class="r"><span>${esc(m.n)}</span><select class="ac" id="ord-${m.id}" style="width:auto" onchange="e3Placer('${m.id}',this.value)"><option value="">—</option>${mois.map(j=>`<option value="${j}"${j==cur?' selected':''}>${mlab(j,'fr')}</option>`).join('')}</select></div>`}).join('')||'<span class="mu">Ajoutez d’abord des membres.</span>'}
<button class="ac${ORDC?'':' g'}" style="margin-top:8px" onclick="e3Tirer()">${ORDC?'Confirmer : remplacer l’ordre par un tirage au sort':'🎲 Tirer au sort'}</button>${ORDC?'<div class="mu">Le tirage remplace tout l’ordre actuel : un membre par mois, à partir du début du tour.</div>':''}</div>`}
else h+=`<div class="mu">${t.etat=='preparation'?'L’ordre est préparé par le créateur ou le bureau.':'Le tour a commencé : l’ordre est figé 🔒'}</div>`;
return h}
function e3Placer(fiche,j){const r=R();return e3Rpc('placer_ordre',{r:r.id,fiche,m:j===''?null:txMois(r,+j)})}
function e3Tirer(){if(!ORDC){ORDC=true;render();return}ORDC=false;return e3Rpc('tirer_ordre',{r:R().id})}

// ---------------------------------------------------------------- Cotisations (onglet Mois)
const cotCle=(r,m)=>r.id+'|'+m;
async function cotCharger(r,m){const cle=cotCle(r,m);COT={cle,lignes:null,attente:true,msg:''};
const {data,error}=await SB.rpc('cotisations_du_mois',{r:r.id,m:txMois(r,m)});if(COT.cle!==cle)return;
COT.attente=false;if(error)COT.msg='Chargement impossible : '+error.message;else COT.lignes=data||[];render()}
const cotVersements=(r,m,id)=>{const t=entTour(r),d=txMois(r,m);return ((r.lotA||{}).versements||[]).filter(x=>x.tour_id==(t&&t.id)&&String(x.mois).slice(0,10)==d&&x.membre_id==id&&x.nature=='cotisation'&&!x.annule_le)};
function moisSbUI(r){const t=entTour(r);if(!t)return '<div class="c"><span class="mu">Aucun tour en cours.</span></div>';
const b=e3Benef(r,mo);
let h=`<div class="c"><b>Bénéficiaire${b.length>1?'s':''} du mois</b><div style="margin-top:4px">${b.length?b.map(id=>esc(e3Nom(r,id))).join(' + '):'<span class="mu">Personne n’est encore prévu ce mois-ci (onglet Calendrier).</span>'}</div></div>`;
if(mo<e3Idx(r,t.debut))return h+'<div class="c"><span class="mu">Ce mois est avant le début du tour.</span></div>';
const cle=cotCle(r,mo);if(COT.cle!==cle)cotCharger(r,mo);
if(COT.msg)return h+`<div class="c" style="border-left-color:var(--rd)">⚠️ ${esc(COT.msg)}</div>`;
if(!COT.lignes)return h+'<div class="c"><span class="mu">Chargement des cotisations…</span></div>';
const bur=txBureau(r)&&!r.off,L=COT.lignes,du=L.reduce((s,x)=>s+(x.sabbatique?0:+x.du),0),vs=L.reduce((s,x)=>s+(+x.verse),0);
h+=`<div class="c"><div class="mu">${ML()[mo]} : cotisations collectées</div><div class="big">${f(vs)}</div><div class="mu">sur ${f(du)} attendus</div></div><h2>Cotisations</h2><div class="c">`;
h+=L.map(x=>{const m=e3Fiche(r,x.membre_id);if(!m)return '';const verse=+x.verse,manque=+x.manque;
const etat=x.sabbatique?'<span class="mu">🌴 Année sabbatique : ne cotise pas</span>'
:x.paye?`<span class="ok">À jour ✓ ${f(verse)}</span>`
:verse>0?`<span style="color:var(--ac);font-weight:600">Versé ${f(verse)} · manque ${f(manque)}</span>`
:`<span class="mu">Pas encore cotisé · dû ${f(+x.du)}</span>`;
let l=`<div style="padding:8px 0;border-bottom:1px solid var(--bd)"><div class="r"><span><b>${esc(m.n)}</b></span>${etat}</div>`;
if(bur&&!x.sabbatique){if(!x.paye)l+=`<div class="r"><input class="ac" id="cotm-${m.id}" type="number" inputmode="decimal" min="0" step="any" style="width:auto;flex:1" value="${manque>0?manque:+x.du}" aria-label="Montant versé par ${esc(m.n)}"><button class="ac" style="width:auto" onclick="cotVerser('${m.id}')">Cotisé</button></div>`;
for(const vv of cotVersements(r,mo,m.id))l+=VANN==vv.id
?`<div class="c" style="margin:4px 0"><div class="mu">Annuler le versement de ${f(+vv.montant_verse)} : écrivez la raison.</div><input class="ac" id="cotr-${vv.id}" placeholder="Raison (obligatoire)"><button class="ac x" onclick="cotAnnulerOk('${vv.id}')">Confirmer l’annulation</button> <button class="ac g" onclick="VANN=null;render()">Garder</button></div>`
:`<div class="r"><span class="mu">Versement de ${f(+vv.montant_verse)}</span><button class="ac x" onclick="VANN='${vv.id}';render()">Annuler</button></div>`}
return l+'</div>'}).join('')||'<span class="mu">Aucun membre.</span>';
h+='</div>';
if(!bur)h+='<div class="mu">Seuls les membres du bureau enregistrent les cotisations.</div>';
return h}
function cotVerser(id){const r=R(),montant=+v('cotm-'+id);if(!(montant>0)){ERR='Écrivez le montant versé.';render();return}
return e3Rpc('enregistrer_versement',{r:r.id,fiche:id,m:txMois(r,mo),montant})}
function cotAnnulerOk(vid){const raison=v('cotr-'+vid);if(raison.length<3){ERR='Écrivez la raison de l’annulation.';render();return}VANN=null;return e3Rpc('annuler_versement',{r:R().id,versement:vid,raison})}

// ---------------------------------------------------------------- Retrait d'un membre (onglet Membres)
const e3Votants=(r,cible)=>[...new Set(Object.values(e3Postes(r)).filter(id=>id&&id!=cible&&r.mem.some(m=>m.id==id)))];
const e3Expiree=d=>Date.parse(d.limite_le)<=Date.now();
function e3Reste(d){const s=Math.max(0,Date.parse(d.limite_le)-Date.now())/3600000;return s>=48?`reste ${Math.floor(s/24)} jours`:`reste ${Math.ceil(s)} h`}
// Une fiche jamais utilisée : aucun compte, aucun lien envoyé, aucun versement, hors bureau et hors ordre.
function e3Inutilisee(r,m){const a=(r.acces||{})[m.id];const L=r.lotA||{};return !m.u&&(!a||a.invitation=='aucune')
&&!(L.versements||[]).some(x=>x.membre_id==m.id)&&!(L.postes||[]).some(x=>x.membre_id==m.id)&&!(L.ordre||[]).some(x=>x.membre_id==m.id)
&&!(L.retraits||[]).some(x=>x.membre_id==m.id||x.demande_par==m.id)}
function retraitUI(r){const t=entTour(r);if(!t)return '';const bur=txBureau(r),crea=r.role=='createur';if(!bur&&!crea)return '';
const L=r.lotA||{},dem=L.retraits||[],rep=L.reponses||[],moi=entMoi(r),p=e3Postes(r);
const complet=POSTES.every(([k])=>p[k]&&r.mem.some(m=>m.id==p[k]));
const ouvertes=dem.filter(d=>d.etat=='en_attente'),fermees=dem.filter(d=>d.etat!='en_attente').slice(-3).reverse();
let h=`<h2>Retirer un membre</h2><div class="c"><div class="mu">Il faut l’accord de toutes les personnes du bureau : une voix par personne, sans le membre concerné. Au premier refus, ou sans tous les accords en 7 jours, la demande est refusée.</div>`;
for(const d of ouvertes){const vot=e3Votants(r,d.membre_id),ok=rep.filter(x=>x.demande_id==d.id&&x.accord).map(x=>x.membre_id),deja=moi&&rep.some(x=>x.demande_id==d.id&&x.membre_id==moi.id),exp=e3Expiree(d);
h+=`<div class="c" style="border-left-color:var(--ac);margin-top:8px"><b>Retrait de ${esc(e3Nom(r,d.membre_id))}</b><div class="mu">Demandé par ${esc(e3Nom(r,d.demande_par))} : ${esc(d.raison)}</div>
<div class="mu">Accords : ${vot.filter(id=>ok.includes(id)).length} sur ${vot.length}${vot.length?' ('+vot.map(id=>esc(e3Nom(r,id))+(ok.includes(id)?' ✓':' …')).join(', ')+')':''} · ${exp?'délai dépassé : la demande est refusée':e3Reste(d)}</div>
${!exp&&moi&&vot.includes(moi.id)&&!deja&&!r.off?`<div class="seg" style="margin-top:6px"><button class="ac" onclick="e3Repondre('${d.id}',true)">D’accord</button><button class="ac x" onclick="e3Repondre('${d.id}',false)">Refuser</button></div>`:''}${deja?'<div class="mu">Vous avez répondu.</div>':''}</div>`}
for(const d of fermees)h+=`<div class="mu" style="margin-top:6px">${d.etat=='acceptee'?'✓ Retrait accordé':'✕ Retrait refusé'} : ${esc(e3Nom(r,d.membre_id))} (${esc(d.raison)})</div>`;
if(bur&&!r.off){if(!complet)h+='<div class="mu" style="margin-top:8px">Les 4 postes du bureau doivent être attribués pour demander un retrait.</div>';
else{const cibles=r.mem.filter(m=>(!moi||m.id!=moi.id)&&!ouvertes.some(d=>d.membre_id==m.id));
if(cibles.length)h+=`<div style="margin-top:8px"><select class="ac" id="ret-fiche" onchange="RETV.fiche=this.value"><option value="">Choisir le membre</option>${cibles.map(m=>`<option value="${m.id}"${RETV.fiche==m.id?' selected':''}>${esc(m.n)}</option>`).join('')}</select><input class="ac" id="ret-raison" placeholder="Raison (obligatoire)" maxlength="500" value="${esc(RETV.raison)}" oninput="RETV.raison=this.value"><button class="ac${RETC=='dem'?' x':''}" onclick="e3Demander()">${RETC=='dem'?'Confirmer la demande de retrait':'Demander le retrait'}</button></div>`}}
if(crea&&t.etat=='preparation'&&!r.off){const libres=r.mem.filter(m=>e3Inutilisee(r,m));
if(libres.length)h+=`<div class="mu" style="margin-top:10px">Fiches jamais utilisées : le créateur peut les supprimer pendant la préparation, sans accord (par exemple après une faute de frappe).</div>${libres.map(m=>`<div class="r"><span>${esc(e3NomComplet(m))}</span><button class="ac x" onclick="e3Supprimer('${m.id}')">${RETC=='del-'+m.id?'Confirmer la suppression':'Supprimer la fiche'}</button></div>`).join('')}`}
return h+'</div>'}
function e3Demander(){const fiche=RETV.fiche,raison=(RETV.raison||'').trim();if(!fiche){ERR='Choisissez le membre.';render();return}if(raison.length<3){ERR='Écrivez la raison du retrait.';render();return}
if(RETC!='dem'){RETC='dem';ERR='';render();return}RETC=null;RETV={fiche:'',raison:''};return e3Rpc('demander_retrait',{r:R().id,fiche,raison})}
function e3Repondre(d,accord){return e3Rpc('repondre_retrait',{r:R().id,demande:d,accord})}
function e3Supprimer(id){if(RETC!='del-'+id){RETC='del-'+id;render();return}RETC=null;return e3Rpc('supprimer_fiche_inutilisee',{r:R().id,fiche:id})}
