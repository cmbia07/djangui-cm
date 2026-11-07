// Accès des membres sans e-mail : lien personnel par WhatsApp, connexion anonyme, PIN, retrait d'accès.
// Toutes les décisions sont prises par le serveur : ces écrans ne font qu'appeler ses fonctions.
// Le lien en clair ne reste qu'en mémoire, le temps de l'envoyer : jamais dans le stockage du navigateur.
let INV=null,PINV=null,ACCL=null,ACCC=null,SORTIE=false;
const sbAnon=()=>!!(SESS&&SESS.user&&SESS.user.is_anonymous);
const pinRequis=x=>!!x&&['a_choisir','a_saisir','nouveau_lien'].includes(x.pin);
const accLocale=()=>LG=='en'?'en-GB':'fr-FR';
const accHeure=d=>new Date(d).toLocaleTimeString(accLocale(),{hour:'2-digit',minute:'2-digit'});
const accJour=d=>new Date(d).toLocaleDateString(accLocale(),{day:'numeric',month:'long',year:'numeric'});
function ecran(corps){document.getElementById('nav').innerHTML='';document.getElementById('app').innerHTML=`<div class="hd">${logo(48)}<h1>Djangui CM</h1></div>${corps}`;trAll()}
const accMsgUI=m=>m?`<div class="no" style="margin:6px 0">${esc(m)}</div>`:'';

// ---------------------------------------------------------------- Ouverture du lien
function jetonDeLAdresse(h){const m=/^#i=(.*)$/.exec(h||'');return m?m[1]:null}
// Le serveur vérifie le lien sans le consommer : un aperçu automatique ne peut pas le griller.
async function invCharger(jeton){INV={jeton,etat:'charge',msg:'',attente:false};render();const {data,error}=await SB.rpc('apercu_invitation',{jeton});if(error){INV.etat='erreur';INV.msg=error.message}else if(!data||!data.length)INV.etat='invalide';else{INV.etat='pret';INV.reunion=data[0].reunion;INV.membre=data[0].membre}render()}
function invFermer(){INV=null;render()}
function inviteUI(){const i=INV,a=i.attente?'disabled':'';let c;
if(i.etat=='charge')c='<div class="mu">Vérification du lien…</div>';
else if(i.etat=='invalide')c='<b class="no">Ce lien ne marche plus</b><div class="mu">Demandez à la personne qui gère votre réunion de vous en envoyer un nouveau. Vous n’avez pas besoin d’e-mail.</div><button class="g" style="margin-top:8px" onclick="invFermer()">Continuer</button>';
else if(i.etat=='erreur')c=`<b class="no">Vérification impossible</b>${accMsgUI(i.msg)}<button style="margin-top:8px" onclick="invCharger(INV.jeton)">Réessayer</button>`;
else c=`<div class="mu">Bonjour</div><h2 style="margin-top:2px">${esc(i.membre)}</h2><div class="mu">Vous êtes invité(e) à rejoindre la réunion :</div><div style="margin:4px 0 8px"><b>${esc(i.reunion)}</b></div>${accMsgUI(i.msg)}<button ${a} onclick="invRejoindre()">Rejoindre la réunion</button><div class="mu" style="margin-top:8px">Cet appareil sera rattaché à votre fiche. Aucune adresse e-mail n’est demandée.</div>`;
ecran(`<div style="text-align:center">${logo(110)}</div><div class="c">${c}</div>`)}
// Le lien n'est consommé qu'ici, après un appui de la personne.
async function invRejoindre(){const i=INV;if(!i||i.attente)return;i.attente=true;i.msg='';render();let s=SESS;try{
if(!s){const {data,error}=await SB.auth.signInAnonymously();if(error){i.msg=error.code=='anonymous_provider_disabled'?'Les connexions par lien ne sont pas encore activées sur le serveur.':error.status==429||error.code=='over_request_rate_limit'?'Trop de connexions pour le moment. Réessayez dans quelques minutes.':'Connexion impossible : '+error.message;return}s=data.session}
const {data:id,error}=await SB.rpc('rejoindre',{jeton:i.jeton});
if(error){i.msg=error.message;if(!SESS)await sbSession(s);return}
INV=null;await sbSession(s);await sbEntrer(id)
}catch(e){i.msg='Connexion impossible : '+((e&&e.message)||'erreur')}finally{i.attente=false;render()}}

// ---------------------------------------------------------------- PIN
// Le PIN est vérifié par le serveur : tant qu'il n'est pas validé, le serveur ne renvoie aucune donnée.
async function sbEntrer(id){const x=S.r.find(y=>y.id==id);if(pinRequis(x)){PINV={id,msg:'',attente:false};render();return}await sbOuvrir(id)}
async function pinSuite(){const id=PINV.id;await sbListe();PINV=null;await sbOuvrir(id)}
function pinFermer(){PINV=null;LISTE=true;render()}
function pinUI(){const p=PINV,x=S.r.find(y=>y.id==p.id)||{},a=p.attente?'disabled':'',champ=(id,ph)=>`<input id="${id}" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="${ph}">`;let c;
if(x.pin=='nouveau_lien')c='<b class="no">Trop d’erreurs de code PIN</b><div class="mu">Pour votre sécurité, ce code n’est plus accepté. Demandez un nouveau lien à la personne qui gère la réunion, puis choisissez un nouveau code.</div>';
else if(x.pin=='a_choisir')c=`<b>Choisissez votre code PIN</b><div class="mu">4 chiffres. Il protège l’accès à cette réunion sur cet appareil. Évitez 1234 ou votre année de naissance.</div>${accMsgUI(p.msg)}${champ('pa','Code PIN à 4 chiffres')}${champ('pb','Confirmez le code PIN')}<button ${a} onclick="pinChoisir()">Enregistrer le code</button>`;
else c=`<b>Saisissez votre code PIN</b><div class="mu">Le code à 4 chiffres que vous avez choisi pour cette réunion.</div>${accMsgUI(p.msg)}${champ('pa','Code PIN à 4 chiffres')}<button ${a} onclick="pinSaisir()">Valider</button>`;
ecran(`<div style="text-align:center">${logo(80)}</div><h2>${esc(x.n||'')}</h2><div class="c">${c}</div><button class="g" style="margin-top:8px" onclick="pinFermer()">← Mes réunions</button>`)}
async function pinChoisir(){const p=PINV;if(!p||p.attente)return;const a=v('pa'),b=v('pb');if(!/^[0-9]{4}$/.test(a)){p.msg='Le code PIN doit contenir 4 chiffres.';render();return}if(a!==b){p.msg='Les deux codes sont différents.';render();return}p.attente=true;p.msg='';render();try{const {error}=await SB.rpc('definir_pin',{r:p.id,pin:a});if(error){p.msg=error.message;return}await pinSuite()}catch(e){p.msg='Enregistrement impossible : '+((e&&e.message)||'erreur')}finally{p.attente=false;render()}}
async function pinSaisir(){const p=PINV;if(!p||p.attente)return;const a=v('pa');if(!/^[0-9]{4}$/.test(a)){p.msg='Le code PIN doit contenir 4 chiffres.';render();return}p.attente=true;p.msg='';render();try{const {data,error}=await SB.rpc('verifier_pin',{r:p.id,pin:a});if(error){p.msg=error.message;return}const l=(data&&data[0])||{},x=S.r.find(y=>y.id==p.id);
if(l.resultat=='ok'||l.resultat=='aucun'){await pinSuite();return}
if(l.resultat=='faux')p.msg='Code PIN incorrect.';else if(l.resultat=='bloque')p.msg='Trop d’erreurs. Réessayez après '+accHeure(l.reessayer_apres)+'.';else if(x&&l.resultat)x.pin=l.resultat;
}catch(e){p.msg='Vérification impossible : '+((e&&e.message)||'erreur')}finally{p.attente=false;render()}}

// ---------------------------------------------------------------- Inviter, renvoyer, retirer
async function accCharger(r){if(r.role!='createur'&&r.role!='redacteur'){r.acces=null;return}const {data,error}=await SB.rpc('etat_invitations',{r:r.id});if(error){r.acces=null;return}const o={};for(const x of (data||[]))o[x.membre_id]=x;r.acces=o}
function accTexte(r,m,url,fin){const d=accJour(fin);if(LG=='en')return `Hello ${m.n} 👋\n\nHere is your personal link to the group “${r.n}” on Djangui CM, our tontine app:\n${url}\n\nIt works only once and expires on ${d}. Please do not forward it.\n\n🔒 Privacy\n${cfTxt(r)}`;return `Bonjour ${m.n} 👋\n\nVoici votre lien personnel pour accéder à la réunion « ${r.n} » sur Djangui CM, l’application de notre tontine :\n${url}\n\nIl ne fonctionne qu’une fois et expire le ${d}. Merci de ne pas le transférer.\n\n🔒 Confidentialité\n${cfTxt(r)}`}
const accWa=(r,m,t)=>m.t?waTo(r,m,t):'https://wa.me/?text='+encodeURIComponent(t);
const accBase=()=>String(location.href).split('#')[0];
async function accAction(fn){ERR='';ACCC=null;try{await fn()}catch(e){ERR=(e&&e.message)||'Action refusée'}render()}
function accInviter(id){return accAction(async()=>{const r=R(),m=r.mem.find(x=>x.id==id),e=(r.acces||{})[id]||{},el=document.getElementById('accr-'+id),role=(el&&el.value)||e.role_compte||e.role_invite||'lecteur',{data,error}=await SB.rpc('inviter',{r:r.id,fiche:id,nouveau_role:r.role=='createur'?role:'lecteur'});if(error)throw error;const l=data[0],url=accBase()+'#i='+l.lien_jeton,msg=accTexte(r,m,url,l.lien_expire_le);ACCL={id,msg,wa:accWa(r,m,msg),fin:l.lien_expire_le,copie:false};await accCharger(r)})}
function accRetirer(id){if(ACCC!==id){ACCC=id;render();return}return accAction(async()=>{const r=R(),{error}=await SB.rpc('retirer_acces',{r:r.id,fiche:id});if(error)throw error;if(ACCL&&ACCL.id==id)ACCL=null;await accCharger(r)})}
function accRole(id,role){return accAction(async()=>{const r=R(),{error}=await SB.rpc('changer_role',{r:r.id,fiche:id,nouveau_role:role});if(error)throw error;await accCharger(r)})}
function accPin(){return accAction(async()=>{const r=R(),{error}=await SB.from('reunions').update({pin_actif:!r.pa}).eq('id',r.id);if(error)throw error;r.pa=!r.pa})}
function accAjouter(){const n=v('mn'),t=v('mt');if(!n)return;return accAction(async()=>{const r=R(),{data,error}=await SB.from('membres').insert({reunion_id:r.id,nom:n}).select().single();if(error)throw error;const m={id:data.id,n,c:0,tr:'',h:[]};r.mem.push(m);if(t){const c=await SB.from('membres_contacts').insert({reunion_id:r.id,membre_id:m.id,telephone:t});if(c.error)throw c.error;m.t=t}await accCharger(r)})}
async function accCopier(){if(!ACCL)return;try{await navigator.clipboard.writeText(ACCL.msg);ACCL.copie=true}catch(e){ERR='Copie impossible : sélectionnez le message dans WhatsApp.'}render()}
function accFermer(){ACCL=null;render()}
function accLienUI(r){const m=r.mem.find(x=>x.id==ACCL.id);if(!m)return '';return `<div class="c" style="border-left-color:#25d366"><b>Lien prêt pour </b><b>${esc(m.n)}</b><div class="mu" style="margin:4px 0 8px">Ouvrez WhatsApp, puis appuyez vous-même sur Envoyer. Rien n’est envoyé automatiquement. Le lien ne s’affiche qu’ici : pour en obtenir un autre, utilisez « Renvoyer le lien ».</div>${m.t?'':'<div class="mu">Aucun numéro enregistré : choisissez le contact dans WhatsApp.</div>'}${/^file:/.test(accBase())?'<div class="no" style="margin:4px 0">L’application n’est pas encore en ligne : ce lien ne s’ouvrira que sur cet ordinateur.</div>':''}<a class="wa" href="${esc(ACCL.wa)}" target="_blank" rel="noopener">Ouvrir WhatsApp</a> <button class="g ac" onclick="accCopier()">${ACCL.copie?'Message copié ✓':'Copier le message'}</button> <button class="g ac" onclick="accFermer()">Fermer</button></div>`}
function accEtat(x){if(!x)return '';if(x.role_compte)return 'Accès actif : '+(ROLE_L[x.role_compte]||x.role_compte);if(x.invitation=='en_attente')return 'Invitation valable jusqu’au '+accJour(x.expire_le);if(x.invitation=='expiree')return 'Invitation expirée';return 'Aucun accès'}
function accLigne(r,m){const g=r.role=='createur',x=(r.acces||{})[m.id],en=x&&x.invitation=='en_attente';let b='';
const agir=!r.off&&x&&x.role_compte!='createur'&&(g||(r.role=='redacteur'&&(!x.role_compte||x.role_compte=='lecteur')&&!(en&&x.role_invite=='redacteur')));
if(agir){if(g&&!x.role_compte&&!en)b+=`<select class="ac" id="accr-${m.id}" style="width:auto"><option value="lecteur">Lecteur</option><option value="redacteur" ${x.role_invite=='redacteur'?'selected':''}>Rédacteur</option></select>`;
b+=`<button class="ac" onclick="accInviter('${m.id}')">${x.role_compte||en||x.invitation=='expiree'?'Renvoyer le lien':'Inviter'}</button>`;
if(g&&x.role_compte)b+=`<button class="g ac" onclick="accRole('${m.id}','${x.role_compte=='redacteur'?'lecteur':'redacteur'}')">${x.role_compte=='redacteur'?'Passer lecteur':'Passer rédacteur'}</button>`;
if(x.role_compte||en)b+=`<button class="x ac" onclick="accRetirer('${m.id}')">${ACCC==m.id?'Confirmer le retrait':'Retirer l’accès'}</button>`}
const d=[m.t?esc(m.t):'',accEtat(x),sab(r,m.id)?'🌴':''].filter(Boolean).join(' · ');return `<div class="r"><span>${esc(m.n)}${d?`<br><span class="mu">${d}</span>`:''}</span><span>${b}</span></div>`}
function accesUI(r){const g=r.role=='createur'&&!r.off;return `<h2>Membres (${r.mem.length}/${CFG.maxm})</h2>${g?'<div class="c"><input class="ac" id="mn" placeholder="Nom et prénom"><input class="ac" id="mt" type="tel" placeholder="Téléphone"><button class="ac" onclick="accAjouter()">Inscrire le membre</button></div>':''}${ACCL?accLienUI(r):''}<div class="c">${r.mem.map(m=>accLigne(r,m)).join('')||'<span class="mu">Aucun membre.</span>'}</div>${g?`<h2>Code PIN</h2><div class="c"><div class="mu">Si l’option est activée, chaque membre invité choisit un code à 4 chiffres et doit le saisir à chaque nouvelle ouverture, au plus toutes les 12 heures. Après 5 erreurs : 15 minutes de blocage. Après 10 erreurs : nouveau lien obligatoire.</div><button class="ac ${r.pa?'':'g'}" style="margin-top:8px" onclick="accPin()">${r.pa?'Code PIN demandé ✓':'Code PIN non demandé'}</button></div>`:''}`}
function sansAccesUI(){return '<div class="c"><b>Aucune réunion sur cet appareil</b><div class="mu">Votre accès a peut-être été retiré, ou remplacé par un nouveau lien. Demandez un lien à la personne qui gère votre réunion.</div><button class="g" style="margin-top:8px" onclick="sbSortir()">Se connecter par e-mail (créateur)</button></div>'}
