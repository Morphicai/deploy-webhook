import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from './database';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface UserRecord {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createUser(input: { email: string; password: string }): Promise<UserRecord> {
  const { email, password } = createUserSchema.parse(input);
  const db = getDb();
  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
  if (existing) {
    throw new Error('User already exists');
  }
  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO users (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)`)
    .run(email, hash, now, now);
  const row = db.prepare(`SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = ?`).get(email);
  return mapRow(row);
}

export async function verifyCredentials(input: { email: string; password: string }): Promise<UserRecord | null> {
  const { email, password } = loginSchema.parse(input);
  const db = getDb();
  const row = db.prepare(`SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = ?`).get(email) as
    | {
        id: number;
        email: string;
        password_hash: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!row) return null;
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;
  return mapRow(row);
}

export function hasAnyUser(): boolean {
  const db = getDb();
  const row = db.prepare(`SELECT id FROM users LIMIT 1`).get();
  return !!row;
}

export function listUsers(): { id: number; email: string }[] {
  const db = getDb();
  const rows = db.prepare(`SELECT id, email FROM users ORDER BY id ASC`).all() as { id: number; email: string }[];
  return rows;
}
