/**
 * Chat History Repository - AI Chat conversation storage
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index.js';
import type { ChatMessage } from '../../agent/types.js';

interface ChatRow {
  id: string;
  timestamp: string;
  role: string;
  content: string;
}

function rowToMessage(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp),
    role: row.role as 'user' | 'assistant',
    content: row.content,
  };
}

/**
 * Save a chat message
 */
export function saveMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  const db = getDatabase();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO chat_history (id, role, content)
    VALUES (?, ?, ?)
  `);

  stmt.run(id, role, content);

  return getMessageById(id)!;
}

/**
 * Get message by ID
 */
export function getMessageById(id: string): ChatMessage | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chat_history WHERE id = ?');
  const row = stmt.get(id) as ChatRow | undefined;
  return row ? rowToMessage(row) : null;
}

/**
 * Get recent messages
 */
export function getRecentMessages(limit: number = 50): ChatMessage[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM chat_history
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as ChatRow[];
  return rows.map(rowToMessage).reverse(); // Return in chronological order
}

/**
 * Get messages for context (last N messages for AI)
 */
export function getContextMessages(limit: number = 20): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages = getRecentMessages(limit);
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Clear chat history
 */
export function clearHistory(): number {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM chat_history');
  const result = stmt.run();
  return result.changes;
}

/**
 * Get messages by date range
 */
export function getMessagesByDateRange(since: Date, until: Date): ChatMessage[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM chat_history
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
  `);
  const rows = stmt.all(since.toISOString(), until.toISOString()) as ChatRow[];
  return rows.map(rowToMessage);
}

/**
 * Get today's messages
 */
export function getTodayMessages(): ChatMessage[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getMessagesByDateRange(today, tomorrow);
}

/**
 * Search messages
 */
export function searchMessages(query: string, limit: number = 20): ChatMessage[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM chat_history
    WHERE content LIKE ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  const rows = stmt.all(`%${query}%`, limit) as ChatRow[];
  return rows.map(rowToMessage);
}

/**
 * Get message count
 */
export function getMessageCount(): number {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM chat_history');
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Clean old messages (older than X days)
 */
export function cleanOldMessages(daysToKeep: number = 30): number {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const stmt = db.prepare('DELETE FROM chat_history WHERE timestamp < ?');
  const result = stmt.run(cutoffDate.toISOString());
  return result.changes;
}
