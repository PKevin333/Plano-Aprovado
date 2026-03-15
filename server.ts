import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Banco de dados ───────────────────────────────────────────
// Em produção (Railway), usa o volume persistente montado em /data
// Em desenvolvimento, usa o arquivo local
const DB_DIR = process.env.NODE_ENV === 'production' ? '/data' : __dirname;
const DB_PATH = path.join(DB_DIR, 'academiaflow.db');

// Cria o diretório automaticamente se não existir
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('Diretório do banco criado: ' + DB_DIR);
}

const db = new Database(DB_PATH);

// Habilita WAL mode para melhor performance e segurança contra corrrupção
db.pragma('journal_mode = WAL');

// ── Criação das tabelas ──────────────────────────────────────
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

// ── Migrations ───────────────────────────────────────────────
const tables = ['objectives','subjects','user_preferences','drafts','topics','sessions','exercises','reviews','goals'];
for (const table of tables) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default'`);
    console.log(`Migration: added user_id to ${table}`);
  } catch (_) { /* coluna já existe */ }
}

for (const migration of [
  `CREATE TABLE IF NOT EXISTS drafts_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    type TEXT NOT NULL, reference_id INTEGER,
    payload TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type, reference_id)
  );
  INSERT OR IGNORE INTO drafts_v2 SELECT id,user_id,type,reference_id,payload,updated_at FROM drafts;
  DROP TABLE drafts;
  ALTER TABLE drafts_v2 RENAME TO drafts;`,

  `CREATE TABLE IF NOT EXISTS goals_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    type TEXT, target_hours REAL, period TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type, period)
  );
  INSERT OR IGNORE INTO goals_v2 SELECT id,user_id,type,target_hours,period,created_at FROM goals;
  DROP TABLE goals;
  ALTER TABLE goals_v2 RENAME TO goals;`,

  `CREATE TABLE IF NOT EXISTS user_preferences_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    key TEXT NOT NULL, value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key)
  );
  INSERT OR IGNORE INTO user_preferences_v2 SELECT id,user_id,key,value,updated_at FROM user_preferences;
  DROP TABLE user_preferences;
  ALTER TABLE user_preferences_v2 RENAME TO user_preferences;`
]) {
  try { db.exec(migration); } catch (_) { /* já migrado */ }
}

// ── Helpers ──────────────────────────────────────────────────
function getUserId(req: express.Request): string {
  const uid = (req.headers['x-user-id'] as string) || 'default';
  return uid.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64) || 'default';
}

// Valida e monta campos para UPDATE dinâmico
// Retorna null se não houver campos válidos
const BLOCKED_FIELDS = ['id', 'user_id', 'created_at'];
function buildUpdateFields(updates: Record<string, any>): { fields: string; values: any[] } | null {
  const safeKeys = Object.keys(updates).filter(k => /^[a-zA-Z_]+$/.test(k) && !BLOCKED_FIELDS.includes(k));
  if (safeKeys.length === 0) return null;
  return {
    fields: safeKeys.map(k => `${k} = ?`).join(', '),
    values: safeKeys.map(k => updates[k]),
  };
}

async function startServer() {
  const app = express();

  // ── Middlewares ───────────────────────────────────────────
  app.use(cors());
  app.use(express.json());

  // ── Objectives ───────────────────────────────────────────
  app.get('/api/objectives', (req, res) => {
    try {
      const uid = getUserId(req);
      res.json(db.prepare('SELECT * FROM objectives WHERE user_id = ?').all(uid));
    } catch (err: any) {
      console.error('GET /objectives:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/objectives', (req, res) => {
    try {
      const uid = getUserId(req);
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'name é obrigatório' });
      const info = db.prepare('INSERT INTO objectives (user_id,name,description) VALUES (?,?,?)').run(uid, name, description);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      console.error('POST /objectives:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Subjects ─────────────────────────────────────────────
  app.get('/api/subjects', (req, res) => {
    try {
      const uid = getUserId(req);
      res.json(db.prepare(`
        SELECT s.*, o.name as objective_name
        FROM subjects s LEFT JOIN objectives o ON s.objective_id = o.id
        WHERE s.user_id = ?
      `).all(uid));
    } catch (err: any) {
      console.error('GET /subjects:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/subjects', (req, res) => {
    try {
      const uid = getUserId(req);
      const { name, color, priority, difficulty, objective_id } = req.body;
      if (!name) return res.status(400).json({ error: 'name é obrigatório' });
      const info = db.prepare('INSERT INTO subjects (user_id,name,color,priority,difficulty,objective_id) VALUES (?,?,?,?,?,?)').run(uid, name, color, priority, difficulty, objective_id);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      console.error('POST /subjects:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/subjects/:id', (req, res) => {
    try {
      const uid = getUserId(req);
      const built = buildUpdateFields(req.body);
      if (!built) return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
      db.prepare(`UPDATE subjects SET ${built.fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(...built.values, req.params.id, uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('PATCH /subjects:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/subjects/:id', (req, res) => {
    try {
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
    } catch (err: any) {
      console.error('DELETE /subjects:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Topics ───────────────────────────────────────────────
  app.get('/api/topics', (req, res) => {
    try {
      const uid = getUserId(req);
      const { subject_id } = req.query;
      let q = 'SELECT t.*, s.name as subject_name FROM topics t JOIN subjects s ON t.subject_id = s.id WHERE t.user_id = ?';
      const params: any[] = [uid];
      if (subject_id) { q += ' AND t.subject_id = ?'; params.push(subject_id); }
      res.json(db.prepare(q).all(...params));
    } catch (err: any) {
      console.error('GET /topics:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/topics', (req, res) => {
    try {
      const uid = getUserId(req);
      const { subject_id, name, description } = req.body;
      if (!name || !subject_id) return res.status(400).json({ error: 'name e subject_id são obrigatórios' });
      const info = db.prepare('INSERT INTO topics (user_id,subject_id,name,description) VALUES (?,?,?,?)').run(uid, subject_id, name, description);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      console.error('POST /topics:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/topics/:id', (req, res) => {
    try {
      const uid = getUserId(req);
      const built = buildUpdateFields(req.body);
      if (!built) return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
      db.prepare(`UPDATE topics SET ${built.fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(...built.values, req.params.id, uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('PATCH /topics:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/topics/:id', (req, res) => {
    try {
      const uid = getUserId(req);
      db.prepare('DELETE FROM topics WHERE id=? AND user_id=?').run(req.params.id, uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('DELETE /topics:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Sessions ─────────────────────────────────────────────
  app.get('/api/sessions', (req, res) => {
    try {
      const uid = getUserId(req);
      res.json(db.prepare(`
        SELECT s.*, sub.name as subject_name, sub.color as subject_color, t.name as topic_name
        FROM sessions s
        JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN topics t ON s.topic_id = t.id
        WHERE s.user_id = ?
        ORDER BY s.date DESC
      `).all(uid));
    } catch (err: any) {
      console.error('GET /sessions:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sessions', (req, res) => {
    try {
      const uid = getUserId(req);
      const { subject_id, topic_id, duration, type, notes, date } = req.body;
      if (!subject_id) return res.status(400).json({ error: 'subject_id é obrigatório' });
      const info = db.prepare('INSERT INTO sessions (user_id,subject_id,topic_id,duration,type,notes,date) VALUES (?,?,?,?,?,?,?)').run(uid, subject_id, topic_id, duration, type, notes, date || new Date().toISOString());
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      console.error('POST /sessions:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/sessions/:id', (req, res) => {
    try {
      const uid = getUserId(req);
      const built = buildUpdateFields(req.body);
      if (!built) return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
      db.prepare(`UPDATE sessions SET ${built.fields} WHERE id = ? AND user_id = ?`).run(...built.values, req.params.id, uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('PATCH /sessions:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/sessions/:id', (req, res) => {
    try {
      const uid = getUserId(req);
      db.prepare('DELETE FROM sessions WHERE id=? AND user_id=?').run(req.params.id, uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('DELETE /sessions:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Exercises ────────────────────────────────────────────
  app.get('/api/exercises', (req, res) => {
    try {
      const uid = getUserId(req);
      res.json(db.prepare(`
        SELECT e.*, sub.name as subject_name, t.name as topic_name
        FROM exercises e
        JOIN subjects sub ON e.subject_id = sub.id
        LEFT JOIN topics t ON e.topic_id = t.id
        WHERE e.user_id = ?
        ORDER BY e.date DESC
      `).all(uid));
    } catch (err: any) {
      console.error('GET /exercises:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/exercises', (req, res) => {
    try {
      const uid = getUserId(req);
      const { subject_id, topic_id, total, correct, incorrect, notes, date } = req.body;
      if (!subject_id) return res.status(400).json({ error: 'subject_id é obrigatório' });
      const pct = total > 0 ? (correct / total) * 100 : 0;
      const info = db.prepare('INSERT INTO exercises (user_id,subject_id,topic_id,total,correct,incorrect,percent_correct,notes,date) VALUES (?,?,?,?,?,?,?,?,?)').run(uid, subject_id, topic_id, total, correct, incorrect, pct, notes, date || new Date().toISOString());
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      console.error('POST /exercises:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/exercises/:id', (req, res) => {
    try {
      const uid = getUserId(req);
      const updates = { ...req.body };
      if (updates.total !== undefined || updates.correct !== undefined) {
        const cur = db.prepare('SELECT total,correct FROM exercises WHERE id=? AND user_id=?').get(req.params.id, uid) as any;
        if (cur) {
          const total = updates.total ?? cur.total;
          const correct = updates.correct ?? cur.correct;
          updates.percent_correct = total > 0 ? (correct / total) * 100 : 0;
        }
      }
      const built = buildUpdateFields(updates);
      if (!built) return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
      db.prepare(`UPDATE exercises SET ${built.fields} WHERE id = ? AND user_id = ?`).run(...built.values, req.params.id, uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('PATCH /exercises:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Reviews ──────────────────────────────────────────────
  app.get('/api/reviews', (req, res) => {
    try {
      const uid = getUserId(req);
      res.json(db.prepare(`
        SELECT r.*, sub.name as subject_name, sub.color as subject_color
        FROM reviews r JOIN subjects sub ON r.subject_id = sub.id
        WHERE r.user_id = ?
        ORDER BY r.scheduled_date ASC
      `).all(uid));
    } catch (err: any) {
      console.error('GET /reviews:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/reviews', (req, res) => {
    try {
      const uid = getUserId(req);
      const { subject_id, scheduled_date, type } = req.body;
      if (!subject_id) return res.status(400).json({ error: 'subject_id é obrigatório' });
      const info = db.prepare('INSERT INTO reviews (user_id,subject_id,scheduled_date,type) VALUES (?,?,?,?)').run(uid, subject_id, scheduled_date, type);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      console.error('POST /reviews:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/reviews/:id', (req, res) => {
    try {
      const uid = getUserId(req);
      if (!req.body.status) return res.status(400).json({ error: 'status é obrigatório' });
      db.prepare('UPDATE reviews SET status=? WHERE id=? AND user_id=?').run(req.body.status, req.params.id, uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('PATCH /reviews:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Goals ────────────────────────────────────────────────
  app.get('/api/goals', (req, res) => {
    try {
      const uid = getUserId(req);
      res.json(db.prepare('SELECT * FROM goals WHERE user_id=?').all(uid));
    } catch (err: any) {
      console.error('GET /goals:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/goals', (req, res) => {
    try {
      const uid = getUserId(req);
      const { type, target_hours, period } = req.body;
      const info = db.prepare('INSERT OR REPLACE INTO goals (user_id,type,target_hours,period) VALUES (?,?,?,?)').run(uid, type, target_hours, period);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      console.error('POST /goals:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/goals/:id', (req, res) => {
    try {
      const uid = getUserId(req);
      const built = buildUpdateFields(req.body);
      if (!built) return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
      db.prepare(`UPDATE goals SET ${built.fields} WHERE id=? AND user_id=?`).run(...built.values, req.params.id, uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('PATCH /goals:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Preferences ──────────────────────────────────────────
  app.get('/api/preferences', (req, res) => {
    try {
      const uid = getUserId(req);
      const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id=?').all(uid) as any[];
      res.json(prefs.reduce((acc, curr) => {
        try { acc[curr.key] = JSON.parse(curr.value); } catch { acc[curr.key] = curr.value; }
        return acc;
      }, {} as Record<string, any>));
    } catch (err: any) {
      console.error('GET /preferences:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/preferences', (req, res) => {
    try {
      const uid = getUserId(req);
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key é obrigatório' });
      db.prepare('INSERT OR REPLACE INTO user_preferences (user_id,key,value) VALUES (?,?,?)').run(uid, key, JSON.stringify(value));
      res.json({ success: true });
    } catch (err: any) {
      console.error('POST /preferences:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Drafts ───────────────────────────────────────────────
  app.get('/api/drafts', (req, res) => {
    try {
      const uid = getUserId(req);
      const drafts = db.prepare('SELECT * FROM drafts WHERE user_id=?').all(uid) as any[];
      res.json(drafts.map(d => {
        try { return { ...d, payload: JSON.parse(d.payload) }; } catch { return d; }
      }));
    } catch (err: any) {
      console.error('GET /drafts:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/drafts', (req, res) => {
    try {
      const uid = getUserId(req);
      const { type, reference_id, payload } = req.body;
      if (!type || payload === undefined) return res.status(400).json({ error: 'type e payload são obrigatórios' });
      db.prepare('INSERT OR REPLACE INTO drafts (user_id,type,reference_id,payload) VALUES (?,?,?,?)').run(uid, type, reference_id || null, JSON.stringify(payload));
      res.json({ success: true });
    } catch (err: any) {
      console.error('POST /drafts:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/drafts/:type', (req, res) => {
    try {
      const uid = getUserId(req);
      const { reference_id } = req.query;
      if (reference_id) {
        db.prepare('DELETE FROM drafts WHERE user_id=? AND type=? AND reference_id=?').run(uid, req.params.type, reference_id);
      } else {
        db.prepare('DELETE FROM drafts WHERE user_id=? AND type=?').run(uid, req.params.type);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('DELETE /drafts:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Stats ────────────────────────────────────────────────
  app.get('/api/stats/summary', (req, res) => {
    try {
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
        today_duration: todaySessions?.total_duration || 0,
        daily_goal: dailyGoal ? dailyGoal.target_hours : 0,
        recent_sessions: recentSessions,
        pending_reviews_count: pendingReviews?.count || 0,
      });
    } catch (err: any) {
      console.error('GET /stats/summary:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Frontend (Vite / Static) ─────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(PORT, '0.0.0.0', () => console.log(`Servidor rodando em http://localhost:${PORT}`));
}

startServer().catch(err => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
