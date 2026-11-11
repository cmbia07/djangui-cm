// Première entrée dans une réunion, après le lien et le PIN (qui ne changent pas) :
// 1. le créateur crée sa fiche de membre (il est un membre comme les autres) : un encadré, qui ne bloque pas
//    l'écran, car il doit pouvoir gérer sa réunion tout de suite ;
// 2. chacun lit le règlement et appuie sur « J'accepte » (seulement si le règlement est écrit) ;
// 3. chacun choisit le nom affiché : son nom réel ou un pseudo. Le créateur et le bureau voient toujours le nom réel.
// Toutes les décisions sont prises par le serveur : ces écrans ne font qu'appeler ses fonctions.
let ENT={msg:'',attente:false,pseudo:false},ENTPLUS={},BIENV=null;

const entMoi=r=>r&&r.mem.find(m=>m.u&&m.u===ME);
const entTour=r=>((r&&r.lotA&&r.lotA.tours)||[]).find(t=>t.etat!='fini');
function entreeEtape(r){if(!SB||!r||!r.lotA||r.off)return null;const moi=entMoi(r);
if(!moi)return null;
if((r.reglement||'').trim()&&!moi.ra)return 'reglement';
if(!moi.nc)return 'nom';return null}

async function entAction(fn){if(ENT.attente)return;ENT.attente=true;ENT.msg='';render();try{await fn()}catch(e){ENT.msg=(e&&e.message)||'Action refusée'}finally{ENT.attente=false;render()}}
const entRetour='<button class="g" style="margin-top:8px" onclick="ENT.msg=\'\';LISTE=true;render()">← Mes réunions</button>';

// Fiches que le créateur peut reprendre : jamais reliées, sans lien en cours ni PIN.
const entLibres=r=>r.mem.filter(m=>{const x=(r.acces||{})[m.id];return !m.u&&x&&!x.pin_defini&&(x.invitation=='aucune'||x.invitation=='annulee')});
function entFicheUI(r){const a=ENT.attente?'disabled':'',libres=entLibres(r);
return `<div class="c" style="border-left-color:var(--pr)"><b>Votre fiche de membre</b><div class="mu" style="margin:4px 0 8px">Le créateur est un membre comme les autres : il lui faut sa fiche pour cotiser, recevoir son tour et faire partie du bureau.</div>${accMsgUI(ENT.msg)}<input class="ac" id="entnom" maxlength="80" placeholder="Votre nom et prénom (nom réel)"><button class="ac" ${a} onclick="entCreerFiche()">Créer ma fiche</button>${libres.length?`<div class="mu" style="margin-top:10px">Ou bien, si vous vous êtes déjà inscrit(e) dans la liste :</div><select class="ac" id="entfiche"><option value="">Choisir ma fiche</option>${libres.map(m=>`<option value="${m.id}">${esc(m.nr||m.n)}</option>`).join('')}</select><button class="g ac" ${a} onclick="entReprendre()">C’est ma fiche</button>`:''}<button class="g ac" style="margin-top:8px" ${a} onclick="ENTPLUS[R().id]=true;ENT.msg='';render()">Plus tard</button></div>`}
function entCreerFiche(){const nom=v('entnom');if(!nom){ENT.msg='Écrivez votre nom.';render();return}return entAction(async()=>{const r=R(),{error}=await SB.rpc('creer_ma_fiche',{r:r.id,nom_reel:nom});if(error)throw error;await sbOuvrir(r.id)})}
function entReprendre(){const f=v('entfiche');if(!f){ENT.msg='Choisissez votre fiche dans la liste.';render();return}return entAction(async()=>{const r=R(),{error}=await SB.rpc('creer_ma_fiche',{r:r.id,nom_reel:null,fiche:f});if(error)throw error;await sbOuvrir(r.id)})}

function entReglementUI(r){const a=ENT.attente?'disabled':'';
return `<div class="mu">Bienvenue dans la réunion</div><h2 style="margin-top:2px">${esc(r.n)}</h2>${r.desc?`<div class="mu" style="margin-bottom:6px">${esc(r.desc)}</div>`:''}<div class="c"><b>Règlement</b><div style="white-space:pre-wrap;max-height:50vh;overflow:auto;margin:6px 0;padding-right:4px">${esc(r.reglement)}</div><div class="mu" style="margin-bottom:8px">En appuyant sur « J’accepte », vous acceptez ce règlement. Votre accord est enregistré avec la date.</div>${accMsgUI(ENT.msg)}<button ${a} onclick="entAccepter()">J’accepte</button></div>`}
function entAccepter(){return entAction(async()=>{const r=R(),{error}=await SB.rpc('accepter_reglement',{r:r.id});if(error)throw error;entMoi(r).ra=new Date().toISOString()})}

function entNomUI(r){const moi=entMoi(r),a=ENT.attente?'disabled':'',p=ENT.pseudo;
return `<h2>Votre nom dans la réunion</h2><div class="c"><b>Comment voulez-vous apparaître pour les autres membres ?</b>${accMsgUI(ENT.msg)}
<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="radio" name="entchoix" style="width:auto;margin:0" ${p?'':'checked'} onchange="ENT.pseudo=false;render()"> Mon nom réel : <b>${esc(moi.nr||moi.n)}</b></label>
<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="radio" name="entchoix" style="width:auto;margin:0" ${p?'checked':''} onchange="ENT.pseudo=true;render()"> Un pseudo</label>
${p?'<input id="entpseudo" maxlength="40" placeholder="Votre pseudo (40 caractères au plus)">':''}
<div class="mu" style="margin:6px 0 8px">Le créateur et les membres du bureau voient toujours votre nom réel.</div><button ${a} onclick="entChoisirNom()">Valider</button></div>`}
function entChoisirNom(){const pseudo=ENT.pseudo?v('entpseudo'):'';if(ENT.pseudo&&!pseudo){ENT.msg='Écrivez votre pseudo, ou choisissez votre nom réel.';render();return}
return entAction(async()=>{const r=R(),{error}=await SB.rpc('choisir_nom_affiche',{r:r.id,nom:pseudo});if(error)throw error;const moi=entMoi(r);moi.nc=new Date().toISOString();moi.n=pseudo||moi.nr||moi.n;ENT.pseudo=false;BIENV=r.id})}

// Appelée par render() : affiche l'étape en cours et répond true, ou ne fait rien.
function entreeUI(r){const e=entreeEtape(r);if(!e)return false;
ecran(`<div style="text-align:center">${logo(80)}</div>${e=='reglement'?entReglementUI(r):entNomUI(r)}${entRetour}`);return true}

// En haut de la réunion : la fiche à créer pour le créateur, et un court message d'arrivée, une seule fois.
function entreeBienvenue(r){if(r.role=='createur'&&!r.off&&!entMoi(r)&&!ENTPLUS[r.id])return entFicheUI(r);if(BIENV!==r.id)return '';const moi=entMoi(r);
return `<div class="c" style="border-left-color:var(--pr)"><div class="r" style="border:0;padding:0"><b>Bienvenue${moi?' '+esc(moi.n):''} 👋</b><button class="g ac" onclick="BIENV=null;render()">Fermer</button></div></div>`}

// Règlement écrit par le créateur, tant que le tour n'est pas verrouillé. Les membres l'acceptent à leur prochaine ouverture.
function reglementUI(r){if(r.role!='createur'||r.off)return '';const t=entTour(r),ouvert=t&&t.etat=='preparation';
return `<h2>Règlement</h2><div class="c">${ouvert?`<div class="mu">Chaque membre devra le lire et appuyer sur « J’accepte » en entrant. Il sera verrouillé à la première séance du tour.</div><textarea class="ac" id="entregl" rows="8" maxlength="20000">${esc(r.reglement||'')}</textarea><button class="ac" onclick="entEnregistrerReglement()">Enregistrer le règlement</button>`:`<div class="mu">Le tour a commencé : le règlement est verrouillé 🔒</div><div style="white-space:pre-wrap">${esc(r.reglement||'')}</div>`}</div>`}
function entEnregistrerReglement(){const t=document.getElementById('entregl').value;return accAction(async()=>{const r=R(),{error}=await SB.from('reunions').update({reglement:t}).eq('id',r.id);if(error)throw error;r.reglement=t})}
