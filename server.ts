import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('academiaflow.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    color TEXT,
    priority TEXT,
    difficulty INTEGER,
    objective_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (objective_id) REFERENCES objectives(id)
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key)
  );

  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    type TEXT NOT NULL,
    reference_id INTEGER,
    payload TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type, reference_id)
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    subject_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    subject_id INTEGER NOT NULL,
    topic_id INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER,
    type TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    subject_id INTEGER NOT NULL,
    topic_id INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    total INTEGER,
    correct INTEGER,
    incorrect INTEGER,
    percent_correct REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    subject_id INTEGER NOT NULL,
    scheduled_date TEXT,
    status TEXT DEFAULT 'pending',
    type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    type TEXT,
    target_hours REAL,
    period TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type, period)
  );
`);

// Migration: add user_id to any existing tables that don't have it yet
const tables = ['objectives','subjects','user_preferences','drafts','topics','sessions','exercises','reviews','goals'];
for (const table of tables) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default'`);
    console.log(`Migration: added user_id to ${table}`);
  } catch (_) { /* already exists */ }
}

// Recreate tables with correct UNIQUE constraints that include user_id
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default',
      type TEXT NOT NULL,
      reference_id INTEGER,
      payload TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, type, reference_id)
    );
    INSERT OR IGNORE INTO drafts_v2 SELECT id,user_id,type,reference_id,payload,updated_at FROM drafts;
    DROP TABLE drafts;
    ALTER TABLE drafts_v2 RENAME TO drafts;
  `);
} catch(_) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default',
      type TEXT,
      target_hours REAL,
      period TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, type, period)
    );
    INSERT OR IGNORE INTO goals_v2 SELECT id,user_id,type,target_hours,period,created_at FROM goals;
    DROP TABLE goals;
    ALTER TABLE goals_v2 RENAME TO goals;
  `);
} catch(_) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default',
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, key)
    );
    INSERT OR IGNORE INTO user_preferences_v2 SELECT id,user_id,key,value,updated_at FROM user_preferences;
    DROP TABLE user_preferences;
    ALTER TABLE user_preferences_v2 RENAME TO user_preferences;
  `);
} catch(_) {}

// Helper: extract and sanitize user_id from request header
function getUserId(req: express.Request): string {
  const uid = (req.headers['x-user-id'] as string) || 'default';
  return uid.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64) || 'default';
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // ── Objectives ──────────────────────────────────────────────
  app.get('/api/objectives', (req, res) => {
    const uid = getUserId(req);
    res.json(db.prepare('SELECT * FROM objectives WHERE user_id = ?').all(uid));
  });

  app.post('/api/objectives', (req, res) => {
    const uid = getUserId(req);
    const { name, description } = req.body;
    const info = db.prepare('INSERT INTO objectives (user_id,name,description) VALUES (?,?,?)').run(uid, name, description);
    res.json({ id: info.lastInsertRowid });
  });

  // ── Subjects ─────────────────────────────────────────────────
  app.get('/api/subjects', (req, res) => {
    const uid = getUserId(req);
    res.json(db.prepare(`
      SELECT s.*, o.name as objective_name 
      FROM subjects s LEFT JOIN objectives o ON s.objective_id = o.id
      WHERE s.user_id = ?
    `).all(uid));
  });

  app.post('/api/subjects', (req, res) => {
    const uid = getUserId(req);
    const { name, color, priority, difficulty, objective_id } = req.body;
    const info = db.prepare('INSERT INTO subjects (user_id,name,color,priority,difficulty,objective_id) VALUES (?,?,?,?,?,?)').run(uid, name, color, priority, difficulty, objective_id);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/subjects/:id', (req, res) => {
    const uid = getUserId(req);
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE subjects SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, uid);
    res.json({ success: true });
  });

  app.delete('/api/subjects/:id', (req, res) => {
    const uid = getUserId(req);
    const id = req.params.id;
    db.transaction(() => {
      db.prepare('DELETE FROM reviews   WHERE subject_id=? AND user_id=?').run(id, uid);
      db.prepare('DELETE FROM exercises WHERE subject_id=? AND user_id=?').run(id, uid);
      db.prepare('DELETE FROM sessions  WHERE subject_id=? AND user_id=?').run(id, uid);
      db.prepare('DELETE FROM topics    WHERE subject_id=? AND user_id=?').run(id, uid);
      db.prepare('DELETE FROM subjects  WHERE id=? AND user_id=?').run(id, uid);
    })();
    res.json({ success: true });
  });

  app.delete('/api/sessions/:id', (req, res) => {
    const uid = getUserId(req);
    db.prepare('DELETE FROM sessions WHERE id=? AND user_id=?').run(req.params.id, uid);
    res.json({ success: true });
  });

  // ── Topics ───────────────────────────────────────────────────
  app.get('/api/topics', (req, res) => {
    const uid = getUserId(req);
    const { subject_id } = req.query;
    let q = 'SELECT t.*, s.name as subject_name FROM topics t JOIN subjects s ON t.subject_id = s.id WHERE t.user_id = ?';
    const params: any[] = [uid];
    if (subject_id) { q += ' AND t.subject_id = ?'; params.push(subject_id); }
    res.json(db.prepare(q).all(...params));
  });

  app.post('/api/topics', (req, res) => {
    const uid = getUserId(req);
    const { subject_id, name, description } = req.body;
    const info = db.prepare('INSERT INTO topics (user_id,subject_id,name,description) VALUES (?,?,?,?)').run(uid, subject_id, name, description);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/topics/:id', (req, res) => {
    const uid = getUserId(req);
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE topics SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, uid);
    res.json({ success: true });
  });

  app.delete('/api/topics/:id', (req, res) => {
    const uid = getUserId(req);
    db.prepare('DELETE FROM topics WHERE id=? AND user_id=?').run(req.params.id, uid);
    res.json({ success: true });
  });

  // ── Sessions ─────────────────────────────────────────────────
  app.get('/api/sessions', (req, res) => {
    const uid = getUserId(req);
    res.json(db.prepare(`
      SELECT s.*, sub.name as subject_name, sub.color as subject_color, t.name as topic_name 
      FROM sessions s 
      JOIN subjects sub ON s.subject_id = sub.id 
      LEFT JOIN topics t ON s.topic_id = t.id
      WHERE s.user_id = ?
      ORDER BY s.date DESC
    `).all(uid));
  });

  app.post('/api/sessions', (req, res) => {
    const uid = getUserId(req);
    const { subject_id, topic_id, duration, type, notes, date } = req.body;
    const info = db.prepare('INSERT INTO sessions (user_id,subject_id,topic_id,duration,type,notes,date) VALUES (?,?,?,?,?,?,?)').run(uid, subject_id, topic_id, duration, type, notes, date || new Date().toISOString());
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/sessions/:id', (req, res) => {
    const uid = getUserId(req);
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE sessions SET ${fields} WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, uid);
    res.json({ success: true });
  });

  // ── Exercises ────────────────────────────────────────────────
  app.get('/api/exercises', (req, res) => {
    const uid = getUserId(req);
    res.json(db.prepare(`
      SELECT e.*, sub.name as subject_name, t.name as topic_name 
      FROM exercises e 
      JOIN subjects sub ON e.subject_id = sub.id 
      LEFT JOIN topics t ON e.topic_id = t.id
      WHERE e.user_id = ?
      ORDER BY e.date DESC
    `).all(uid));
  });

  app.post('/api/exercises', (req, res) => {
    const uid = getUserId(req);
    const { subject_id, topic_id, total, correct, incorrect, notes, date } = req.body;
    const pct = total > 0 ? (correct / total) * 100 : 0;
    const info = db.prepare('INSERT INTO exercises (user_id,subject_id,topic_id,total,correct,incorrect,percent_correct,notes,date) VALUES (?,?,?,?,?,?,?,?,?)').run(uid, subject_id, topic_id, total, correct, incorrect, pct, notes, date || new Date().toISOString());
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/exercises/:id', (req, res) => {
    const uid = getUserId(req);
    const updates = req.body;
    if (updates.total !== undefined || updates.correct !== undefined) {
      const cur = db.prepare('SELECT total,correct FROM exercises WHERE id=? AND user_id=?').get(req.params.id, uid) as any;
      if (cur) {
        const total = updates.total ?? cur.total;
        const correct = updates.correct ?? cur.correct;
        updates.percent_correct = total > 0 ? (correct / total) * 100 : 0;
      }
    }
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE exercises SET ${fields} WHERE id = ? AND user_id = ?`).run(...Object.values(updates), req.params.id, uid);
    res.json({ success: true });
  });

  // ── Reviews ──────────────────────────────────────────────────
  app.get('/api/reviews', (req, res) => {
    const uid = getUserId(req);
    res.json(db.prepare(`
      SELECT r.*, sub.name as subject_name, sub.color as subject_color 
      FROM reviews r JOIN subjects sub ON r.subject_id = sub.id 
      WHERE r.user_id = ?
      ORDER BY r.scheduled_date ASC
    `).all(uid));
  });

  app.post('/api/reviews', (req, res) => {
    const uid = getUserId(req);
    const { subject_id, scheduled_date, type } = req.body;
    const info = db.prepare('INSERT INTO reviews (user_id,subject_id,scheduled_date,type) VALUES (?,?,?,?)').run(uid, subject_id, scheduled_date, type);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/reviews/:id', (req, res) => {
    const uid = getUserId(req);
    db.prepare('UPDATE reviews SET status=? WHERE id=? AND user_id=?').run(req.body.status, req.params.id, uid);
    res.json({ success: true });
  });

  // ── Goals ────────────────────────────────────────────────────
  app.get('/api/goals', (req, res) => {
    const uid = getUserId(req);
    res.json(db.prepare('SELECT * FROM goals WHERE user_id=?').all(uid));
  });

  app.post('/api/goals', (req, res) => {
    const uid = getUserId(req);
    const { type, target_hours, period } = req.body;
    const info = db.prepare('INSERT OR REPLACE INTO goals (user_id,type,target_hours,period) VALUES (?,?,?,?)').run(uid, type, target_hours, period);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/goals/:id', (req, res) => {
    const uid = getUserId(req);
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE goals SET ${fields} WHERE id=? AND user_id=?`).run(...Object.values(updates), req.params.id, uid);
    res.json({ success: true });
  });

  // ── Preferences ──────────────────────────────────────────────
  app.get('/api/preferences', (req, res) => {
    const uid = getUserId(req);
    const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id=?').all(uid) as any[];
    res.json(prefs.reduce((acc, curr) => { acc[curr.key] = JSON.parse(curr.value); return acc; }, {} as Record<string, any>));
  });

  app.post('/api/preferences', (req, res) => {
    const uid = getUserId(req);
    const { key, value } = req.body;
    db.prepare('INSERT OR REPLACE INTO user_preferences (user_id,key,value) VALUES (?,?,?)').run(uid, key, JSON.stringify(value));
    res.json({ success: true });
  });

  // ── Drafts ───────────────────────────────────────────────────
  app.get('/api/drafts', (req, res) => {
    const uid = getUserId(req);
    const drafts = db.prepare('SELECT * FROM drafts WHERE user_id=?').all(uid) as any[];
    res.json(drafts.map(d => ({ ...d, payload: JSON.parse(d.payload) })));
  });

  app.post('/api/drafts', (req, res) => {
    const uid = getUserId(req);
    const { type, reference_id, payload } = req.body;
    db.prepare('INSERT OR REPLACE INTO drafts (user_id,type,reference_id,payload) VALUES (?,?,?,?)').run(uid, type, reference_id || null, JSON.stringify(payload));
    res.json({ success: true });
  });

  app.delete('/api/drafts/:type', (req, res) => {
    const uid = getUserId(req);
    const { reference_id } = req.query;
    if (reference_id) {
      db.prepare('DELETE FROM drafts WHERE user_id=? AND type=? AND reference_id=?').run(uid, req.params.type, reference_id);
    } else {
      db.prepare('DELETE FROM drafts WHERE user_id=? AND type=?').run(uid, req.params.type);
    }
    res.json({ success: true });
  });

  // ── Stats ────────────────────────────────────────────────────
  app.get('/api/stats/summary', (req, res) => {
    const uid = getUserId(req);
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = db.prepare(`SELECT SUM(duration) as total_duration FROM sessions WHERE user_id=? AND date LIKE ?`).get(uid, `${today}%`) as any;
    const dailyGoal = db.prepare(`SELECT target_hours FROM goals WHERE user_id=? AND type='daily' AND period=?`).get(uid, today) as any;
    const recentSessions = db.prepare(`
      SELECT s.*, sub.name as subject_name, sub.color as subject_color 
      FROM sessions s JOIN subjects sub ON s.subject_id = sub.id 
      WHERE s.user_id=? ORDER BY s.date DESC LIMIT 5
    `).all(uid);
    const pendingReviews = db.prepare(`SELECT COUNT(*) as count FROM reviews WHERE user_id=? AND status='pending' AND scheduled_date <= ?`).get(uid, new Date().toISOString()) as any;
    res.json({
      today_duration: todaySessions.total_duration || 0,
      daily_goal: dailyGoal ? dailyGoal.target_hours : 0,
      recent_sessions: recentSessions,
      pending_reviews_count: pendingReviews.count
    });
  });

  // ── Vite / Static ────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    // Serve arquivos estáticos do build
    app.use(express.static(path.join(__dirname, 'dist')));

    // CORREÇÃO: fallback para o React Router — qualquer rota retorna o index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
