/*
  app.js — Term@ Prode
  - Lokal, läuft vollständig im Browser
  - Verwaltet Projekte & Verlauf in localStorage
  - Simuliert KI-Antwort ohne externe API
*/

const STORAGE_KEYS = {
  PROJECTS: 'tp_projects_v1',
  HISTORY: 'tp_history_v1',
  CURRENT: 'tp_current_project_v1'
};

function qs(sel){ return document.querySelector(sel) }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)) }

const ui = {
  projectsList: qs('#projectsList'),
  historyList: qs('#historyList'),
  newProjectName: qs('#newProjectName'),
  createProjectBtn: qs('#createProjectBtn'),
  clearHistoryBtn: qs('#clearHistoryBtn'),
  statusEl: qs('#status'),
  projectNameEl: qs('#projectName'),
  outputEl: qs('#output'),
  promptInput: qs('#promptInput'),
  sendBtn: qs('#sendBtn'),
  saveToProjectBtn: qs('#saveToProjectBtn'),
  clearOutputBtn: qs('#clearOutputBtn')
};

let state = {
  projects: [],
  history: [],
  currentProjectId: null
};

/* --- Storage helpers --- */
function loadState(){
  try{
    state.projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    state.history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
    state.currentProjectId = localStorage.getItem(STORAGE_KEYS.CURRENT) || null;
  }catch(e){
    console.error('Failed to load state', e);
    state = {projects:[],history:[],currentProjectId:null};
  }
}
function saveState(){
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(state.projects));
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history));
  if(state.currentProjectId) localStorage.setItem(STORAGE_KEYS.CURRENT, state.currentProjectId);
  else localStorage.removeItem(STORAGE_KEYS.CURRENT);
}

/* --- UI rendering --- */
function renderProjects(){
  ui.projectsList.innerHTML = '';
  if(state.projects.length===0){
    const li = document.createElement('li');
    li.textContent = 'Keine Projekte';
    li.classList.add('muted');
    ui.projectsList.appendChild(li);
    ui.projectNameEl.textContent = '(kein Projekt)';
    return;
  }
  state.projects.forEach(p=>{
    const li = document.createElement('li');
    li.textContent = p.name;
    li.dataset.id = p.id;
    if(p.id === state.currentProjectId) li.classList.add('active');
    li.addEventListener('click', ()=> selectProject(p.id));
    ui.projectsList.appendChild(li);
  });
  ui.projectNameEl.textContent = (getCurrentProject()?.name) || '(kein Projekt)';
}

function renderHistory(){
  ui.historyList.innerHTML = '';
  if(state.history.length===0){
    const li = document.createElement('li');
    li.textContent = 'Noch keine Einträge';
    ui.historyList.appendChild(li);
    return;
  }
  state.history.slice().reverse().forEach(entry=>{
    const li = document.createElement('li');
    li.textContent = entry.prompt.slice(0,80) + (entry.prompt.length>80?'…':'');
    li.title = entry.prompt;
    li.addEventListener('click', ()=> {
      ui.promptInput.value = entry.prompt;
      ui.promptInput.focus();
    });
    ui.historyList.appendChild(li);
  });
}

function appendOutput(author, text){
  if(!ui.outputEl) return;
  // remove placeholder if present
  const ph = ui.outputEl.querySelector('.placeholder');
  if(ph) ph.remove();

  const div = document.createElement('div');
  div.className = 'message ' + (author==='user'?'user':'ai');
  div.textContent = text;
  ui.outputEl.appendChild(div);
  ui.outputEl.scrollTop = ui.outputEl.scrollHeight;
}

/* --- state helpers --- */
function uuid(){
  return 'id-' + Math.random().toString(36).slice(2,9);
}
function getCurrentProject(){
  return state.projects.find(p=>p.id === state.currentProjectId) || null;
}

/* --- actions --- */
function createProject(name){
  if(!name || !name.trim()) return alert('Bitte einen Projekt-Namen eingeben.');
  const p = {id: uuid(), name: name.trim(), items: []};
  state.projects.push(p);
  state.currentProjectId = p.id;
  saveState();
  renderProjects();
  renderHistory();
  ui.newProjectName.value = '';
}
function selectProject(id){
  state.currentProjectId = id;
  saveState();
  renderProjects();
}

function clearHistory(){
  if(!confirm('Verlauf wirklich löschen?')) return;
  state.history = [];
  saveState();
  renderHistory();
}

function savePromptToProject(prompt){
  const proj = getCurrentProject();
  if(!proj){
    alert('Kein Projekt ausgewählt.');
    return;
  }
  proj.items = proj.items || [];
  proj.items.push({id: uuid(), prompt, createdAt: Date.now()});
  saveState();
  renderProjects();
  alert('Prompt im Projekt gespeichert.');
}

/* --- Mock KI / Async --- */
function setStatus(text, short=false){
  if(!ui.statusEl) return;
  ui.statusEl.textContent = text;
  if(short){
    ui.statusEl.style.transition = 'none';
  }else{
    ui.statusEl.style.transition = '';
  }
}
function mockAiReply(prompt){
  // Simulate streaming / delay
  return new Promise(resolve=>{
    setStatus('Sende…');
    setTimeout(()=>{
      // simple mock transformation
      const summary = `Antwort (lokal simuliert):\n\n${prompt.split(/\s+/).slice(0,40).join(' ')}\n\n-- Ende der Simulation --`;
      resolve(summary);
    }, 700 + Math.random()*800);
  });
}

async function handleSend(){
  const prompt = ui.promptInput.value.trim();
  if(!prompt) return;
  appendOutput('user', prompt);
  state.history.push({id: uuid(), prompt, ts: Date.now()});
  saveState();
  renderHistory();
  ui.promptInput.value = '';
  setStatus('Antwort wird generiert…');
  try{
    const reply = await mockAiReply(prompt);
    appendOutput('ai', reply);
    setStatus('Bereit');
  }catch(e){
    console.error(e);
    setStatus('Fehler');
    appendOutput('ai', 'Fehler bei der Antwortgenerierung.');
  }
}

/* --- init --- */
function attachEvents(){
  if(ui.createProjectBtn) ui.createProjectBtn.addEventListener('click', ()=> createProject(ui.newProjectName.value));
  if(ui.clearHistoryBtn) ui.clearHistoryBtn.addEventListener('click', clearHistory);
  if(ui.sendBtn) ui.sendBtn.addEventListener('click', handleSend);
  if(ui.promptInput) ui.promptInput.addEventListener('keydown', (ev)=>{
    if(ev.key==='Enter' && (ev.ctrlKey || ev.metaKey)){
      ev.preventDefault();
      handleSend();
    }
  });
  if(ui.saveToProjectBtn) ui.saveToProjectBtn.addEventListener('click', ()=> {
    const p = ui.promptInput.value.trim();
    if(!p) return alert('Kein Prompt zum Speichern.');
    savePromptToProject(p);
  });
  if(ui.clearOutputBtn) ui.clearOutputBtn.addEventListener('click', ()=> {
    if(confirm('Ausgabe wirklich löschen?')) ui.outputEl.innerHTML = '<div class="placeholder">Die Ausgabe erscheint hier.</div>';
  });
}

function boot(){
  loadState();
  renderProjects();
  renderHistory();
  attachEvents();
  setStatus('Bereit');
}

document.addEventListener('DOMContentLoaded', boot);
