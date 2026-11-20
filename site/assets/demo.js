// Replays evidence/closure/demo-terminal.txt: real output of the native before/after reproduction.
const $ = id => document.getElementById(id);
const raw = await (await fetch('assets/demo-terminal.txt')).text();
const lines = raw.replace(/\s+$/, '').split('\n');
const at = s => lines.findIndex(l => l.startsWith(s));
const SECTIONS = [
  ['Before', at('Native BEFORE'), at('Regression RED'), 'Unpatched adapter on real files and xattrs: an already-aborted upload still publishes, and an upload aborted mid-transfer keeps streaming ("partialremaining": the bytes sent after the abort were written too) and still succeeds.'],
  ['Red tests', at('Regression RED'), at('Production change'), 'Two of the five new regression tests fail against the original code, as they should.'],
  ['The fix', at('Production change'), at('Native AFTER'), 'Eight lines added, one removed: reject pre-aborted calls, pass the signal into the existing pipeline, normalise the abort error after cleanup.'],
  ['After', at('Native AFTER'), at('Regression GREEN'), 'Same native scenario with the fix: both cases reject, the old object survives and no staging file is left behind.'],
  ['Green tests', at('Regression GREEN'), lines.length, 'All five regression and control cases pass. The run cleans up its own temporary worktree.'],
];
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function paint(l) {
  const e = esc(l);
  if (/^\+[^+]/.test(l)) return `<span class="add">${e}</span>`;
  if (/^-[^-]/.test(l)) return `<span class="del">${e}</span>`;
  if (/^@@|^diff |^index |^---|^\+\+\+/.test(l)) return `<span class="meta">${e}</span>`;
  if (/FAIL|failed|AssertionError/.test(l)) return `<span class="bad">${e}</span>`;
  if (/PASS|passed/.test(l)) return `<span class="ok">${e}</span>`;
  if (/^\$ /.test(l)) return `<span class="cmd">${e}</span>`;
  if (/^(Native|Regression|Production|Investigating)/.test(l)) return `<span class="head">${e}</span>`;
  return e.replace(/"(resolved|true|partialremaining)"|: (true)\b/g, m => `<span class="bad">${m}</span>`).replace(/"(rejected|old|Aborted|AbortedTerminate)"/g, m => `<span class="ok">${m}</span>`);
}
let timer;
function show(i, animate) {
  clearInterval(timer);
  document.querySelectorAll('#sl-tabs button').forEach((b, k) => b.setAttribute('aria-selected', k === i));
  const [, a, b, cap] = SECTIONS[i], chunk = lines.slice(a, b), out = $('sl-out');
  $('sl-cap').textContent = cap;
  if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { out.innerHTML = chunk.map(paint).join('\n'); return; }
  out.innerHTML = ''; let n = 0;
  timer = setInterval(() => { out.innerHTML = chunk.slice(0, ++n).map(paint).join('\n'); out.scrollTop = out.scrollHeight; if (n >= chunk.length) { clearInterval(timer); if (playing && i < SECTIONS.length - 1) setTimeout(() => playing && show(i + 1, true), 900); else playing = false; } }, 45);
}
let playing = false;
$('sl-tabs').innerHTML = SECTIONS.map((s, i) => `<button type="button" data-i="${i}">${i + 1} · ${s[0]}</button>`).join('');
$('sl-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { playing = false; show(+b.dataset.i, true); } });
$('sl-play').addEventListener('click', () => { playing = true; show(0, true); });
show(0, false);
