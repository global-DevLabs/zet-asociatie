import { getDatabase } from "@/lib/db";
import { getUserById } from "@/lib/auth-utils";

/**
 * Server-side client for database operations
 * Uses better-sqlite3 directly on the server
 */

interface TableBuilder {
  select: (columns?: string) => QueryBuilder;
  insert: (data: any) => { select: () => any };
  update: (data: any) => QueryBuilder;
  delete: () => QueryBuilder;
}

interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  single: () => any;
  [key: string]: any;
}

class LocalServerClient {
  private db = getDatabase();

  from(table: string): TableBuilder {
    return {
      select: (columns?: string) => {
        return this.createQueryBuilder(table, columns);
      },
      insert: (data: any) => {
        return {
          select: () => {
            try {
              const keys = Object.keys(data);
              const placeholders = keys.map(() => "?").join(",");
              const values = keys.map((k) => data[k]);

              const stmt = this.db.prepare(`
                INSERT INTO ${table} (${keys.join(",")})
                VALUES (${placeholders})
              `);

              stmt.run(...values);

              // Fetch the inserted data
              if (data.id) {
                const result = this.db
                  .prepare(`SELECT * FROM ${table} WHERE id = ?`)
                  .get(data.id);
                return { data: [result], error: null };
              }

              return { data: [data], error: null };
            } catch (error: any) {
              return { data: null, error: error.message };
            }
          },
        };
      },
      update: (data: any) => {
        return this.createUpdateBuilder(table, data);
      },
      delete: () => {
        return this.createDeleteBuilder(table);
      },
    };
  }

  auth = {
    getUser: async (userId: string) => {
      try {
        const user = getUserById(userId);
        return { data: { user }, error: null };
      } catch (error: any) {
        return { data: null, error: error.message };
      }
    },
  };

  private createQueryBuilder(table: string, columns: string = "*"): QueryBuilder {
    const query: any = { table, columns, filters: [] };

    return {
      select: (cols?: string) => {
        query.columns = cols || "*";
        return this.createQueryBuilder(table, cols);
      },
      eq: (column: string, value: any) => {
        query.filters.push({ column, value });
        return this.executeQuery(query);
      },
      async single() {
        try {
          const result = this.executeQueryDirect(query);
          return {
            data: result && result.length > 0 ? result[0] : null,
            error: null,
          };
        } catch (error: any) {
          return { data: null, error: error.message };
        }
      },
    };
  }

  private createUpdateBuilder(table: string, data: any): QueryBuilder {
    const query: any = { table, data, filters: [], method: "update" };

    return {
      eq: (column: string, value: any) => {
        query.filters.push({ column, value });
        return {
          run: () => {
            try {
              const setClauses = Object.keys(data)
                .map((k) => `${k} = ?`)
                .join(",");
              const setValues = Object.values(data);

              const whereClause = query.filters
                .map(() => "? = ?")
                .join(" AND ");
              const whereValues = query.filters.flatMap((f: any) => [
                f.column,
                f.value,
              ]);

              const sql = `UPDATE ${table} SET ${setClauses} WHERE ${whereClause}`;
              const stmt = this.db.prepare(sql);

              stmt.run(...setValues, ...whereValues);
              return { error: null };
            } catch (error: any) {
              return { error: error.message };
            }
          },
        } as any;
      },
    } as QueryBuilder;
  }

  private createDeleteBuilder(table: string): QueryBuilder {
    const query: any = { table, filters: [], method: "delete" };

    return {
      eq: (column: string, value: any) => {
        query.filters.push({ column, value });
        return {
          run: () => {
            try {
              const whereClause = "id = ?";
              const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
              const stmt = this.db.prepare(sql);

              stmt.run(value);
              return { error: null };
            } catch (error: any) {
              return { error: error.message };
            }
          },
        } as any;
      },
    } as QueryBuilder;
  }

  private executeQuery(query: any): QueryBuilder {
    return {
      ...query,
      single: async () => {
        try {
          const result = this.executeQueryDirect(query);
          return {
            data: result && result.length > 0 ? result[0] : null,
            error: null,
          };
        } catch (error: any) {
          return { data: null, error: error.message };
        }
      },
    } as QueryBuilder;
  }

  private executeQueryDirect(query: any): any {
    let sql = `SELECT ${query.columns} FROM ${query.table}`;

    if (query.filters && query.filters.length > 0) {
      const whereClause = query.filters
        .map(() => "? = ?")
        .join(" AND ");
      sql += ` WHERE ${whereClause}`;

      const values = query.filters.flatMap((f: any) => [f.column, f.value]);
      return this.db.prepare(sql).all(...values);
    }

    if (query.orderBy) {
      sql += ` ORDER BY ${query.orderBy} ${
        query.ascending ? "ASC" : "DESC"
      }`;
    }

    return this.db.prepare(sql).all();
  }
}

export async function createClient() {
  return new LocalServerClient();
}
