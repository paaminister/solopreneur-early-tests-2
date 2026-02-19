import Database from "better-sqlite3";
import path from "path";
import { DEMO_USER_ID } from "@/lib/constants";

const DB_PATH = path.join(process.cwd(), "lkr.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '${DEMO_USER_ID}',
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      date TEXT NOT NULL,
      fiscal_year INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      category TEXT NOT NULL,
      description TEXT,
      receipt_id INTEGER,
      bank_ref TEXT,
      reconciled INTEGER DEFAULT 0,
      voucher_type TEXT CHECK(voucher_type IN ('receipt', 'bank_statement', 'settlement', 'e_invoice', 'manual', 'none')) DEFAULT 'none',
      settlement_id INTEGER REFERENCES settlements(id),
      depreciation_years INTEGER,
      depreciation_remaining_cents INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '${DEMO_USER_ID}',
      filename TEXT NOT NULL,
      ocr_result TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '${DEMO_USER_ID}',
      date TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      description TEXT,
      counterpart TEXT,
      reference TEXT,
      matched_transaction_id INTEGER REFERENCES transactions(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '${DEMO_USER_ID}',
      clinic TEXT NOT NULL,
      period TEXT NOT NULL,
      gross_cents INTEGER NOT NULL,
      commission_cents INTEGER NOT NULL,
      net_cents INTEGER NOT NULL,
      raw_parse TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ennakkovero_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '${DEMO_USER_ID}',
      year INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      paid INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tax_card (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '${DEMO_USER_ID}',
      year INTEGER NOT NULL,
      card_type TEXT NOT NULL CHECK(card_type IN ('main', 'secondary', 'entrepreneur')),
      base_rate_pct REAL NOT NULL,
      additional_rate_pct REAL,
      income_limit_cents INTEGER,
      in_ennakkoperintarekisteri INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT NOT NULL,
      table_name TEXT NOT NULL,
      response_body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (key, table_name)
    );

    -- Index for fiscal year scoping (most common query pattern)
    CREATE INDEX IF NOT EXISTS idx_transactions_fiscal_year
      ON transactions(user_id, fiscal_year, deleted_at);

    -- Index for bank reconciliation matching
    CREATE INDEX IF NOT EXISTS idx_bank_tx_matching
      ON bank_transactions(user_id, amount_cents, date);
  `);

  // Seed if empty
  const count = db.prepare("SELECT COUNT(*) as c FROM transactions").get() as { c: number };
  if (count.c === 0) {
    seed(db);
  }
}

function seed(db: Database.Database) {
  const insertTx = db.prepare(
    "INSERT INTO transactions (user_id, type, date, fiscal_year, amount_cents, category, description, reconciled, voucher_type, settlement_id, depreciation_years, depreciation_remaining_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertBank = db.prepare(
    "INSERT INTO bank_transactions (user_id, date, amount_cents, description, counterpart, reference) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertSettlement = db.prepare(
    "INSERT INTO settlements (user_id, clinic, period, gross_cents, commission_cents, net_cents, raw_parse) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertEnnakkovero = db.prepare(
    "INSERT INTO ennakkovero_schedule (user_id, year, due_date, amount_cents, paid) VALUES (?, ?, ?, ?, ?)"
  );
  const insertTaxCard = db.prepare(
    "INSERT INTO tax_card (user_id, year, card_type, base_rate_pct, additional_rate_pct, income_limit_cents, in_ennakkoperintarekisteri, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const uid = DEMO_USER_ID;
  const fy = 2026;

  const seedAll = db.transaction(() => {
    // -- Settlement (Mehilainen January) -- inserted first so we can link transactions
    const settlementResult = insertSettlement.run(
      uid,
      "Mehilainen",
      "2026-01",
      1000000,  // gross EUR 10,000
      250000,   // commission EUR 2,500 (25%)
      750000,   // net EUR 7,500
      JSON.stringify({
        visits: 45,
        avg_fee: 22222,
        commission_pct: 25,
        period_start: "2026-01-01",
        period_end: "2026-01-31",
      })
    );
    const settlementId = Number(settlementResult.lastInsertRowid);

    // -- Income: clinic settlements (net deposits) -- linked to settlement
    insertTx.run(uid, "income", "2026-01-31", fy, 750000, "clinic_income", "Mehilainen tilitys tammikuu (net)", 1, "settlement", settlementId, null, null);
    insertTx.run(uid, "income", "2026-02-28", fy, 820000, "clinic_income", "Mehilainen tilitys helmikuu", 1, "settlement", null, null, null);
    insertTx.run(uid, "income", "2026-01-31", fy, 480000, "clinic_income", "Terveystalo tilitys tammikuu", 1, "settlement", null, null, null);

    // -- Expenses --
    insertTx.run(uid, "expense", "2026-01-15", fy, 45000, "yel", "YEL-vakuutusmaksu tammikuu", 1, "bank_statement", null, null, null);
    insertTx.run(uid, "expense", "2026-02-15", fy, 45000, "yel", "YEL-vakuutusmaksu helmikuu", 1, "bank_statement", null, null, null);
    insertTx.run(uid, "expense", "2026-01-10", fy, 8500, "potilasvakuutus", "Potilasvakuutus Q1", 1, "e_invoice", null, null, null);
    insertTx.run(uid, "expense", "2026-01-05", fy, 4200, "laakariliitto", "Laakariliitto jasenm.", 1, "e_invoice", null, null, null);

    // MacBook Pro: > EUR 1,200 → depreciated over 3 years (25% reducing balance per Finnish rules)
    insertTx.run(uid, "expense", "2026-01-20", fy, 125500, "laitteet", "MacBook Pro (sis. ALV 25.5%) - poisto 3v", 0, "receipt", null, 3, 94125);

    insertTx.run(uid, "expense", "2026-02-10", fy, 3500, "taydennyskoulutus", "CME-kurssi Helsinki", 1, "receipt", null, null, null);
    insertTx.run(uid, "expense", "2026-02-05", fy, 1200, "ammattikirjallisuus", "Duodecim-tilaus", 1, "e_invoice", null, null, null);
    insertTx.run(uid, "expense", "2026-01-01", fy, 1150, "tyohuonevahennys", "Tyohuonevahennys tammikuu", 0, "none", null, null, null);
    insertTx.run(uid, "expense", "2026-02-01", fy, 1150, "tyohuonevahennys", "Tyohuonevahennys helmikuu", 0, "none", null, null, null);

    // -- Bank transactions (mock PSD2 import) --
    insertBank.run(uid, "2026-01-31", 750000, "MEHILAINEN OY TILITYS", "Mehilainen Oy", "RF12345678");
    insertBank.run(uid, "2026-01-31", 480000, "TERVEYSTALO OYJ TILITYS", "Terveystalo Oyj", "RF23456789");
    insertBank.run(uid, "2026-02-28", 820000, "MEHILAINEN OY TILITYS", "Mehilainen Oy", "RF34567890");
    insertBank.run(uid, "2026-01-15", -45000, "YEL VARMA", "Varma", "YEL-2026-01");
    insertBank.run(uid, "2026-02-15", -45000, "YEL VARMA", "Varma", "YEL-2026-02");
    insertBank.run(uid, "2026-01-20", -125500, "APPLE STORE", "Apple Oy", null);
    insertBank.run(uid, "2026-01-05", -4200, "LAAKARILIITTO RY", "Laakariliitto", "JASEN-2026");

    // -- Ennakkovero schedule (6 bi-monthly installments for 2026) --
    insertEnnakkovero.run(uid, 2026, "2026-02-23", 667000, 1);
    insertEnnakkovero.run(uid, 2026, "2026-04-23", 667000, 0);
    insertEnnakkovero.run(uid, 2026, "2026-06-23", 667000, 0);
    insertEnnakkovero.run(uid, 2026, "2026-08-23", 667000, 0);
    insertEnnakkovero.run(uid, 2026, "2026-10-23", 667000, 0);
    insertEnnakkovero.run(uid, 2026, "2026-12-23", 665000, 0);

    // -- Tax card (verokortti) --
    insertTaxCard.run(
      uid, 2026, "entrepreneur", 25.0, 45.0, 12000000, 1,
      "Yrittajan verokortti 2026. Perusprosentti 25%, lisaprosentti 45% yli EUR 120,000 tuloista."
    );
  });

  seedAll();
}
