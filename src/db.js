'use strict';
// Database layer with two interchangeable backends:
//  1. node:sqlite (built into Node >= 22.13) — fastest, used when available.
//  2. sql.js (SQLite compiled to WebAssembly) — pure JS fallback for older Node
//     versions or hosts that disable experimental modules. Persists to the same file.
// Both expose the same tiny API: q.get / q.all / q.run / exec, plus tx().
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  country TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'investor' CHECK (role IN ('investor','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  kyc_status TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none','pending','verified','rejected')),
  kyc_data TEXT DEFAULT '{}',
  kyc_note TEXT DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'en',
  balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT, ua TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title_en TEXT NOT NULL, title_fr TEXT NOT NULL,
  summary_en TEXT NOT NULL DEFAULT '', summary_fr TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '', description_fr TEXT NOT NULL DEFAULT '',
  highlights_en TEXT NOT NULL DEFAULT '[]', highlights_fr TEXT NOT NULL DEFAULT '[]',
  city TEXT NOT NULL DEFAULT '', region TEXT NOT NULL DEFAULT '', country_code TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'USD',
  goal_local INTEGER NOT NULL,
  goal_usd INTEGER NOT NULL,
  offline_raised_usd INTEGER NOT NULL DEFAULT 0,
  target_rate REAL,
  target_multiple REAL,
  term_months INTEGER NOT NULL,
  payout_freq TEXT NOT NULL DEFAULT 'monthly',
  risk INTEGER NOT NULL DEFAULT 3 CHECK (risk BETWEEN 1 AND 5),
  min_usd INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','funded','closed')),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_cat ON assets(category, status);
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  pay_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','cancelled','expired','completed')),
  note TEXT DEFAULT '',
  paid_out_cents INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_res_user ON reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_res_asset ON reservations(asset_id, status);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','payout','withdrawal','refund','adjustment')),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','rejected')),
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  method TEXT DEFAULT '',
  details TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at);
CREATE TABLE IF NOT EXISTS watchlist (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, asset_id)
);
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT DEFAULT '', company TEXT DEFAULT '',
  type TEXT NOT NULL, city TEXT DEFAULT '', need TEXT DEFAULT '', description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','accepted','declined')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT DEFAULT '', body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY COLLATE NOCASE, lang TEXT DEFAULT 'en', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, body TEXT DEFAULT '', link TEXT DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER, action TEXT NOT NULL, target TEXT DEFAULT '', details TEXT DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payout_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week TEXT NOT NULL UNIQUE, actor_id INTEGER, total_cents INTEGER NOT NULL, count INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

let impl = null;
let backend = 'none';

function openNodeSqlite() {
  // Silence the one-time "SQLite is an experimental feature" warning.
  const orig = process.emitWarning;
  process.emitWarning = function (w, ...rest) {
    const msg = typeof w === 'string' ? w : w && w.message;
    if (msg && /SQLite/i.test(msg)) return;
    return orig.call(process, w, ...rest);
  };
  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); } finally { process.emitWarning = orig; }
  const db = new DatabaseSync(config.dbFile);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const cache = new Map();
  const stmt = (sql) => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
  return {
    exec: (sql) => db.exec(sql),
    get: (sql, p) => stmt(sql).get(...p),
    all: (sql, p) => stmt(sql).all(...p),
    run: (sql, p) => { const r = stmt(sql).run(...p); return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }; },
    close: () => db.close(),
  };
}

async function openSqlJs() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const file = config.dbFile;
  const onDisk = file !== ':memory:';
  const db = new SQL.Database(onDisk && fs.existsSync(file) ? fs.readFileSync(file) : undefined);
  db.exec('PRAGMA foreign_keys = ON;');
  let inTx = false;
  const persist = () => {
    if (!onDisk) return;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(db.export()));
    fs.renameSync(tmp, file); // atomic replace
  };
  const norm = (p) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v));
  const withStmt = (sql, p, fn) => {
    const s = db.prepare(sql);
    try { if (p.length) s.bind(norm(p)); return fn(s); } finally { s.free(); }
  };
  return {
    exec: (sql) => {
      const t = sql.trim().toUpperCase();
      db.exec(sql);
      if (t.startsWith('BEGIN')) inTx = true;
      else if (t.startsWith('COMMIT')) { inTx = false; persist(); }
      else if (t.startsWith('ROLLBACK')) inTx = false;
      else if (!inTx) persist();
    },
    get: (sql, p) => withStmt(sql, p, (s) => (s.step() ? s.getAsObject() : undefined)),
    all: (sql, p) => withStmt(sql, p, (s) => { const out = []; while (s.step()) out.push(s.getAsObject()); return out; }),
    run: (sql, p) => {
      withStmt(sql, p, (s) => { s.step(); });
      const changes = db.getRowsModified();
      const row = db.exec('SELECT last_insert_rowid() AS id');
      const lastInsertRowid = row.length ? Number(row[0].values[0][0]) : 0;
      if (!inTx) persist();
      return { changes, lastInsertRowid };
    },
    close: () => { try { persist(); } finally { db.close(); } },
  };
}

// Must be awaited once before the app is loaded.
async function init() {
  if (impl) return backend;
  if (config.dbFile !== ':memory:') fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
  if (process.env.DB_BACKEND !== 'sqljs') {
    try { impl = openNodeSqlite(); backend = 'node:sqlite'; } catch (e) { impl = null; }
  }
  if (!impl) { impl = await openSqlJs(); backend = 'sql.js'; }
  impl.exec(SCHEMA);
  ensureSecret();
  return backend;
}

// Without SESSION_SECRET, generate one once and keep it in the database so
// form tokens survive restarts instead of crashing the app.
function ensureSecret() {
  if (config.secret) return;
  let row = impl.get("SELECT value FROM settings WHERE key = 'secret'", []);
  if (!row) {
    const v = crypto.randomBytes(48).toString('base64url');
    impl.run("INSERT INTO settings (key, value) VALUES ('secret', ?)", [v]);
    row = { value: v };
    console.warn('[config] SESSION_SECRET not set; generated one and stored it in the database.');
  }
  config.secret = row.value;
}

const need = () => { if (!impl) throw new Error('Database not initialised: await db.init() before loading the app.'); return impl; };
const q = {
  get: (sql, ...p) => need().get(sql, p),
  all: (sql, ...p) => need().all(sql, p),
  run: (sql, ...p) => need().run(sql, p),
};

// Run fn inside a transaction; nested calls join the outer one.
let depth = 0;
function tx(fn) {
  if (depth > 0) return fn();
  depth++;
  need().exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    impl.exec('COMMIT');
    return r;
  } catch (e) {
    impl.exec('ROLLBACK');
    throw e;
  } finally {
    depth--;
  }
}

const now = () => Date.now();
const db = { close: () => impl && impl.close(), get backend() { return backend; } };

module.exports = { db, q, tx, now, init };
