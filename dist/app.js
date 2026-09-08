const STORAGE_KEY = 'calcioteam-pwa-v1';
const roles = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
const formations = { '3-3-2': [1,3,3,2], '3-2-3': [1,3,2,3], '2-3-3': [1,2,3,3] };

const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const atTime = (days, hour = 19, minute = 0) => {
  const date = new Date(); date.setDate(date.getDate() + days); date.setHours(hour, minute, 0, 0); return date.toISOString();
};

function demoState() {
  const names = [
    ['Marco','Rossi',1,'Portiere'], ['Luca','Bianchi',2,'Difensore'], ['Davide','Ferrari',4,'Difensore'],
    ['Andrea','Romano',5,'Difensore'], ['Matteo','Gallo',3,'Difensore'], ['Simone','Costa',8,'Centrocampista'],
    ['Federico','Conti',6,'Centrocampista'], ['Alessio','Moretti',10,'Centrocampista'], ['Nicola','Ricci',7,'Attaccante'],
    ['Stefano','Marino',9,'Attaccante'], ['Emanuele','Greco',11,'Attaccante'], ['Paolo','Fontana',12,'Portiere'],
    ['Gabriele','Caruso',14,'Difensore'], ['Tommaso','Rizzo',16,'Centrocampista']
  ];
  const players = names.map(([firstName,lastName,number,role]) => ({ id:uid(), firstName,lastName,number,role,phone:'',notes:'',active:true }));
  return {
    teamName: 'ASD Aurora', season: '2026/27', formation: '3-3-2', starters: players.slice(0,9).map(p=>p.id), players, lastBackupAt: null,
    events: [
      {id:uid(),type:'training',title:'Allenamento tecnico',date:atTime(2,19,30),location:'Campo comunale',opponent:'',home:true,teamScore:null,opponentScore:null,notes:'',attendance:{},lineups:[[],[],[],[]]},
      {id:uid(),type:'match',title:'Campionato',date:atTime(5,15,0),location:'Stadio comunale',opponent:'Real Borgo',home:true,teamScore:null,opponentScore:null,notes:'',attendance:{},lineups:[[],[],[],[]]},
      {id:uid(),type:'match',title:'Campionato',date:atTime(-7,15,0),location:'Campo sportivo Nord',opponent:'Atletico Blu',home:false,teamScore:2,opponentScore:1,notes:'',attendance:{},lineups:[[],[],[],[]]}
    ]
  };
}

let state = loadState();
let activeView = 'home';
let eventFilter = 'upcoming';
let activeMatchPeriod = 0;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.players && saved?.events) {
      return normalizeState(saved);
    }
  } catch (_) {}
  return demoState();
}

function normalizeState(data) {
  const normalized = {
    ...data,
    teamName: data.teamName || 'La mia squadra',
    season: data.season || '2026/27',
    players: Array.isArray(data.players) ? data.players : [],
    events: Array.isArray(data.events) ? data.events : [],
    formation: formations[data.formation] ? data.formation : '3-3-2',
    starters: Array.isArray(data.starters) ? data.starters.slice(0, 9) : [],
    lastBackupAt: data.lastBackupAt || null
  };
  normalized.events = normalized.events.map(event => ({
    ...event,
    attendance: event.attendance || {},
    lineups: Array.from({length:4},(_,index)=>Array.isArray(event.lineups?.[index]) ? event.lineups[index].slice(0,9) : [])
  }));
  return normalized;
}

function saveState(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
  if (message) showToast(message);
}

const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const dateFmt = (iso, opts = {dateStyle:'medium', timeStyle:'short'}) => new Intl.DateTimeFormat('it-IT', opts).format(new Date(iso));
const eventIcon = type => ({training:'⚽',match:'🏟'}[type] || '●');
const eventTypeName = type => ({training:'Allenamento',match:'Partita'}[type] || 'Evento');
const eventLabel = e => e.type === 'match' && e.opponent ? `vs ${e.opponent}` : e.title;
const isPast = e => new Date(e.date) < new Date();

function render() {
  $('#header-team').textContent = state.teamName;
  $('#header-season').textContent = `Stagione ${state.season}`;
  $('#today-label').textContent = new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short'}).format(new Date());
  renderHome(); renderPlayers(); renderEvents(); renderLineup();
}

function renderHome() {
  const upcoming = state.events.filter(e=>!isPast(e)).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const next = upcoming[0];
  $('#next-event-card').innerHTML = next ? `
    <div class="event-type-icon">${eventIcon(next.type)}</div>
    <p class="eyebrow">PROSSIMO IMPEGNO · ${esc(eventTypeName(next.type).toUpperCase())}</p>
    <h2>${esc(eventLabel(next))}</h2>
    <div class="event-meta"><span>◷ ${dateFmt(next.date)}</span><span>⌖ ${esc(next.location || 'Luogo da definire')}</span></div>` : `
    <div class="empty-next"><div><span style="font-size:2rem">✓</span><h2>Nessun impegno in programma</h2><p>Aggiungine uno dall’Agenda.</p></div></div>`;

  $('#stats-grid').innerHTML = [
    [state.players.filter(p=>p.active).length,'Giocatori'], [state.starters.length+'/9','Titolari'], [upcoming.length,'Impegni']
  ].map(([value,label])=>`<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');

  renderBackupReminder();

  const results = state.events.filter(e=>e.type==='match' && isPast(e) && e.teamScore!==null).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
  $('#recent-results').innerHTML = results.length ? results.map(e=>`
    <div class="result-row"><span class="event-type-icon">${resultOutcome(e)}</span><div class="grow"><div class="row-title">${esc(e.opponent || e.title)}</div><div class="row-meta">${dateFmt(e.date,{day:'numeric',month:'short',year:'numeric'})}</div></div><div class="score">${e.teamScore} – ${e.opponentScore}</div></div>`).join('') : emptyState('🏆','Nessun risultato inserito');
}

function renderBackupReminder() {
  const last = state.lastBackupAt ? new Date(state.lastBackupAt) : null;
  const ageDays = last ? (Date.now() - last.getTime()) / 86400000 : Infinity;
  $('#backup-reminder').innerHTML = ageDays >= 7 ? `<div class="backup-reminder"><span style="font-size:1.4rem">⇩</span><div class="grow"><strong>${last ? 'È il momento di fare un backup' : 'Proteggi i dati della squadra'}</strong><span>${last ? `Ultimo backup: ${dateFmt(last,{day:'numeric',month:'short',year:'numeric'})}` : 'Non hai ancora esportato un backup.'}</span></div><button data-action="backup-now">Backup</button></div>` : '';
}

function resultOutcome(e) { return e.teamScore > e.opponentScore ? 'V' : e.teamScore < e.opponentScore ? 'S' : 'P'; }

function renderPlayers() {
  const query = ($('#player-search')?.value || '').trim().toLowerCase();
  const filtered = state.players.filter(p => !query || `${p.firstName} ${p.lastName} ${p.number}`.toLowerCase().includes(query));
  $('#players-list').innerHTML = roles.map(role => {
    const items = filtered.filter(p=>p.role===role).sort((a,b)=>a.number-b.number);
    if (!items.length) return '';
    return `<section class="role-section"><h2>${role}</h2><div class="list-card">${items.map(p=>`
      <div class="list-row ${p.active?'':'inactive'}"><div class="avatar">${p.number}</div><button class="row-action grow" style="text-align:left" data-action="view-player" data-id="${p.id}"><div class="row-title">${esc(p.firstName)} ${esc(p.lastName)}</div><div class="row-meta">${esc(p.role)}${p.active?'':' · Inattivo'}</div></button><button class="row-action" data-action="edit-player" data-id="${p.id}" aria-label="Modifica ${esc(p.firstName)}">›</button></div>`).join('')}</div></section>`;
  }).join('') || emptyState('🔎','Nessun giocatore trovato');
}

function renderEvents() {
  $$('[data-event-filter]').forEach(b=>b.classList.toggle('active',b.dataset.eventFilter===eventFilter));
  const events = state.events.filter(e=>eventFilter==='past'?isPast(e):!isPast(e)).sort((a,b)=>eventFilter==='past'?new Date(b.date)-new Date(a.date):new Date(a.date)-new Date(b.date));
  $('#events-list').innerHTML = events.length ? `<div class="list-card">${events.map(e=>{
    const d = new Date(e.date); const day = d.getDate(); const month = new Intl.DateTimeFormat('it-IT',{month:'short'}).format(d);
    const score = e.type==='match' && e.teamScore!==null ? `<span class="score">${e.teamScore} – ${e.opponentScore}</span>` : '';
    return `<div class="list-row"><div class="event-day"><strong>${day}</strong><span>${month}</span></div><button class="row-action grow" style="text-align:left" data-action="view-event" data-id="${e.id}"><div class="row-title">${eventIcon(e.type)} ${esc(eventLabel(e))}</div><div class="row-meta">${dateFmt(e.date,{hour:'2-digit',minute:'2-digit'})} · ${esc(e.location||'Luogo da definire')}</div></button>${score}<button class="row-action" data-action="edit-event" data-id="${e.id}" aria-label="Modifica evento">›</button></div>`;
  }).join('')}</div>` : emptyState('▦',eventFilter==='past'?'Nessun evento concluso':'Nessun impegno programmato');
}

function renderLineup() {
  $$('.formation-picker button').forEach(b=>b.classList.toggle('active',b.dataset.formation===state.formation));
  $('#lineup-count').textContent = `${state.starters.length}/9`;
  const selected = state.starters.map(id=>state.players.find(p=>p.id===id)).filter(Boolean);
  const lineCounts = formations[state.formation]; let cursor=0;
  $('#pitch').innerHTML = `<div class="center-circle"></div>` + lineCounts.map(count=>{
    const line=selected.slice(cursor,cursor+count); cursor+=count;
    return `<div class="pitch-line">${line.map(p=>`<div class="pitch-player"><div class="jersey">${p.number}</div><span>${esc(p.lastName)}</span></div>`).join('')}</div>`;
  }).join('');
  const players=state.players.filter(p=>p.active).sort((a,b)=>roles.indexOf(a.role)-roles.indexOf(b.role)||a.number-b.number);
  $('#lineup-list').innerHTML=players.map(p=>`<div class="list-row"><div class="avatar">${p.number}</div><div class="grow"><div class="row-title">${esc(p.firstName)} ${esc(p.lastName)}</div><div class="row-meta">${esc(p.role)}</div></div><button class="starter-toggle ${state.starters.includes(p.id)?'selected':''}" data-action="toggle-starter" data-id="${p.id}" aria-label="${state.starters.includes(p.id)?'Rimuovi':'Aggiungi'} titolare">✓</button></div>`).join('');
}

function emptyState(icon,text) { return `<div class="empty-state"><span class="empty-icon">${icon}</span>${esc(text)}</div>`; }

function navigate(view) {
  activeView=view;
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));
  $$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
  window.scrollTo({top:0,behavior:'smooth'});
}

function openDialog({eyebrow='',title,body,actions=''}) {
  $('#dialog-eyebrow').textContent=eyebrow; $('#dialog-title').textContent=title; $('#dialog-body').innerHTML=body;
  $('#dialog-actions').innerHTML=actions || `<button class="secondary-button" value="cancel">Chiudi</button>`;
  $('#app-dialog').showModal();
}

function closeDialog() { $('#app-dialog').close(); }

function playerForm(player) {
  const p=player||{id:'',firstName:'',lastName:'',number:1,role:'Centrocampista',phone:'',notes:'',active:true};
  openDialog({eyebrow:'ROSA',title:player?'Modifica giocatore':'Nuovo giocatore',body:`
    <input type="hidden" name="entity" value="player"><input type="hidden" name="id" value="${p.id}">
    <div class="form-grid"><div class="field"><label for="firstName">Nome</label><input id="firstName" name="firstName" value="${esc(p.firstName)}" required></div>
    <div class="field"><label for="lastName">Cognome</label><input id="lastName" name="lastName" value="${esc(p.lastName)}"></div>
    <div class="field"><label for="number">Numero</label><input id="number" name="number" type="number" min="1" max="99" value="${p.number}" required></div>
    <div class="field"><label for="role">Ruolo</label><select id="role" name="role">${roles.map(r=>`<option ${r===p.role?'selected':''}>${r}</option>`).join('')}</select></div>
    <div class="field full"><label for="phone">Telefono</label><input id="phone" name="phone" type="tel" value="${esc(p.phone)}"></div>
    <div class="field full"><label for="notes">Note</label><textarea id="notes" name="notes">${esc(p.notes)}</textarea></div></div>
    <label class="check-row"><input name="active" type="checkbox" ${p.active?'checked':''}> Giocatore attivo</label>`,
    actions:`${player?'<button type="button" class="danger-button" data-action="delete-player" data-id="'+p.id+'">Elimina</button>':''}<button class="secondary-button" value="cancel">Annulla</button><button class="primary-button" value="save">Salva</button>`});
}

function eventForm(event) {
  const e=event||{id:'',type:'training',title:'Allenamento',date:atTime(1,19,30),location:'',opponent:'',home:true,teamScore:null,opponentScore:null,notes:'',attendance:{}};
  const localDate = new Date(new Date(e.date).getTime()-new Date(e.date).getTimezoneOffset()*60000).toISOString().slice(0,16);
  openDialog({eyebrow:'AGENDA',title:event?'Modifica evento':'Nuovo evento',body:`
    <input type="hidden" name="entity" value="event"><input type="hidden" name="id" value="${e.id}">
    <div class="form-grid"><div class="field"><label for="type">Tipo</label><select id="type" name="type"><option value="training" ${e.type==='training'?'selected':''}>Allenamento</option><option value="match" ${e.type==='match'?'selected':''}>Partita</option></select></div>
    <div class="field"><label for="event-date">Data e ora</label><input id="event-date" name="date" type="datetime-local" value="${localDate}" required></div>
    <div class="field full"><label for="title">Titolo</label><input id="title" name="title" value="${esc(e.title)}" required></div>
    <div class="field full"><label for="location">Luogo</label><input id="location" name="location" value="${esc(e.location)}"></div>
    <div class="field match-field"><label for="opponent">Avversario</label><input id="opponent" name="opponent" value="${esc(e.opponent)}"></div>
    <div class="field match-field"><label class="check-row"><input name="home" type="checkbox" ${e.home?'checked':''}> Partita in casa</label></div>
    <div class="field match-field"><label for="teamScore">Gol squadra</label><input id="teamScore" name="teamScore" type="number" min="0" max="30" value="${e.teamScore??''}"></div>
    <div class="field match-field"><label for="opponentScore">Gol avversario</label><input id="opponentScore" name="opponentScore" type="number" min="0" max="30" value="${e.opponentScore??''}"></div>
    <div class="field full"><label for="notes">Note</label><textarea id="notes" name="notes">${esc(e.notes)}</textarea></div></div>`,
    actions:`${event?'<button type="button" class="danger-button" data-action="delete-event" data-id="'+e.id+'">Elimina</button>':''}<button class="secondary-button" value="cancel">Annulla</button><button class="primary-button" value="save">Salva</button>`});
  toggleMatchFields(); $('#type').addEventListener('change',toggleMatchFields);
}

function toggleMatchFields(){ const show=$('#type')?.value==='match'; $$('.match-field').forEach(el=>el.style.display=show?'flex':'none'); }

function viewPlayer(p) {
  openDialog({eyebrow:p.role.toUpperCase(),title:`${p.firstName} ${p.lastName}`,body:`
    <div class="detail-hero"><div class="avatar">${p.number}</div><div><div class="row-title">Maglia numero ${p.number}</div><div class="row-meta">${esc(p.role)} · ${p.active?'Attivo':'Inattivo'}</div></div></div>
    ${p.phone?`<p><strong>Telefono</strong><br>${esc(p.phone)}</p>`:''}${p.notes?`<p><strong>Note</strong><br>${esc(p.notes)}</p>`:''}`,
    actions:`<button class="secondary-button" value="cancel">Chiudi</button><button type="button" class="primary-button" data-action="edit-player" data-id="${p.id}">Modifica</button>`});
}

function viewEvent(e) {
  const activePlayers=state.players.filter(p=>p.active).sort((a,b)=>a.number-b.number);
  activeMatchPeriod = 0;
  openDialog({eyebrow:eventTypeName(e.type).toUpperCase(),title:eventLabel(e),body:`
    <div class="detail-hero"><div class="event-type-icon">${eventIcon(e.type)}</div><div><div class="row-title">${dateFmt(e.date)}</div><div class="row-meta">${esc(e.location||'Luogo da definire')}</div></div></div>
    ${e.notes?`<p>${esc(e.notes)}</p>`:''}
    <h2 style="margin:18px 0 8px">Disponibilità</h2>
    ${activePlayers.length ? activePlayers.map(p=>`<div class="availability-row"><span>${p.number} · ${esc(p.firstName)} ${esc(p.lastName)}</span><select data-attendance-event="${e.id}" data-player="${p.id}"><option value="pending" ${(e.attendance[p.id]||'pending')==='pending'?'selected':''}>Da confermare</option><option value="present" ${e.attendance[p.id]==='present'?'selected':''}>Presente</option><option value="absent" ${e.attendance[p.id]==='absent'?'selected':''}>Assente</option></select></div>`).join('') : emptyState('♟','Inserisci prima i giocatori nella Rosa')}
    ${e.type==='match'?'<div id="match-lineups"></div>':''}`,
    actions:`<button class="secondary-button" value="cancel">Chiudi</button><button type="button" class="primary-button" data-action="edit-event" data-id="${e.id}">Modifica</button>`});
  if(e.type==='match') renderMatchLineupEditor(e);
}

function renderMatchLineupEditor(event) {
  const container=$('#match-lineups'); if(!container)return;
  const activePlayers=state.players.filter(p=>p.active).sort((a,b)=>a.number-b.number);
  const selected=event.lineups[activeMatchPeriod] || [];
  container.innerHTML=`
    <div class="match-lineup-heading"><div><p class="eyebrow">FORMAZIONI PARTITA</p><h2>Giocatori per tempo</h2></div><span class="selection-count">${selected.length}/9</span></div>
    <div class="segmented period-picker">${[0,1,2,3].map(index=>`<button type="button" class="${index===activeMatchPeriod?'active':''}" data-action="match-period" data-event-id="${event.id}" data-period="${index}">${index+1}° tempo</button>`).join('')}</div>
    <div class="period-player-list">${activePlayers.length ? activePlayers.map(p=>`<div class="list-row"><div class="avatar">${p.number}</div><div class="grow"><div class="row-title">${esc(p.firstName)} ${esc(p.lastName)}</div><div class="row-meta">${esc(p.role)}</div></div><button type="button" class="starter-toggle ${selected.includes(p.id)?'selected':''}" data-action="toggle-match-player" data-event-id="${event.id}" data-player-id="${p.id}" aria-label="${selected.includes(p.id)?'Rimuovi':'Aggiungi'} dal ${activeMatchPeriod+1}° tempo">✓</button></div>`).join('') : emptyState('♟','Nessun giocatore disponibile')}</div>`;
}

function settingsForm() {
  const backupLabel = state.lastBackupAt ? dateFmt(state.lastBackupAt) : 'Nessun backup ancora eseguito';
  openDialog({eyebrow:'IMPOSTAZIONI',title:'La tua squadra',body:`
    <input type="hidden" name="entity" value="settings"><div class="field"><label for="teamName">Nome squadra</label><input id="teamName" name="teamName" value="${esc(state.teamName)}" required></div><div class="field"><label for="season">Stagione</label><input id="season" name="season" value="${esc(state.season)}" required></div>
    <div class="install-note"><strong>Installazione su iPhone</strong><br>Apri il sito in Safari, tocca Condividi e scegli “Aggiungi alla schermata Home”.</div>
    <div class="backup-status"><strong>Ultimo backup</strong><br>${esc(backupLabel)}</div>
    <input class="visually-hidden" id="import-file" type="file" accept="application/json,.json">`,
    actions:`<button type="button" class="secondary-button" data-action="import-data">Ripristina</button><button type="button" class="secondary-button" data-action="export-data">Backup</button><button class="secondary-button" value="cancel">Annulla</button><button class="primary-button" value="save">Salva</button>`});
}

$('#dialog-form').addEventListener('submit',e=>{
  e.preventDefault(); const submitter=e.submitter; if(submitter?.value!=='save'){closeDialog();return;}
  const data=new FormData(e.currentTarget); const entity=data.get('entity');
  if(entity==='player'){
    const item={id:data.get('id')||uid(),firstName:data.get('firstName').trim(),lastName:data.get('lastName').trim(),number:Number(data.get('number')),role:data.get('role'),phone:data.get('phone').trim(),notes:data.get('notes').trim(),active:data.has('active')};
    const index=state.players.findIndex(p=>p.id===item.id); index>=0?state.players[index]=item:state.players.push(item);
  }
  if(entity==='event'){
    const existing=state.events.find(x=>x.id===data.get('id'));
    const num=v=>v===''?null:Number(v);
    const item={id:data.get('id')||uid(),type:data.get('type'),title:data.get('title').trim(),date:new Date(data.get('date')).toISOString(),location:data.get('location').trim(),opponent:data.get('opponent')?.trim()||'',home:data.has('home'),teamScore:num(data.get('teamScore')),opponentScore:num(data.get('opponentScore')),notes:data.get('notes').trim(),attendance:existing?.attendance||{},lineups:existing?.lineups||[[],[],[],[]]};
    const index=state.events.findIndex(x=>x.id===item.id); index>=0?state.events[index]=item:state.events.push(item);
  }
  if(entity==='settings'){state.teamName=data.get('teamName').trim();state.season=data.get('season').trim();}
  closeDialog(); saveState('Modifiche salvate');
});

document.addEventListener('click',e=>{
  const button=e.target.closest('button'); if(!button)return;
  if(button.dataset.nav) return navigate(button.dataset.nav);
  if(button.dataset.eventFilter){eventFilter=button.dataset.eventFilter;return renderEvents();}
  if(button.dataset.formation){state.formation=button.dataset.formation;return saveState();}
  const action=button.dataset.action,id=button.dataset.id;
  if(action==='add-player')playerForm();
  if(action==='edit-player'){closeDialog();playerForm(state.players.find(p=>p.id===id));}
  if(action==='view-player')viewPlayer(state.players.find(p=>p.id===id));
  if(action==='delete-player'&&confirm('Eliminare questo giocatore?')){state.players=state.players.filter(p=>p.id!==id);state.starters=state.starters.filter(x=>x!==id);state.events.forEach(event=>event.lineups=event.lineups.map(lineup=>lineup.filter(x=>x!==id)));closeDialog();saveState('Giocatore eliminato');}
  if(action==='add-event')eventForm();
  if(action==='edit-event'){closeDialog();eventForm(state.events.find(x=>x.id===id));}
  if(action==='view-event')viewEvent(state.events.find(x=>x.id===id));
  if(action==='delete-event'&&confirm('Eliminare questo evento?')){state.events=state.events.filter(x=>x.id!==id);closeDialog();saveState('Evento eliminato');}
  if(action==='toggle-starter'){
    if(state.starters.includes(id))state.starters=state.starters.filter(x=>x!==id);
    else if(state.starters.length<9)state.starters.push(id); else return showToast('Hai già selezionato 9 titolari');
    saveState();
  }
  if(action==='match-period'){
    activeMatchPeriod=Number(button.dataset.period);
    const event=state.events.find(x=>x.id===button.dataset.eventId);
    if(event)renderMatchLineupEditor(event);
  }
  if(action==='toggle-match-player'){
    const event=state.events.find(x=>x.id===button.dataset.eventId); if(!event)return;
    const playerId=button.dataset.playerId; const lineup=event.lineups[activeMatchPeriod];
    if(lineup.includes(playerId))event.lineups[activeMatchPeriod]=lineup.filter(x=>x!==playerId);
    else if(lineup.length<9)lineup.push(playerId); else return showToast('Hai già selezionato 9 giocatori per questo tempo');
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); renderMatchLineupEditor(event);
  }
  if(action==='export-data')exportData();
  if(action==='backup-now')exportData();
  if(action==='import-data')$('#import-file')?.click();
});

document.addEventListener('change',e=>{
  if(e.target.matches('[data-attendance-event]')){
    const event=state.events.find(x=>x.id===e.target.dataset.attendanceEvent);
    event.attendance[e.target.dataset.player]=e.target.value; localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); showToast('Disponibilità aggiornata');
  }
  if(e.target.id==='import-file' && e.target.files?.[0]) importData(e.target.files[0]);
});

$('#settings-button').addEventListener('click',settingsForm);
$('#player-search').addEventListener('input',renderPlayers);

async function exportData(){
  const exportedAt = new Date().toISOString();
  const dataToExport = {...state, lastBackupAt: exportedAt};
  const payload = {schemaVersion: 2, exportedAt, data: dataToExport};
  const fileName = `calcioteam-backup-${exportedAt.slice(0,10)}.json`;
  const file = new File([JSON.stringify(payload,null,2)],fileName,{type:'application/json'});
  try {
    if (navigator.canShare?.({files:[file]})) {
      await navigator.share({title:'Backup CalcioTeam',files:[file]});
    } else {
      const url=URL.createObjectURL(file); const a=document.createElement('a');a.href=url;a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    state.lastBackupAt = exportedAt;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    render(); showToast('Backup creato correttamente');
  } catch (error) {
    if (error.name !== 'AbortError') showToast('Non è stato possibile creare il backup');
  }
}

async function importData(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const imported = parsed.data || parsed;
    if (!Array.isArray(imported.players) || !Array.isArray(imported.events)) throw new Error('invalid');
    if (!confirm(`Ripristinare il backup “${file.name}”? I dati attuali verranno sostituiti.`)) return;
    state = normalizeState(imported);
    closeDialog();
    saveState('Backup ripristinato correttamente');
  } catch (_) {
    showToast('Il file selezionato non è un backup valido');
  }
}

let toastTimer;
function showToast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200);}

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
