import Database from 'better-sqlite3';
import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';

export interface DbClient {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<{ lastInsertRowid: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T>;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toPg(sql: string): string {
  let i = 0;
  return sql
    .replace(/\?/g, () => `$${++i}`)
    .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
}

function insertNeedsId(sql: string): boolean {
  const t = sql.trim().toUpperCase();
  return (
    t.startsWith('INSERT') &&
    !t.includes('TRAINING_QUESTIONS') &&
    !t.includes('SEED_DONE')
  );
}

// ─── SQLite client ─────────────────────────────────────────────────────────────

class SqliteClient implements DbClient {
  constructor(private db: Database.Database) {}

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(params as never) as T[];
  }
  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(params as never) as T | undefined;
  }
  async run(sql: string, params: unknown[] = []): Promise<{ lastInsertRowid: number }> {
    const r = this.db.prepare(sql).run(params as never);
    return { lastInsertRowid: r.lastInsertRowid as number };
  }
  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
  async transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }
}

// ─── PostgreSQL client ────────────────────────────────────────────────────────

type Queryable = {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
};

class PgRunner implements DbClient {
  constructor(private qr: Queryable, private pool?: Pool) {}

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const r = await this.qr.query(toPg(sql), params);
    return r.rows as T[];
  }
  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const r = await this.qr.query(toPg(sql), params);
    return r.rows[0] as T | undefined;
  }
  async run(sql: string, params: unknown[] = []): Promise<{ lastInsertRowid: number }> {
    const pgSql = toPg(sql);
    const finalSql = insertNeedsId(sql) ? `${pgSql} RETURNING id` : pgSql;
    const r = await this.qr.query(finalSql, params);
    return { lastInsertRowid: (r.rows[0] as { id?: number })?.id ?? 0 };
  }
  async exec(sql: string): Promise<void> {
    const stmts = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    for (const s of stmts) {
      await this.qr.query(toPg(s));
    }
  }
  async transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      // Already inside a transaction (using a PoolClient directly)
      return fn(this);
    }
    const client: PoolClient = await this.pool.connect();
    const txRunner = new PgRunner(client);
    try {
      await client.query('BEGIN');
      const result = await fn(txRunner);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    } finally {
      client.release();
    }
  }
}

// ─── schema ───────────────────────────────────────────────────────────────────

function initSqliteSchema(db: Database.Database): void {
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
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      type TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS action_plans (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      evaluation_id          INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
      eval_collaborator_id   INTEGER REFERENCES eval_collaborators(id),
      employee_name          TEXT,
      training_name          TEXT    NOT NULL,
      unit_id                INTEGER REFERENCES units(id),
      unit_name              TEXT    NOT NULL,
      gap_summary            TEXT,
      collaborators_with_gap INTEGER DEFAULT 0,
      avg_gap                REAL    DEFAULT 0,
      what                   TEXT NOT NULL,
      why                    TEXT,
      how                    TEXT NOT NULL,
      responsible            TEXT NOT NULL,
      due_date               TEXT NOT NULL,
      where_field            TEXT,
      resources              TEXT,
      status                 TEXT DEFAULT 'ABERTO',
      priority               TEXT DEFAULT 'MEDIA',
      notes                  TEXT,
      created_at             TEXT DEFAULT (datetime('now')),
      updated_at             TEXT DEFAULT (datetime('now'))
    );
  `);

  // Cleanup invalid unit names from HC imports
  db.exec(`
    UPDATE employees SET unit_id = NULL
    WHERE unit_id IN (SELECT id FROM units WHERE TRIM(name) IN ('-','','—'));
    DELETE FROM units WHERE TRIM(name) IN ('-','','—');
  `);

  // Migrations for existing databases
  try { db.exec('ALTER TABLE action_plans ADD COLUMN eval_collaborator_id INTEGER REFERENCES eval_collaborators(id)'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE action_plans ADD COLUMN employee_name TEXT'); } catch { /* already exists */ }

  // Remove T.F category prefixes from training names
  try {
    db.exec(`
      UPDATE trainings SET
        name = REPLACE(REPLACE(REPLACE(REPLACE(name,
          'T.F Produção | ',  ''),
          'T.F Manutenção | ',''),
          'T.F GQ | ',        ''),
          'T.F CQ | ',        '')
      WHERE name LIKE 'T.F %'
    `);
    db.exec(`
      UPDATE trainings SET
        full_name = REPLACE(REPLACE(REPLACE(REPLACE(full_name,
          'T.F Produção | ',  ''),
          'T.F Manutenção | ',''),
          'T.F GQ | ',        ''),
          'T.F CQ | ',        '')
      WHERE full_name LIKE 'T.F %'
    `);
  } catch { /* ignore */ }
}

async function initPgSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id   SERIAL PRIMARY KEY,
        name TEXT   NOT NULL,
        code TEXT   UNIQUE NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS trainings (
        id           SERIAL PRIMARY KEY,
        name         TEXT NOT NULL,
        full_name    TEXT,
        category_id  INTEGER REFERENCES categories(id),
        has_nr11     INTEGER DEFAULT 0,
        has_nr12     INTEGER DEFAULT 0,
        has_lockout  INTEGER DEFAULT 0,
        has_height   INTEGER DEFAULT 0,
        has_confined INTEGER DEFAULT 0
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id   SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        type TEXT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_questions (
        training_id INTEGER REFERENCES trainings(id),
        question_id INTEGER REFERENCES questions(id),
        sort_order  INTEGER DEFAULT 0,
        PRIMARY KEY (training_id, question_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS units (
        id           SERIAL PRIMARY KEY,
        name         TEXT NOT NULL UNIQUE,
        region       TEXT,
        directorship TEXT,
        branch       TEXT
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id              SERIAL PRIMARY KEY,
        name            TEXT NOT NULL,
        registration    TEXT,
        unit_id         INTEGER REFERENCES units(id),
        position        TEXT,
        section         TEXT,
        function_code   TEXT,
        admission_date  TEXT,
        employment_type TEXT
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id              SERIAL PRIMARY KEY,
        evaluator_email TEXT NOT NULL,
        evaluator_name  TEXT,
        evaluation_date TEXT NOT NULL,
        training_date   TEXT NOT NULL,
        training_id     INTEGER REFERENCES trainings(id),
        unit_id         INTEGER REFERENCES units(id),
        created_at      TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS eval_collaborators (
        id                 SERIAL PRIMARY KEY,
        evaluation_id      INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
        employee_id        INTEGER REFERENCES employees(id),
        employee_name      TEXT NOT NULL,
        desired_level      TEXT NOT NULL,
        achieved_level     TEXT,
        total_questions    INTEGER DEFAULT 0,
        correct_answers    INTEGER DEFAULT 0,
        percentage         DOUBLE PRECISION DEFAULT 0,
        gap                DOUBLE PRECISION DEFAULT 0,
        is_effective       INTEGER DEFAULT 1,
        ineffective_reason TEXT,
        has_height_work    INTEGER DEFAULT 0,
        has_confined_work  INTEGER DEFAULT 0
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS eval_answers (
        id              SERIAL PRIMARY KEY,
        collaborator_id INTEGER REFERENCES eval_collaborators(id) ON DELETE CASCADE,
        question_id     INTEGER REFERENCES questions(id),
        question_text   TEXT NOT NULL,
        answer          TEXT NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS seed_done (
        id   INTEGER PRIMARY KEY,
        done INTEGER DEFAULT 0
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS action_plans (
        id                     SERIAL PRIMARY KEY,
        evaluation_id          INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        eval_collaborator_id   INTEGER REFERENCES eval_collaborators(id),
        employee_name          TEXT,
        training_name          TEXT NOT NULL,
        unit_id                INTEGER REFERENCES units(id),
        unit_name              TEXT NOT NULL,
        gap_summary            TEXT,
        collaborators_with_gap INTEGER DEFAULT 0,
        avg_gap                DOUBLE PRECISION DEFAULT 0,
        what                   TEXT NOT NULL,
        why                    TEXT,
        how                    TEXT NOT NULL,
        responsible            TEXT NOT NULL,
        due_date               TEXT NOT NULL,
        where_field            TEXT,
        resources              TEXT,
        status                 TEXT DEFAULT 'ABERTO',
        priority               TEXT DEFAULT 'MEDIA',
        notes                  TEXT,
        created_at             TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at             TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Remove T.F category prefixes from training names
    await client.query(`
      UPDATE trainings SET
        name = REPLACE(REPLACE(REPLACE(REPLACE(name,
          'T.F Produção | ',   ''),
          'T.F Manutenção | ', ''),
          'T.F GQ | ',         ''),
          'T.F CQ | ',         '')
      WHERE name LIKE 'T.F %'
    `);
    await client.query(`
      UPDATE trainings SET
        full_name = REPLACE(REPLACE(REPLACE(REPLACE(full_name,
          'T.F Produção | ',   ''),
          'T.F Manutenção | ', ''),
          'T.F GQ | ',         ''),
          'T.F CQ | ',         '')
      WHERE full_name LIKE 'T.F %'
    `);
  } finally {
    client.release();
  }
}

// ─── singleton ────────────────────────────────────────────────────────────────

let _client: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (_client) return _client;

  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await initPgSchema(pool);
    _client = new PgRunner(pool, pool);
  } else {
    const dataDir = process.env.DATA_DIR ||
      (process.env.NODE_ENV === 'production' ? '/data' : path.join(process.cwd(), 'data'));
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'training_eval.db');
    console.log(`[db] SQLite path: ${dbPath}`);
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    initSqliteSchema(sqlite);
    _client = new SqliteClient(sqlite);
  }

  return _client;
}
