/**
 * Database Module - SQLite connection and initialization
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

let db: Database.Database | null = null;

/**
 * Get database path from environment or use default
 */
function getDatabasePath(): string {
  return process.env.DATABASE_PATH || join(process.cwd(), 'data/agent.db');
}

/**
 * Initialize the database connection and create tables
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();

  try {
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Run schema
    const schemaPath = join(process.cwd(), 'src/database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    console.log(`[Database] Initialized at ${dbPath}`);

    return db;
  } catch (error) {
    console.error('[Database] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[Database] Connection closed');
  }
}

/**
 * Run a transaction
 */
export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return db !== null;
}

// Export types for use in repositories
export type { Database };
