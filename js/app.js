import { pickQuestions, score, QUIZ_SIZE } from './quiz.js';
import * as store from './store.js';
import { formatQuestion, esc, star, pct } from './render.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let bank = [], byId = {}, quiz = null;

nav.innerHTML = `<button data-go="start">Quiz</button><button data-go="stats">Stats</button><button data-go="history">History</button>`;
nav.onclick = e => { setKeys(null); const g = e.target.dataset.go; if (g) ({ start, stats, history })[g](); };

async function init() {
  try {
    const res = await fetch('data/questions.json?v=1');
    bank = await res.json();
    byId = Object.fromEntries(bank.map(q => [q.id, q]));
  } catch (e) {
    app.innerHTML = `<div class="card">Could not load questions (${esc(e.message)}). If you opened this file directly, run <code>python3 -m http.server</code> in this folder.</div>`;
    return;
  }
  const saved = store.load('current', null);
  saved && saved.questions?.length && saved.idx < saved.questions.length ? resumePrompt(saved) : start();
}

function resumePrompt(saved) {
  app.innerHTML = `<div class="card"><p>You have a quiz in progress (question ${saved.idx + 1} of ${saved.questions.length}).</p>
  <div class="row"><button class="primary" id="res">Resume</button><button id="new">Start over</button></div></div>`;
  document.getElementById('res').onclick = () => { quiz = saved; showQuestion(); };
  document.getElementById('new').onclick = () => { store.clear('current'); start(); };
}

function start() {
  const s = store.getSettings();
  const missed = missedIds();
  const nOrig = bank.filter(q => q.original).length;
  app.innerHTML = `<div class="card"><h2>Take a quiz</h2>
  <p>${QUIZ_SIZE} random questions from a bank of ${bank.length} (${nOrig} marked <span class="ast">*</span> are from your original test).</p>
  <label>Testament <select id="t"><option value="all">Both</option><option value="OT">Old Testament</option><option value="NT">New Testament</option></select></label>
  <label><input type="checkbox" id="o"> Original-test questions only (*)</label>
  <label><input type="checkbox" id="f"> Focus mode (favor unseen and previously missed)</label>
  <div class="row"><button class="primary" id="go">Start quiz</button>
  <button id="miss" ${missed.length ? '' : 'disabled'}>Retry missed (${missed.length})</button></div></div>`;
  t.value = s.testament; o.checked = s.originalsOnly; f.checked = s.focus;
  go.onclick = () => begin({ testament: t.value, originalsOnly: o.checked, focus: f.checked });
  miss.onclick = () => begin({ testament: 'all', originalsOnly: false, focus: false, only: missed });
}

function missedIds() { const g = store.lastGrades(); return Object.keys(g).filter(id => g[id] === 'missed' && byId[id]); }

function begin(opts) {
  store.saveSettings({ testament: opts.testament, originalsOnly: opts.originalsOnly, focus: opts.focus });
  const qs = pickQuestions(bank, opts, store.lastGrades());
  if (!qs.length) { app.innerHTML = '<div class="card">No questions match those filters.</div>'; return; }
  quiz = { questions: qs.map(q => q.id), idx: 0, answers: [], startedAt: Date.now() };
  store.save('current', quiz);
  showQuestion();
}

// Keyboard: Cmd/Ctrl+Enter reveals the answer; then g / p / m grade it.
let keyHandler = null;
function setKeys(fn) {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = fn;
  if (fn) document.addEventListener('keydown', fn);
}

function showQuestion(revealed = false, typed = '') {
  const q = byId[quiz.questions[quiz.idx]];
  app.innerHTML = `<div class="card"><div class="meta">Question ${quiz.idx + 1} of ${quiz.questions.length} · ${esc(q.testament)}</div>
  <p class="q">${star(q)} ${esc(formatQuestion(q))}</p>
  <label class="meta" for="typed">Your answer (optional, not auto-graded) · ⌘/Ctrl+Enter to submit</label>
  <textarea id="typed">${esc(typed)}</textarea>
  <div id="reveal"></div></div>`;
  const reveal = () => {
    const ta = document.getElementById('typed');
    const typedNow = ta.value;
    ta.readOnly = true; ta.blur();
    document.getElementById('reveal').innerHTML = `<div class="answer"><strong>Answer:</strong> ${esc(q.answer)}
    ${q.reference ? `<div class="meta">${esc(q.reference)}</div>` : ''}</div>
    <p>How did you do?</p><div class="row"><button data-g="got" class="good">Got it (G)</button><button data-g="partly" class="part">Partly (P)</button><button data-g="missed" class="bad">Missed (M)</button></div>`;
    setKeys(e => {
      const g = { g: 'got', p: 'partly', m: 'missed' }[e.key.toLowerCase()];
      if (g && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setKeys(null); grade(q, g, typedNow); }
    });
    document.getElementById('reveal').onclick = e => { const g = e.target.dataset.g; if (g) grade(q, g, typedNow); };
  };
  document.getElementById('reveal').innerHTML = '<div class="row"><button class="primary" id="show">Show answer</button></div>';
  document.getElementById('show').onclick = reveal;
  document.getElementById('typed').focus();
  setKeys(e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); reveal(); }
  });
}

function grade(q, g, typed) {
  setKeys(null);
  quiz.answers.push({ id: q.id, grade: g, typed });
  quiz.idx++;
  quiz.idx >= quiz.questions.length ? finish() : (store.save('current', quiz), showQuestion());
}

function finish() {
  const result = { date: Date.now(), answers: quiz.answers, score: score(quiz.answers), total: quiz.questions.length };
  store.addResult(result);
  store.clear('current');
  showResult(result);
}

function showResult(r) {
  const rows = r.answers.map(a => { const q = byId[a.id]; return q ? `<tr><td>${star(q)} ${esc(formatQuestion(q))}<div class="meta">${esc(q.answer)}</div></td>
    <td class="${a.grade === 'got' ? 'good' : a.grade === 'partly' ? 'part' : 'bad'}">${a.grade}</td></tr>` : ''; }).join('');
  app.innerHTML = `<div class="card"><h2>Score: ${r.score} / ${r.total}</h2><div class="bar"><i style="width:${pct(r.score, r.total)}%"></i></div>
  <table>${rows}</table><div class="row"><button class="primary" id="again">New quiz</button></div></div>`;
  document.getElementById('again').onclick = start;
}

function history() {
  const h = store.getHistory();
  app.innerHTML = `<div class="card"><h2>History</h2>${h.length ? '' : '<p>No quizzes yet.</p>'}
  <table>${h.map((r, i) => `<tr><td><button data-i="${i}">${new Date(r.date).toLocaleString()}</button></td><td>${r.score} / ${r.total}</td></tr>`).join('')}</table>
  <div class="row"><button id="exp">Export</button><button id="imp">Import</button></div><textarea id="io" hidden></textarea></div>`;
  app.querySelector('table').onclick = e => { const i = e.target.dataset.i; if (i != null) showResult(h[i]); };
  exp.onclick = () => { io.hidden = false; io.value = store.exportData(); io.select(); };
  imp.onclick = () => {
    if (io.hidden) { io.hidden = false; io.value = ''; io.placeholder = 'Paste exported JSON, then click Import again'; return; }
    try { store.importData(io.value); history(); } catch (e) { alert('Import failed: ' + e.message); }
  };
}

function stats() {
  const h = store.getHistory();
  const agg = (keyFn) => {
    const m = {};
    for (const r of h) for (const a of r.answers) { const q = byId[a.id]; if (!q) continue; const k = keyFn(q); (m[k] ||= { n: 0, pts: 0 }); m[k].n++; m[k].pts += { got: 1, partly: .5, missed: 0 }[a.grade]; }
    return Object.entries(m).filter(([, v]) => v.n >= 3).sort((a, b) => a[1].pts / a[1].n - b[1].pts / b[1].n)
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${pct(v.pts, v.n)}%</td><td>${v.n}</td></tr>`).join('') || '<tr><td colspan=3 class="meta">Not enough data yet (3+ attempts per row).</td></tr>';
  };
  const sec = (title, fn) => `<h3>${title}</h3><table><tr><th></th><th>Accuracy</th><th>Tries</th></tr>${agg(fn)}</table>`;
  app.innerHTML = `<div class="card"><h2>Weak areas</h2>${sec('By category', q => q.category)}${sec('By pattern', q => q.pattern)}
  ${sec('By testament', q => q.testament)}${sec('Original vs new', q => q.original ? '* original' : 'new')}</div>`;
}

init();
