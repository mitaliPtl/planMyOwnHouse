import "dotenv/config";
import { Client } from "pg";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";

/**
 * Raw-SQL e2e test setup helper — deliberately does NOT go through the generated
 * Prisma client (which uses `import.meta` and can't load under Playwright's
 * CommonJS test transform) or anything from src/server/auth/*|src/lib/prisma.ts
 * (guarded by "server-only", meant for the Next.js server runtime, not this process).
 *
 * Direct DB seeding is a standard e2e pattern: it sets up state fast and
 * deterministically without re-driving a UI flow (like waiting on a real email) that's
 * already covered elsewhere (see auth.spec.ts).
 *
 * The dotenv load lives HERE, not in playwright.config.ts: this module is only
 * imported by spec files, which run after Playwright's webServer child process has
 * already been spawned. Loading dotenv in the config file instead would pollute
 * process.env (including NODE_ENV) before that spawn, and the child would inherit a
 * broken environment — Next.js's build genuinely fails under an inherited
 * NODE_ENV=development during `next build`.
 */
async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function createVerifiedCustomer(email: string, password: string) {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await withClient(async (client) => {
    const { rows } = await client.query('SELECT id FROM roles WHERE name = $1', ["CUSTOMER"]);
    const roleId = rows[0]?.id;
    if (!roleId) throw new Error("CUSTOMER role not seeded — run `npm run db:seed`.");

    await client.query(
      `INSERT INTO users (id, email, "fullName", "passwordHash", "emailVerified", "roleId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, now(), $5, now(), now())`,
      [randomUUID(), email, "Project Test User", passwordHash, roleId]
    );
  });
}

export async function deleteUserByEmail(email: string) {
  await withClient((client) => client.query("DELETE FROM users WHERE email = $1", [email]));
}
