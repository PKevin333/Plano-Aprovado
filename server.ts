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
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    reference_id INTEGER,
    payload TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, reference_id)
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    topic_id INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER, -- in minutes
    type TEXT, -- theory, revision, exercises, etc.
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    subject_id INTEGER NOT NULL,
    scheduled_date TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed, overdue
    type TEXT, -- 24h, 7d, 30d
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, -- daily, weekly, monthly
    target_hours REAL,
    period TEXT, -- YYYY-MM-DD for daily, YYYY-WW for weekly
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, period)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // Objectives
  app.get('/api/objectives', (req, res) => {
    const objectives = db.prepare('SELECT * FROM objectives').all();
    res.json(objectives);
  });

  app.post('/api/objectives', (req, res) => {
    const { name, description } = req.body;
    const info = db.prepare('INSERT INTO objectives (name, description) VALUES (?, ?)').run(name, description);
    res.json({ id: info.lastInsertRowid });
  });

  // Subjects
  app.get('/api/subjects', (req, res) => {
    const subjects = db.prepare(`
      SELECT s.*, o.name as objective_name 
      FROM subjects s 
      LEFT JOIN objectives o ON s.objective_id = o.id
    `).all();
    res.json(subjects);
  });

  app.post('/api/subjects', (req, res) => {
    const { name, color, priority, difficulty, objective_id } = req.body;
    const info = db.prepare('INSERT INTO subjects (name, color, priority, difficulty, objective_id) VALUES (?, ?, ?, ?, ?)').run(name, color, priority, difficulty, objective_id);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/subjects/:id', (req, res) => {
    const updates = req.body;
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE subjects SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
    res.json({ success: true });
  });

  // DELETE subject — cascata completa
  app.delete('/api/subjects/:id', (req, res) => {
    const id = req.params.id;
    const deleteAll = db.transaction(() => {
      db.prepare('DELETE FROM reviews  WHERE subject_id = ?').run(id);
      db.prepare('DELETE FROM exercises WHERE subject_id = ?').run(id);
      db.prepare('DELETE FROM sessions  WHERE subject_id = ?').run(id);
      db.prepare('DELETE FROM topics    WHERE subject_id = ?').run(id);
      db.prepare('DELETE FROM subjects  WHERE id = ?').run(id);
    });
    deleteAll();
    res.json({ success: true });
  });

  // DELETE session individually (for history editing)
  app.delete('/api/sessions/:id', (req, res) => {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Topics
  app.get('/api/topics', (req, res) => {
    const { subject_id } = req.query;
    let query = 'SELECT t.*, s.name as subject_name FROM topics t JOIN subjects s ON t.subject_id = s.id';
    let params = [];
    if (subject_id) {
      query += ' WHERE t.subject_id = ?';
      params.push(subject_id);
    }
    const topics = db.prepare(query).all(...params);
    res.json(topics);
  });

  app.post('/api/topics', (req, res) => {
    const { subject_id, name, description } = req.body;
    const info = db.prepare('INSERT INTO topics (subject_id, name, description) VALUES (?, ?, ?)').run(subject_id, name, description);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/topics/:id', (req, res) => {
    const updates = req.body;
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE topics SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/topics/:id', (req, res) => {
    db.prepare('DELETE FROM topics WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Sessions
  app.get('/api/sessions', (req, res) => {
    const sessions = db.prepare(`
      SELECT s.*, sub.name as subject_name, sub.color as subject_color, t.name as topic_name 
      FROM sessions s 
      JOIN subjects sub ON s.subject_id = sub.id 
      LEFT JOIN topics t ON s.topic_id = t.id
      ORDER BY s.date DESC
    `).all();
    res.json(sessions);
  });

  app.post('/api/sessions', (req, res) => {
    const { subject_id, topic_id, duration, type, notes, date } = req.body;
    const info = db.prepare('INSERT INTO sessions (subject_id, topic_id, duration, type, notes, date) VALUES (?, ?, ?, ?, ?, ?)').run(subject_id, topic_id, duration, type, notes, date || new Date().toISOString());
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/sessions/:id', (req, res) => {
    const updates = req.body;
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE sessions SET ${fields} WHERE id = ?`).run(...values, req.params.id);
    res.json({ success: true });
  });

  // Exercises
  app.get('/api/exercises', (req, res) => {
    const exercises = db.prepare(`
      SELECT e.*, sub.name as subject_name, t.name as topic_name 
      FROM exercises e 
      JOIN subjects sub ON e.subject_id = sub.id 
      LEFT JOIN topics t ON e.topic_id = t.id
      ORDER BY e.date DESC
    `).all();
    res.json(exercises);
  });

  app.post('/api/exercises', (req, res) => {
    const { subject_id, topic_id, total, correct, incorrect, notes, date } = req.body;
    const percent_correct = total > 0 ? (correct / total) * 100 : 0;
    const info = db.prepare('INSERT INTO exercises (subject_id, topic_id, total, correct, incorrect, percent_correct, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(subject_id, topic_id, total, correct, incorrect, percent_correct, notes, date || new Date().toISOString());
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/exercises/:id', (req, res) => {
    const updates = req.body;
    if (updates.total !== undefined || updates.correct !== undefined) {
      const current = db.prepare('SELECT total, correct FROM exercises WHERE id = ?').get(req.params.id);
      const total = updates.total !== undefined ? updates.total : current.total;
      const correct = updates.correct !== undefined ? updates.correct : current.correct;
      updates.percent_correct = total > 0 ? (correct / total) * 100 : 0;
    }
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE exercises SET ${fields} WHERE id = ?`).run(...values, req.params.id);
    res.json({ success: true });
  });

  // Reviews
  app.get('/api/reviews', (req, res) => {
    const reviews = db.prepare(`
      SELECT r.*, sub.name as subject_name, sub.color as subject_color 
      FROM reviews r 
      JOIN subjects sub ON r.subject_id = sub.id 
      ORDER BY r.scheduled_date ASC
    `).all();
    res.json(reviews);
  });

  app.post('/api/reviews', (req, res) => {
    const { subject_id, scheduled_date, type } = req.body;
    const info = db.prepare('INSERT INTO reviews (subject_id, scheduled_date, type) VALUES (?, ?, ?)')
      .run(subject_id, scheduled_date, type);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/reviews/:id', (req, res) => {
    const { status } = req.body;
    db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  // Goals
  app.get('/api/goals', (req, res) => {
    const goals = db.prepare('SELECT * FROM goals').all();
    res.json(goals);
  });

  app.post('/api/goals', (req, res) => {
    const { type, target_hours, period } = req.body;
    const info = db.prepare('INSERT OR REPLACE INTO goals (type, target_hours, period) VALUES (?, ?, ?)').run(type, target_hours, period);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch('/api/goals/:id', (req, res) => {
    const updates = req.body;
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE goals SET ${fields} WHERE id = ?`).run(...values, req.params.id);
    res.json({ success: true });
  });

  // Preferences
  app.get('/api/preferences', (req, res) => {
    const prefs = db.prepare('SELECT * FROM user_preferences').all();
    const result = prefs.reduce((acc, curr) => {
      acc[curr.key] = JSON.parse(curr.value);
      return acc;
    }, {});
    res.json(result);
  });

  app.post('/api/preferences', (req, res) => {
    const { key, value } = req.body;
    db.prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
    res.json({ success: true });
  });

  // Drafts
  app.get('/api/drafts', (req, res) => {
    const drafts = db.prepare('SELECT * FROM drafts').all();
    const result = drafts.map(d => ({ ...d, payload: JSON.parse(d.payload) }));
    res.json(result);
  });

  app.post('/api/drafts', (req, res) => {
    const { type, reference_id, payload } = req.body;
    db.prepare('INSERT OR REPLACE INTO drafts (type, reference_id, payload) VALUES (?, ?, ?)').run(type, reference_id || null, JSON.stringify(payload));
    res.json({ success: true });
  });

  app.delete('/api/drafts/:type', (req, res) => {
    const { reference_id } = req.query;
    if (reference_id) {
      db.prepare('DELETE FROM drafts WHERE type = ? AND reference_id = ?').run(req.params.type, reference_id);
    } else {
      db.prepare('DELETE FROM drafts WHERE type = ?').run(req.params.type);
    }
    res.json({ success: true });
  });

  // Dashboard Stats
  app.get('/api/stats/summary', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    const todaySessions = db.prepare(`
      SELECT SUM(duration) as total_duration 
      FROM sessions 
      WHERE date LIKE ?
    `).get(`${today}%`);

    const dailyGoal = db.prepare(`
      SELECT target_hours FROM goals WHERE type = 'daily' AND period = ?
    `).get(today);

    const recentSessions = db.prepare(`
      SELECT s.*, sub.name as subject_name, sub.color as subject_color 
      FROM sessions s 
      JOIN subjects sub ON s.subject_id = sub.id 
      ORDER BY s.date DESC LIMIT 5
    `).all();

    const pendingReviews = db.prepare(`
      SELECT COUNT(*) as count FROM reviews WHERE status = 'pending' AND scheduled_date <= ?
    `).get(new Date().toISOString());

    res.json({
      today_duration: todaySessions.total_duration || 0,
      daily_goal: dailyGoal ? dailyGoal.target_hours : 0,
      recent_sessions: recentSessions,
      pending_reviews_count: pendingReviews.count
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
