// Journal des modifications.
const TL={cr:'Compte rendu',cal:'Calendrier',mois:'Mois',mem:'Membres',cai:'Caisse',res:'Résumé',adm:'Admin'},SOUS_ONGLETS={ent:'entrées',fi:'amendes',ai:'aides',lo:'prêts',bq:'banque'};
const fT=t=>new Date(t).toLocaleString(LOC(),{dateStyle:'short',timeStyle:'short'});
function stamp(r){const n=(WHO&&(WHO.name||WHO.email))||'Hors ligne',t=Date.now(),s=TL[tab]+(tab=='cai'?' ('+SOUS_ONGLETS[sub]+')':'')+' · '+mlab(mo,'fr');const d=DET;DET='';r.lm={n,t};r.lg=r.lg||[];const l=r.lg[r.lg.length-1];if(l&&l.n==n&&l.s==s&&(l.d||'')==d&&t-l.t<60000)l.t=t;else r.lg.push({n,t,s,d});r.lg=r.lg.slice(-60)}
function logUI(r){return `<h2>Journal des modifications</h2><div class="c">${(r.lg||[]).slice().reverse().slice(0,25).map(e=>`<div class="r"><span>${esc(e.n)}<br><span class="mu">${esc((e.d?e.d+' · ':'')+tm(e.s))}</span></span><span class="mu">${fT(e.t)}</span></div>`).join('')||'<span class="mu">Aucune modification enregistrée.</span>'}</div>`}
