// Connexion à Supabase : code par e-mail, liste des réunions du compte, chargement de la seule réunion choisie.
// La clé ci-dessous est publique par conception : ce sont les règles du serveur (RLS) qui protègent les données.
const SB_URL='https://ocajfzcxkctabizhrwce.supabase.co',SB_CLE='sb_publishable_Mz7_Qn7GAwY5cdGXXrLjSQ_t3BM5IrE';
let SB=null,SESS=null,CONX={etape:'email',email:'',msg:'',attente:false},SBREP=null,SBKO=false,SBJ=null,SBT=null;
// La bibliothèque efface la session sur toute erreur qu'elle ne juge pas passagère, y compris une surcharge du serveur.
// Pour le renouvellement de session, une surcharge ou une panne sont présentées comme passagères : la session est gardée.
const sbFetch=async(u,o)=>{const r=await fetch(u,o);if((r.status==429||r.status>=500)&&/\/auth\/v1\/token\?grant_type=refresh_token/.test(String((u&&u.url)||u)))return new Response(null,{status:503});return r};
const ROLE_L={createur:'Créateur',president:'Président',bureau:'Bureau',redacteur:'Rédacteur',lecteur:'Lecteur'};
// ?local=1 garde l'ancien mode sans serveur, seulement pour une page ouverte depuis le disque (tests).
// En ligne, ce mode n'existe pas : personne ne doit saisir de données qui resteraient dans son téléphone.
const sbActif=()=>{try{return typeof window!='undefined'&&!(location.protocol=='file:'&&/[?&]local=1/.test(location.search))}catch(e){return false}};

// Tables chargées à l'ouverture d'une réunion, avec un ordre stable pour lire page par page.
const SB_TABLES=[['appartenances','utilisateur_id'],['paliers','id'],['membres','cree_le,id'],['membres_contacts','membre_id'],['montants_membre','membre_id,mois'],['aides_types','type'],['beneficiaires','mois,membre_id'],['partages_mois','mois'],['seances','mois'],['cotisations','mois,membre_id,type'],['presences','mois,membre_id'],['amendes','mois,id'],['amendes_levees','cle_auto'],['comptes_rendus','mois'],['caisse_entrees','mois,id'],['aides','mois,id'],['prets','mois,id'],['remboursements','mois,id'],['depots_banque','mois,id'],['votes_ouverts','mois,beneficiaire_id,votant_id'],['votes_anonymes_totaux','mois,beneficiaire_id']];

// Convertit les lignes du serveur vers la forme utilisée par l'application (mois numérotés depuis le début de la période).
function versPrototype(re,d){
const moisVal=s=>(+String(s).slice(0,4))*12+(+String(s).slice(5,7))-1,base=moisVal(re.debut),mi=s=>moisVal(s)-base,t=k=>d[k]||[],ym7=s=>String(s).slice(0,7),hm=s=>s?String(s).slice(0,5):'';
const r={id:re.id,n:re.nom,dv:re.monnaie,mt:+re.cotisation||0,rp:+re.cotisation_repas||0,d0:ym7(re.debut),d1:ym7(re.fin),cc:re.indicatif,cf:re.texte_confidentialite||'',bw:!!re.bureau_ecriture,off:!!re.suspendue,lk:!!re.options_verrouillees,ou:re.createur_id,
fr:{abs:+re.amende_absence||0,lb:+re.amende_retard_fixe||0,lh:+re.amende_retard_heure||0,co:!!re.amendes_consecutives,cn:+re.consecutives_seuil||2,ca:+re.amende_consecutive||0},
ln:{on:!!re.prets_actifs,mois:+re.pret_duree_mois||3,taux:+re.pret_taux||0},bk:{on:!!re.banque_active,t:+re.banque_taux||0},vl:{on:!!re.avis_actif,anon:!!re.avis_anonyme},
tiers:[],mem:[],anc:[],sab:{},cot:{},cota:{},cotr:{},cotra:{},be:{},bm:{},sd:{},sh:{},at:{},lt:{},wv:{},fi:[],en:[],am:[],lo:[],bd:[],no:{},cr:{},ai:{},w:[],bu:{},lg:[],vat:{},pa:!!re.pin_actif};
if(re.telephones_bureau_seulement===false)r.hp=false;
r.tiers=t('paliers').map(x=>({id:x.id,n:x.nom,a:+x.montant}));
const tel={},hist={};for(const x of t('membres_contacts'))tel[x.membre_id]=x.telephone;
for(const x of t('montants_membre'))(hist[x.membre_id]=hist[x.membre_id]||[]).push({m:mi(x.mois),a:+x.montant});
for(const k in hist)hist[k].sort((a,b)=>a.m-b.m);
for(const x of t('membres')){const h=hist[x.id]||[];if(x.retire_le){r.anc.push({id:x.id,n:x.nom,c:+x.montant||0,h});continue}const m={id:x.id,n:x.nom,c:+x.montant||0,tr:x.palier_id||'',h};if(tel[x.id])m.t=tel[x.id];if(x.utilisateur_id)m.u=x.utilisateur_id;r.mem.push(m);if(x.sabbatique)r.sab[x.id]=true}
for(const a of t('appartenances')){if(a.role=='redacteur')r.w.push(a.utilisateur_id);if(a.role=='president'){const f=r.mem.find(m=>m.u==a.utilisateur_id);if(f)r.bu.pres=f.id}}
const pr={egal:'p',prorata:'w',total:'c'},st={present:'p',retard:'r',absent:'a'};
for(const x of t('aides_types'))r.ai[x.type]={on:!!x.actif,a:+x.montant};
for(const x of t('beneficiaires')){const m=mi(x.mois);(r.be[m]=r.be[m]||[]).push(x.membre_id)}
for(const x of t('partages_mois'))r.bm[mi(x.mois)]=pr[x.mode];
for(const x of t('seances')){const m=mi(x.mois);r.sd[m]=String(x.date_seance).slice(0,10);if(x.heure)r.sh[m]=hm(x.heure)}
for(const x of t('cotisations')){const k=mi(x.mois)+'-'+x.membre_id;if(x.type=='repas'){r.cotr[k]=true;r.cotra[k]=+x.montant}else{r.cot[k]=true;r.cota[k]=+x.montant}}
for(const x of t('presences')){const k=mi(x.mois)+'-'+x.membre_id;r.at[k]=st[x.statut];if(x.statut!='present')r.lt[k]={h:+x.heures_retard||1,ag:!!x.agent_envoye,ex:!!x.excuse,t:hm(x.heure_arrivee)}}
r.fi=t('amendes').map(x=>{const o={id:x.id,mid:x.membre_id,l:x.motif,a:+x.montant,m:mi(x.mois),p:!!x.payee};if(x.cle_auto)o.auto=x.cle_auto;return o});
for(const x of t('amendes_levees'))r.wv[x.cle_auto]=true;
for(const x of t('comptes_rendus')){const m=mi(x.mois);if(x.deroule)r.no[m]=x.deroule;if(x.decisions||x.a_suivre)r.cr[m]={d:x.decisions||'',n:x.a_suivre||''}}
r.en=t('caisse_entrees').map(x=>({id:x.id,l:x.motif,a:+x.montant,m:mi(x.mois)}));
r.am=t('aides').map(x=>({id:x.id,mid:x.membre_id,t:x.type,a:+x.montant,m:mi(x.mois)}));
const rb={};for(const x of t('remboursements'))(rb[x.pret_id]=rb[x.pret_id]||[]).push(mi(x.mois));
r.lo=t('prets').map(x=>({id:x.id,mid:x.membre_id,a:+x.montant,m:mi(x.mois),n:+x.duree_mois,t:+x.taux,ps:(rb[x.id]||[]).sort((a,b)=>a-b)}));
r.bd=t('depots_banque').map(x=>({id:x.id,mid:x.membre_id,m:mi(x.mois),a:+x.montant,t:+x.taux,ret:!!x.restitue_le}));
for(const x of t('votes_anonymes_totaux'))r.vat[mi(x.mois)+'-'+x.beneficiaire_id]={y:+x.a_la_hauteur,n:+x.pas_a_la_hauteur,who:[]};
const vo={};for(const x of t('votes_ouverts')){const q=vo[x.votant_id]=vo[x.votant_id]||{rid:re.id,mid:x.votant_id,v:{}};q.v[mi(x.mois)+'-'+x.beneficiaire_id]=!!x.a_la_hauteur}
r.votes=Object.values(vo);
return r}

// Le serveur renvoie 1000 lignes au plus par requête : une grande réunion doit être lue page par page.
async function sbTout(table,ordre,id){const pas=1000;let o=[],de=0;for(;;){let q=SB.from(table).select('*').eq('reunion_id',id);for(const c of ordre.split(','))q=q.order(c);const {data,error}=await q.range(de,de+pas-1);if(error)throw error;o=o.concat(data||[]);if(!data||data.length<pas)return o;de+=pas}}
const sbSquelette=x=>({id:x.reunion_id||x.id,n:x.nom||x.n,dv:x.monnaie||x.dv,off:x.suspendue!==undefined?x.suspendue:x.off,role:x.role,pin:x.pin,mem:[],cot:{},be:{},en:[],fi:[],am:[],no:{},w:[]});

async function sbListe(){const {data,error}=await SB.rpc('mes_reunions');if(error)throw error;S={r:(data||[]).map(sbSquelette),cur:null};VT=[];LISTE=true;MOI=null;ACCL=null;ACCC=null}

// Seule la réunion choisie est chargée ; les données de la précédente sont oubliées.
async function sbOuvrir(id){const av=S.r.find(x=>x.id==id)||{},role=av.role;ERR='';ACCL=null;ACCC=null;CONX.attente=true;render();try{
const {data:re,error}=await SB.from('reunions').select('*').eq('id',id).maybeSingle();if(error)throw error;
// Refus du serveur : accès retiré, ou PIN à saisir de nouveau. La liste à jour dit lequel.
if(!re){await sbListe();const x=S.r.find(y=>y.id==id);if(pinRequis(x))PINV={id,msg:'',attente:false};else ERR='Réunion introuvable ou accès refusé.';return}
const d={};await Promise.all(SB_TABLES.map(async([t,o])=>{d[t]=await sbTout(t,o,id)}));
const j=await SB.from('journal').select('*').eq('reunion_id',id).order('quand',{ascending:false}).limit(25);if(j.error)throw j.error;
const r=versPrototype(re,d);r.role=role;r.pin=av.pin;await accCharger(r);
// Les profils des autres ne sont plus lisibles : l'auteur se retrouve par sa fiche dans la réunion.
const noms={[re.createur_id]:'Créateur'};for(const x of d.membres)if(x.utilisateur_id)noms[x.utilisateur_id]=x.nom;
const act={INSERT:'Ajout',UPDATE:'Modification',DELETE:'Suppression'};
r.lg=(j.data||[]).slice().reverse().map(x=>({n:noms[x.auteur_id]||'—',t:Date.parse(x.quand),s:x.table_nom.replace(/_/g,' ')+(x.mois?' · '+String(x.mois).slice(0,7):''),d:act[x.action]||x.action}));
if(r.lg.length){const l=r.lg[r.lg.length-1];r.lm={n:l.n,t:l.t}}
VT=r.votes;delete r.votes;
S.r=S.r.map(x=>x.id==id?r:sbSquelette(x));S.cur=id;LISTE=false;nw=false;MOI=null;tab='mois'
}catch(e){ERR='Chargement impossible : '+((e&&e.message)||'erreur')}finally{CONX.attente=false;render()}}

async function sbCreer(){const nom=v('rn');if(!nom)return;const d0=v('rs0'),d1=v('rs1');ERR='';if(!/^\d{4}-\d{2}$/.test(d0)||!/^\d{4}-\d{2}$/.test(d1)||d1<d0){ERR='La date de fin doit être après la date de début.';render();return}
const {data,error}=await SB.from('reunions').insert({nom,createur_id:SESS.user.id,monnaie:v('rd')||'FCFA',debut:d0+'-01',fin:d1+'-01',cotisation:+v('rm')||0,cotisation_repas:+v('rq')||0}).select('id').single();
if(error){ERR='Création refusée : '+error.message;render();return}
try{await sbListe();nw=false;await sbOuvrir(data.id)}catch(e){ERR='Chargement impossible : '+((e&&e.message)||'erreur');render()}}

function connexionUI(){document.getElementById('nav').innerHTML='';const e=CONX.etape=='email',a=CONX.attente?'disabled':'';document.getElementById('app').innerHTML=`<div class="hd">${logo(48)}<h1>Djangui CM</h1></div><div style="text-align:center">${logo(110)}</div><h2>Connexion</h2>${e?'<div class="c"><b>Vous êtes membre ?</b><div class="mu">N’entrez pas d’e-mail. Ouvrez le lien reçu par WhatsApp, puis saisissez votre code PIN. S’il ne marche plus, demandez-en un nouveau à la personne qui gère votre réunion.</div><button style="margin-top:8px" onclick="invOuvrirColler()">J’ai déjà un lien ou un PIN</button></div>':''}<div class="c">${CONX.msg?`<div class="no" style="margin-bottom:6px">${esc(CONX.msg)}</div>`:''}${e?`<b>Vous gérez une réunion ?</b><div class="mu">Saisissez votre adresse e-mail. Vous recevrez un code de confirmation.</div><input id="sbe" type="email" inputmode="email" autocomplete="email" placeholder="Adresse e-mail" value="${esc(CONX.email)}"><button ${a} onclick="sbEnvoyer()">Recevoir le code</button>`:`<div class="mu">Saisissez le code reçu à l’adresse ${esc(CONX.email)}.</div><input id="sbc" inputmode="numeric" autocomplete="one-time-code" placeholder="Code reçu par e-mail"><button ${a} onclick="sbValider()">Valider</button> <button class="g" ${a} onclick="CONX.etape='email';CONX.msg='';render()">Changer d’adresse</button>`}</div>`;trAll()}
async function sbEnvoyer(){const email=v('sbe').toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){CONX.msg='Adresse e-mail invalide.';render();return}CONX.email=email;CONX.msg='';CONX.attente=true;render();const {error}=await SB.auth.signInWithOtp({email});CONX.attente=false;if(error){CONX.msg=error.code=='over_email_send_rate_limit'?'Trop d’e-mails envoyés. Réessayez plus tard.':error.code=='email_address_not_authorized'?'Le serveur ne peut pas encore envoyer d’e-mail à cette adresse.':'Envoi impossible : '+error.message}else CONX.etape='code';render()}
async function sbValider(){const token=v('sbc').replace(/\s/g,'');if(!token)return;CONX.msg='';CONX.attente=true;render();const {data,error}=await SB.auth.verifyOtp({email:CONX.email,token,type:'email'});CONX.attente=false;if(error||!data.session){CONX.msg='Code incorrect ou expiré.';render();return}await sbSession(data.session);render()}
async function sbSession(s){SESS=s;ME=s.user.id;WHO=s.user.is_anonymous?{name:'Membre invité'}:{email:s.user.email};SBKO=false;sbGarderMemoire();try{await sbListe()}catch(e){if(e&&e.code)ERR='Chargement impossible : '+(e.message||'erreur');else SBKO=true}await adgDetecter(s)}
// Demande au téléphone de ne pas effacer la session quand il manque de place. Il peut refuser.
function sbGarderMemoire(){try{const p=navigator.storage&&navigator.storage.persist&&navigator.storage.persist();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
// Un compte anonyme ne se retrouve plus après déconnexion : on prévient avant, s'il a encore une réunion.
async function sbSortir(){if(sbAnon()&&S.r.length&&!SORTIE){SORTIE=true;ERR='Attention : pour revenir, il vous faudra votre lien WhatsApp et votre code PIN. Appuyez de nouveau sur « Se déconnecter » pour confirmer.';render();return}SORTIE=false;await SB.auth.signOut();SESS=null;ME=null;WHO=null;S={r:[],cur:null};VT=[];INV=null;PINV=null;ACCL=null;ACCC=null;ADG=false;ADGV=null;ADMS=null;SBKO=false;CONX={etape:'email',email:'',msg:'',attente:false};ERR='';render()}
// Un lien d'invitation est retiré de la barre d'adresse dès sa lecture.
function sbLienDansAdresse(){const j=jetonDeLAdresse(location.hash);if(j===null)return null;try{history.replaceState(null,'',location.pathname+location.search)}catch(e){location.hash=''}return j}
async function sbInit(){if(!window.supabase){document.getElementById('app').innerHTML='<div class="c" style="border-left-color:var(--rd)">⚠️ Chargement impossible. Vérifiez votre connexion, puis rouvrez la page.</div>';return}SB=window.supabase.createClient(SB_URL,SB_CLE,{global:{fetch:sbFetch}});ADM=false;SUP=false;S={r:[],cur:null};SBJ=sbLienDansAdresse();if(SBJ!==null)INV={jeton:SBJ,etat:'charge',msg:'',attente:false};SBREP={lent:false,panne:false,encours:false};window.addEventListener('hashchange',()=>{const n=sbLienDansAdresse();if(n===null)return;if(SBREP)SBJ=n;else invCharger(n)});window.addEventListener('online',()=>{if(SBREP&&SBREP.panne&&!SBREP.encours)sbReprendre()});await sbReprendre()}
// Au retour, le jeton a souvent expiré : il faut du réseau pour le renouveler. Tant que la réponse n'est pas arrivée,
// la personne n'est pas déconnectée : on ne montre donc jamais l'écran e-mail pendant ce temps.
function sbReseau(e){return !!e&&(e.name=='AuthRetryableFetchError'||e.name=='TypeError')}
async function sbReprendre(){const g=SBREP;if(!g||g.encours)return;clearTimeout(SBT);g.encours=true;g.lent=false;render();const t=setTimeout(()=>{if(SBREP===g&&g.encours&&!g.panne){g.lent=true;render()}},8000);let data=null,error=null;try{SB.auth.lastRefreshFailure=null;({data,error}=await SB.auth.getSession())}catch(e){error=e}const s=data&&data.session;let coupe=!s&&sbReseau(error);if(s){await sbSession(s);coupe=SBKO;SBKO=false}clearTimeout(t);g.encours=false;if(SBREP!==g)return;if(coupe){g.panne=true;render();SBT=setTimeout(sbReprendre,15000);return}SBREP=null;sbErreurDeLien();const j=SBJ;SBJ=null;if(j!==null)await invCharger(j);render()}
function sbReessayer(){if(SBKO){SBKO=false;SBREP={lent:false,panne:false,encours:false};sbReprendre();return}if(SBREP&&!SBREP.encours){sbReprendre();return}if(navigator.onLine===false)return;location.reload()}
function sbRepriseUI(){const g=SBREP||{panne:true},b='<button style="margin-top:8px" onclick="sbReessayer()">Réessayer</button>';ecran(`<div style="text-align:center">${logo(110)}</div><div class="c">${SBKO||g.panne?`<b>Connexion impossible pour le moment</b><div class="mu">Vous n’êtes pas déconnecté(e) et rien n’est perdu. Vérifiez votre réseau. Un nouvel essai se fait tout seul.</div>${b}`:g.lent?`<b>Connexion lente…</b><div class="mu">Vous n’êtes pas déconnecté(e). Patientez encore un peu, ou appuyez sur Réessayer.</div>${b}`:'<div class="mu">Ouverture en cours…</div>'}</div>`)}
// Erreur d'un lien reçu par e-mail : seul le code d'erreur est lu. Le texte de l'adresse n'est jamais affiché, car n'importe qui peut l'écrire.
function sbErreurDeLien(){const h=location.hash;if(!/(^#|&)error(_code)?=/.test(h))return;try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}if(!SESS)CONX.msg=/(^#|&)error_code=otp_expired(&|$)/.test(h)?'Ce lien a expiré ou a déjà servi. Demandez un nouvel e-mail.':'Ce lien ne marche pas. Demandez un nouvel e-mail.'}
