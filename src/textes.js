// Grands cadres de texte enregistrés sur le serveur : compte rendu de séance (déroulé = notes de séance,
// décisions, à suivre) et règles de confidentialité. Les droits sont vérifiés par le serveur ; l'écran
// n'ouvre le cadre qu'à ceux que le serveur acceptera.
//   Compte rendu : le bureau du tour, et le créateur tant que le tour est en préparation.
//   Confidentialité : le créateur ou le bureau, tant que le tour est en préparation.
let TXT={},TXQ={},TXE={};

const txBureau=r=>{const t=entTour(r),moi=entMoi(r);return !!(t&&moi&&((r.lotA&&r.lotA.postes)||[]).some(p=>p.tour_id==t.id&&p.membre_id==moi.id))};
const txPrepare=r=>{const t=entTour(r);return !!(t&&t.etat=='preparation'&&(r.role=='createur'||txBureau(r)))};
// Hors ligne (tests sur le disque), l'ancienne règle d'écriture reste.
const txCr=r=>SB?!!(r&&!r.off&&(txBureau(r)||txPrepare(r))):RW();
const txCf=r=>SB?!!(r&&!r.off&&txPrepare(r)):RW();
const txAc=ok=>ok?' class="ac"':'';

// Le mois n°m de la réunion, au format attendu par le serveur (AAAA-MM-01).
const txMois=(r,m)=>{const y=+r.d0.slice(0,4),k=+r.d0.slice(5,7)-1+m;return `${y+Math.floor(k/12)}-${String(k%12+1).padStart(2,'0')}-01`};

// L'état d'enregistrement affiché sous chaque cadre ; il survit à un nouvel affichage de l'écran.
function txEtat(cle,t,ko){TXE[cle]={t,ko:!!ko};const el=document.getElementById('txs-'+cle);if(el&&el.style){el.textContent=t;el.style.color=ko?'#c0392b':''}}
const txEtatUI=cle=>{const e=TXE[cle];return `<div class="mu" id="txs-${cle}"${e&&e.ko?' style="color:#c0392b"':''}>${e?esc(e.t):''}</div>`};

// On envoie peu après la dernière frappe, et tout de suite en quittant le cadre.
// Les envois d'un même cadre partent l'un après l'autre : le dernier texte tapé est celui qui reste.
function txEcrire(cle,envoi){clearTimeout((TXT[cle]||{}).h);TXT[cle]={envoi,h:setTimeout(()=>txPartir(cle),800)};txEtat(cle,'Enregistrement…')}
function txPartir(cle){const x=TXT[cle];if(!x)return TXQ[cle]||Promise.resolve();clearTimeout(x.h);delete TXT[cle];
TXQ[cle]=(TXQ[cle]||Promise.resolve()).then(async()=>{try{const {error}=await x.envoi();if(error)throw error;if(!TXT[cle])txEtat(cle,'Enregistré ✓')}catch(e){txEtat(cle,'Non enregistré : '+((e&&e.message)||'erreur')+'. Votre texte est toujours là : réessayez.',true)}});
return TXQ[cle]}
function txToutEnvoyer(){return Promise.all([...Object.keys(TXT).map(txPartir),...Object.values(TXQ)])}

// Appelée par le compte rendu (onglet Séance) et par les notes de séance (onglet Résumé), qui sont le même texte.
function txCompteRendu(r,m,fld){if(!SB)return;const champ={t:'deroule',d:'decisions',n:'a_suivre'}[fld],x=fld=='t'?(r.no||{})[m]:((r.cr||{})[m]||{})[fld];
txEcrire(`cr-${m}-${fld}`,()=>SB.rpc('enregistrer_compte_rendu',{r:r.id,m:txMois(r,m),champ,texte:x||''}))}
function txConfidentialite(r){if(!SB)return;txEcrire('cf',()=>SB.rpc('enregistrer_confidentialite',{r:r.id,texte:r.cf||''}))}

// Onglet Membres, en ligne : les règles de confidentialité, pour le créateur et le bureau.
function confUI(r){if(!SB||!r||(r.role!='createur'&&!txBureau(r)))return '';
const ouvert=txCf(r);
return `<h2>Confidentialité</h2><div class="c"><div class="mu">Ces règles sont envoyées avec le message de bienvenue aux nouveaux membres.</div>`
+(ouvert?`<div class="mu" style="margin-top:8px">Texte des règles (laisser vide pour le texte proposé)</div><textarea class="ac" id="txcf" rows="6" placeholder="${esc(cfDef(r))}" oninput="setCf(this.value)" onblur="txPartir('cf')">${esc(r.cf||'')}</textarea>${txEtatUI('cf')}`
:`<div class="mu" style="margin-top:8px">Le tour a commencé : ces règles sont verrouillées 🔒</div><div style="white-space:pre-wrap">${esc(cfTxt(r))}</div>`)+`</div>`}
