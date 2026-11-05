// Message de bienvenue et liens WhatsApp.
const APPURL=(typeof location!='undefined'?String(location.href):'').split(/[?#]/)[0];
const cfDef=r=>{const t=cfDef0();return (r&&r.hp===false)?t.split('\n').filter(l=>!/visible only to the board|visible que par le bureau/.test(l)).join('\n'):t};
const cfDef0=()=>LG=='en'?'• Everything in this group (members, amounts, minutes) stays between members.\n• Do not share the app link, screenshots or phone numbers outside the group.\n• Your phone number is visible only to the board and members allowed to edit.\n• To have your data removed, contact the president.':'• Tout ce qui concerne la réunion (membres, montants, comptes rendus) reste entre les membres.\n• Ne partagez pas le lien de l’application, de captures d’écran ou de numéros en dehors du groupe.\n• Votre numéro n’est visible que par le bureau et les membres autorisés à écrire.\n• Pour faire retirer vos données, contactez le président.';
const cfTxt=r=>((r.cf||'').trim())||cfDef(r);
function nextSess(r){const c=curMo(r);for(let j=c;j<periodN(r);j++)if((r.sd||{})[j])return j;return -1}
function waMsg(r,m){const en=LG=='en',a=mamt(r,m),j=nextSess(r),ds=j>=0?fmtSd(r,j):'';
if(en)return `Hello ${m.n} 👋\n\nYou have been added to the group “${r.n}” on Djangui CM, our tontine app.${a>0?`\nYour contribution: ${f(a)}`:''}${ds?`\nNext session: ${ds}`:''}\n\n🔒 Privacy\n${cfTxt(r)}\n\nOpen the app: ${APPURL}`;
return `Bonjour ${m.n} 👋\n\nVous avez été ajouté(e) à la réunion « ${r.n} » sur Djangui CM, l’application de notre tontine.${a>0?`\nVotre cotisation : ${f(a)}`:''}${ds?`\nProchaine séance : ${ds}`:''}\n\n🔒 Confidentialité\n${cfTxt(r)}\n\nOuvrir l’application : ${APPURL}`}
function waUrl(r,m){let d=String(m.t||'').replace(/\D/g,'');const c=r.cc||'237';if(d.startsWith('00'))d=d.slice(2);else if(d.startsWith('0'))d=c+d.slice(1);else if(d.length<=9)d=c+d;return 'https://wa.me/'+d+'?text='+encodeURIComponent(waMsg(r,m))}
async function cpM(id){const r=R(),m=r.mem.find(x=>x.id==id);try{await navigator.clipboard.writeText(waMsg(r,m))}catch(e){}}
