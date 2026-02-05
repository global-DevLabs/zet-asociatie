/**
 * Local API client for browser-side requests
 * This replaces Supabase with local API routes
 */

interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  single: () => Promise<{ data: any; error: any }>;
  [key: string]: any;
}

interface TableBuilder {
  select: (columns?: string) => QueryBuilder;
  insert: (data: any) => { select: () => Promise<{ data: any; error: any }> };
  update: (data: any) => QueryBuilder;
  delete: () => QueryBuilder;
  [key: string]: any;
}

interface AuthClient {
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  getUser: () => Promise<{ data: { user: any }; error: any }>;
  onAuthStateChange: (
    callback: (event: string, session: any) => void
  ) => { data: { subscription: { unsubscribe: () => void } } };
}

interface LocalClient {
  from: (table: string) => TableBuilder;
  auth: AuthClient;
}

let browserClient: LocalClient | null = null;

const createLocalClient = (): LocalClient => {
  return {
    from(table: string): TableBuilder {
      return {
        select(columns?: string) {
          const query = { table, columns: columns || "*", filters: [] };
          return createQueryBuilder(query);
        },
        insert(data: any) {
          return {
            select: async () => {
              try {
                const response = await fetch(`/api/db/${table}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "insert", data }),
                });
                const result = await response.json();
                return { data: result.data, error: result.error || null };
              } catch (error) {
                return { data: null, error: error };
              }
            },
          };
        },
        update(data: any) {
          return createQueryBuilder({ table, data, method: "update" });
        },
        delete() {
          return createQueryBuilder({ table, method: "delete" });
        },
      };
    },
    auth: {
      async signInWithPassword(credentials) {
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });
          const result = await response.json();
          if (!response.ok) {
            return { data: null, error: new Error(result.error) };
          }
          return { data: result, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      async signOut() {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
          return { error: null };
        } catch (error) {
          return { error };
        }
      },
      async getUser() {
        try {
          const response = await fetch("/api/auth/user", {
            method: "GET",
            credentials: "include",
          });
          const result = await response.json();
          if (!response.ok) {
            return { data: { user: null }, error: null };
          }
          return { data: { user: result.user }, error: null };
        } catch (error) {
          return { data: { user: null }, error: null };
        }
      },
      onAuthStateChange(callback) {
        // For local implementation, check auth status on load and when window regains focus
        const checkAuth = async () => {
          const response = await fetch("/api/auth/user", {
            credentials: "include",
          });
          const data = await response.json();
          if (data.user) {
            callback("SIGNED_IN", { user: data.user });
          } else {
            callback("SIGNED_OUT", null);
          }
        };

        checkAuth();
        window.addEventListener("focus", checkAuth);

        return {
          data: {
            subscription: {
              unsubscribe: () => {
                window.removeEventListener("focus", checkAuth);
              },
            },
          },
        };
      },
    },
  };
};

function createQueryBuilder(query: any): QueryBuilder {
  return {
    select(columns?: string) {
      query.columns = columns || "*";
      return createQueryBuilder(query);
    },
    eq(column: string, value: any) {
      query.filters = query.filters || [];
      query.filters.push({ column, operator: "eq", value });
      return createQueryBuilder(query);
    },
    async single() {
      try {
        const response = await fetch(
          `/api/db/${query.table}?${new URLSearchParams({
            columns: query.columns || "*",
            limit: "1",
          })}`,
          { method: "GET" }
        );
        const result = await response.json();
        return {
          data:
            result.data && result.data.length > 0 ? result.data[0] : null,
          error: result.error || null,
        };
      } catch (error) {
        return { data: null, error };
      }
    },
    async order(column: string, options?: { ascending: boolean }) {
      query.orderBy = column;
      query.ascending = options?.ascending !== false;
      
      // Execute immediately for order operations
      try {
        const params = new URLSearchParams({
          columns: query.columns || "*",
          orderBy: column,
          ascending: (options?.ascending !== false).toString(),
        });
        const response = await fetch(`/api/db/${query.table}?${params}`, {
          method: "GET",
        });
        const result = await response.json();
        return {
          data: result.data || [],
          error: result.error || null,
        };
      } catch (error) {
        return { data: null, error };
      }
    },
  } as QueryBuilder;
}

export function createBrowserClient(): LocalClient {
  if (!browserClient) {
    browserClient = createLocalClient();
  }
  return browserClient;
}

// Alias for backward compatibility
export const createClient = createBrowserClient;
export const getSupabaseClient = createBrowserClient;
