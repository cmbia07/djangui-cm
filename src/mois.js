// Onglet Mois : cotisations, repas et bénéficiaires.
function togr(id){const r=R(),k=mo+'-'+id;r.cotr=r.cotr||{};r.cotr[k]=!r.cotr[k];r.cotra=r.cotra||{};if(r.cotr[k])r.cotra[k]=r.rp||0;else delete r.cotra[k];DET='Repas de '+nmT(r,id)+' : '+(r.cotr[k]?'payé':'non payé');save();render()}
function tog(id){const r=R(),k=mo+'-'+id;r.cot[k]=!r.cot[k];r.cota=r.cota||{};if(r.cot[k])r.cota[k]=mamt(r,r.mem.find(x=>x.id==id),mo);else delete r.cota[k];DET='Cotisation de '+nmT(r,id)+' : '+(r.cot[k]?'payée':'non payée');save();render()}
function addBe(id){if(!id)return;const r=R(),l=bl(r,mo);if(sab(r,id))return;if(!l.includes(id))r.be[mo]=[...l,id];DET='Bénéficiaire ajouté : '+nmT(r,id);save();render()}
function rmBe(id){const r=R();r.be[mo]=bl(r,mo).filter(x=>x!=id);DET='Bénéficiaire retiré : '+nmT(r,id);save();render()}
function bmode(v){const r=R();r.bm=r.bm||{};r.bm[mo]=v;DET='Partage du mois : '+(v=='c'?'chacun reçoit le total':v=='w'?'au prorata de la cotisation':'cagnotte partagée');save();render()}
