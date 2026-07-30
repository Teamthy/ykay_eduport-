/**
 * Offline persistence (expo-sqlite).
 * Two tables: response cache (reads) + write queue (pending mutations).
 */
import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("ykay_offline.db");
      await db.execAsync(`
        PRAGMA journal_mode = 'WAL';
        CREATE TABLE IF NOT EXISTS cache (
          url TEXT PRIMARY KEY,
          body TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          body TEXT,
          createdAt INTEGER NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function setCache(url: string, body: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO cache (url, body, updatedAt) VALUES (?, ?, ?)",
    url,
    JSON.stringify(body),
    Date.now(),
  );
}

export async function getCache<T = unknown>(url: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ body: string }>("SELECT body FROM cache WHERE url = ?", url);
  return row ? (JSON.parse(row.body) as T) : null;
}

export async function addQueue(method: string, path: string, body: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO queue (method, path, body, createdAt) VALUES (?, ?, ?, ?)",
    method,
    path,
    body == null ? null : JSON.stringify(body),
    Date.now(),
  );
}

export async function getQueue(): Promise<
  { id: number; method: string; path: string; body: string | null }[]
> {
  const db = await getDb();
  return db.getAllAsync<{ id: number; method: string; path: string; body: string | null }>(
    "SELECT * FROM queue ORDER BY createdAt ASC",
  );
}

export async function removeQueue(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM queue WHERE id = ?", id);
}

export async function queueCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) AS c FROM queue");
  return row?.c ?? 0;
}
