const express = require('express');
const fs = require('fs');
const path = require('path');
const phrases = require('./data/phrases');

const app = express();
const PORT = process.env.PORT || 3000;
const PROGRESS_PATH = process.env.PROGRESS_PATH || path.join(__dirname, 'data', 'progress.md');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function defaultEntry() {
  return { mastered: false, attempts: 0, correct: 0, last: null };
}

function ensureProgressFile() {
  const dir = path.dirname(PROGRESS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(PROGRESS_PATH)) {
    const state = {};
    phrases.forEach(p => { state[p.id] = defaultEntry(); });
    writeProgress(state);
  }
}

function readProgress() {
  const raw = fs.readFileSync(PROGRESS_PATH, 'utf8');
  const state = {};
  const lineRe = /^- \[([ x])\] .*?<!--(\{.*?\})-->\s*$/;
  raw.split('\n').forEach(line => {
    const m = line.match(lineRe);
    if (!m) return;
    try {
      const data = JSON.parse(m[2]);
      if (data.id) {
        state[data.id] = {
          mastered: m[1] === 'x',
          attempts: data.attempts || 0,
          correct: data.correct || 0,
          last: data.last || null
        };
      }
    } catch (e) { /* skip a malformed line rather than fail the whole read */ }
  });
  phrases.forEach(p => { if (!state[p.id]) state[p.id] = defaultEntry(); });
  return state;
}

function writeProgress(state) {
  const byCat = {};
  phrases.forEach(p => {
    byCat[p.cat] = byCat[p.cat] || [];
    byCat[p.cat].push(p);
  });
  let mastered = 0;
  phrases.forEach(p => { if (state[p.id] && state[p.id].mastered) mastered++; });

  let out = '---\n';
  out += 'tool: Nihongo Speak & Listen\n';
  out += `updated: ${new Date().toISOString()}\n`;
  out += '---\n\n';
  out += '# Japanese Progress\n\n';
  out += `${mastered} of ${phrases.length} mastered\n\n`;
  Object.keys(byCat).forEach(cat => {
    out += `## ${cat}\n`;
    byCat[cat].forEach(p => {
      const e = state[p.id] || defaultEntry();
      const box = e.mastered ? 'x' : ' ';
      const meta = JSON.stringify({ id: p.id, attempts: e.attempts, correct: e.correct, last: e.last });
      out += `- [${box}] **${p.en}** — ${p.romaji} <!--${meta}-->\n`;
    });
    out += '\n';
  });
  fs.writeFileSync(PROGRESS_PATH, out, 'utf8');
}

ensureProgressFile();

app.get('/api/phrases', (req, res) => res.json(phrases));

app.get('/api/progress', (req, res) => res.json(readProgress()));

app.post('/api/progress/:id', (req, res) => {
  const { id } = req.params;
  const phrase = phrases.find(p => p.id === id);
  if (!phrase) return res.status(404).json({ error: 'Unknown phrase id' });

  const state = readProgress();
  const entry = state[id] || defaultEntry();
  const { event } = req.body || {};
  const today = new Date().toISOString().slice(0, 10);

  if (event === 'attempt') {
    entry.attempts += 1;
    entry.last = today;
  } else if (event === 'correct') {
    entry.attempts += 1;
    entry.correct += 1;
    entry.last = today;
  } else if (event === 'toggle-mastered') {
    entry.mastered = !entry.mastered;
  } else {
    return res.status(400).json({ error: 'Unknown event' });
  }

  state[id] = entry;
  writeProgress(state);
  res.json({ id, ...entry });
});

app.listen(PORT, () => {
  console.log(`Nihongo Speak & Listen running at http://localhost:${PORT}`);
  console.log(`Progress file: ${PROGRESS_PATH}`);
});
