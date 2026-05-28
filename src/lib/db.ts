import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'training_eval.db');
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT    NOT NULL,
      code TEXT    UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trainings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      full_name   TEXT,
      category_id INTEGER REFERENCES categories(id),
      has_nr11    INTEGER DEFAULT 0,
      has_nr12    INTEGER DEFAULT 0,
      has_lockout INTEGER DEFAULT 0,
      has_height  INTEGER DEFAULT 0,
      has_confined INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS questions (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      text     TEXT NOT NULL,
      type     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS training_questions (
      training_id INTEGER REFERENCES trainings(id),
      question_id INTEGER REFERENCES questions(id),
      sort_order  INTEGER DEFAULT 0,
      PRIMARY KEY (training_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS units (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      region      TEXT,
      directorship TEXT,
      branch      TEXT
    );

    CREATE TABLE IF NOT EXISTS employees (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      registration   TEXT,
      unit_id        INTEGER REFERENCES units(id),
      position       TEXT,
      section        TEXT,
      function_code  TEXT,
      admission_date TEXT,
      employment_type TEXT
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      evaluator_email TEXT NOT NULL,
      evaluator_name  TEXT,
      evaluation_date TEXT NOT NULL,
      training_date   TEXT NOT NULL,
      training_id     INTEGER REFERENCES trainings(id),
      unit_id         INTEGER REFERENCES units(id),
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS eval_collaborators (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      evaluation_id   INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
      employee_id     INTEGER REFERENCES employees(id),
      employee_name   TEXT NOT NULL,
      desired_level   TEXT NOT NULL,
      achieved_level  TEXT,
      total_questions INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      percentage      REAL    DEFAULT 0,
      gap             REAL    DEFAULT 0,
      is_effective    INTEGER DEFAULT 1,
      ineffective_reason TEXT,
      has_height_work INTEGER DEFAULT 0,
      has_confined_work INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS eval_answers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      collaborator_id INTEGER REFERENCES eval_collaborators(id) ON DELETE CASCADE,
      question_id     INTEGER REFERENCES questions(id),
      question_text   TEXT NOT NULL,
      answer          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seed_done (
      id INTEGER PRIMARY KEY,
      done INTEGER DEFAULT 0
    );
  `);
}
