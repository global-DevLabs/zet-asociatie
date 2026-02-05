import { getDatabase } from "@/lib/db";

/**
 * ADMIN CLIENT - Server-only database client
 * Uses better-sqlite3 for direct database access
 */

class AdminClient {
  private db = getDatabase();

  from(table: string) {
    return {
      select: (columns: string = "*") => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            try {
              const result = this.db
                .prepare(`SELECT ${columns} FROM ${table} WHERE ${column} = ?`)
                .get(value);
              return { data: result, error: null };
            } catch (error: any) {
              return { data: null, error: error.message };
            }
          },
        }),
      }),
      order: (column: string, options?: { ascending: boolean }) => ({
        all: async () => {
          try {
            const order = options?.ascending !== false ? "ASC" : "DESC";
            const result = this.db
              .prepare(
                `SELECT ${columns} FROM ${table} ORDER BY ${column} ${order}`
              )
              .all();
            return { data: result, error: null };
          } catch (error: any) {
            return { data: null, error: error.message };
          }
        },
      }),
    };
  }

  auth = {
    admin: {
      createUser: async (userData: {
        email: string;
        password: string;
        user_metadata?: Record<string, any>;
      }) => {
        // This would require actual user creation - handled by API routes
        return {};
      },
      listUsers: async () => {
        try {
          const users = this.db.prepare("SELECT * FROM profiles").all();
          return { data: users, error: null };
        } catch (error: any) {
          return { data: null, error: error.message };
        }
      },
    },
  };
}

let adminClient: AdminClient | null = null;

export function getSupabaseAdmin(): AdminClient {
  if (!adminClient) {
    adminClient = new AdminClient();
  }
  return adminClient;
}

// Alias for convenience
export const supabaseAdmin = getSupabaseAdmin;
