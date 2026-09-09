import "server-only";

import Database from "libsql";

/**
 * The database driver, and the types the repositories are written against.
 *
 * `libsql` is deliberately API-compatible with better-sqlite3 at runtime —
 * `prepare().get()/.all()/.run()`, `transaction().immediate()`, synchronous
 * throughout — which is why swapping the driver did not touch any of the ~280
 * prepared statements in `lib/repositories`.
 *
 * Its *types*, though, are thinner than better-sqlite3's in one way that matters:
 * `prepare` takes a single type parameter for the bind arguments and none for the
 * row, so every statement returns `unknown`. Adopting that as-is would mean
 * weakening ~280 correct call sites to match a limitation of a type definition.
 *
 * So this module restores the two-parameter shape and performs the cast once, here,
 * where the assumption is written down rather than scattered. The runtime object is
 * the driver's own, untouched. Only the surface actually used is modelled — adding
 * to it is the moment to check the driver really behaves that way.
 */

export type RunResult = {
  changes: number;
  lastInsertRowid: number | bigint;
};

export interface Statement<P extends unknown[], R> {
  get(...params: P): R | undefined;
  all(...params: P): R[];
  run(...params: P): RunResult;
}

export interface Transaction<A extends unknown[], R> {
  (...args: A): R;
  default(...args: A): R;
  deferred(...args: A): R;
  /** Takes the write lock up front. The seed depends on this — see `ensureSeeded`. */
  immediate(...args: A): R;
  exclusive(...args: A): R;
}

export interface Db {
  prepare<P extends unknown[] = unknown[], R = unknown>(
    sql: string,
  ): Statement<P, R>;
  transaction<A extends unknown[], R>(fn: (...args: A) => R): Transaction<A, R>;
  exec(sql: string): Db;
  pragma(source: string, options?: { simple?: boolean }): unknown;
  close(): void;
  /**
   * Pulls changes from the primary into an embedded replica.
   *
   * Only meaningful when the database was opened with `syncUrl`; on a plain file
   * it throws, which is why `client.ts` only calls it in replica mode.
   */
  sync(): void;
  readonly name: string;
  readonly open: boolean;
  readonly inTransaction: boolean;
}

/**
 * `authToken` is absent from the driver's own `Options` type even though its README
 * documents it and the native binding requires it for remote connections. Declared
 * here so the one place that passes it is type-checked against something.
 */
export type DbOptions = {
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
  /** Primary to mirror. Turns the local path into an embedded replica. */
  syncUrl?: string;
  authToken?: string;
};

/**
 * Nesting counter, for savepoint names. Module-scoped rather than per-database
 * because names only have to be unique within one connection's transaction stack,
 * and a single monotonic counter guarantees that with less bookkeeping.
 */
let savepointDepth = 0;

/**
 * Restores nested-transaction behaviour.
 *
 * The one place the driver is not better-sqlite3-compatible. better-sqlite3 checks
 * whether a transaction is already open and issues `SAVEPOINT` instead of `BEGIN`
 * when it is; libsql always issues `BEGIN`, so an inner transaction dies with
 * "cannot start a transaction within a transaction" — and its error path would
 * `ROLLBACK` the *outer* transaction, silently discarding work the caller believed
 * was committed.
 *
 * The seed hits this immediately: `ensureSeeded` wraps everything in an IMMEDIATE
 * transaction to close the cold-start race, and `seedDemonstrationData` wraps its
 * own writes as well.
 */
function nestable(db: Db): Db {
  const native = db.transaction.bind(db);

  const transaction = <A extends unknown[], R>(
    fn: (...args: A) => R,
  ): Transaction<A, R> => {
    const run =
      (mode: "" | "DEFERRED" | "IMMEDIATE" | "EXCLUSIVE") =>
      (...args: A): R => {
        // Outermost call: a real transaction, and the mode means what it says.
        if (!db.inTransaction) {
          const outer = native(fn);
          switch (mode) {
            case "IMMEDIATE":
              return outer.immediate(...args);
            case "DEFERRED":
              return outer.deferred(...args);
            case "EXCLUSIVE":
              return outer.exclusive(...args);
            default:
              return outer.default(...args);
          }
        }

        // Nested: a savepoint. The mode is meaningless inside an open transaction —
        // the lock the outer BEGIN took is the one that applies.
        const name = `flc_sp_${++savepointDepth}`;
        db.exec(`SAVEPOINT ${name}`);
        try {
          const result = fn(...args);
          db.exec(`RELEASE ${name}`);
          return result;
        } catch (error) {
          // ROLLBACK TO undoes the savepoint's work but leaves it on the stack, so
          // it still has to be released or the outer transaction cannot commit.
          db.exec(`ROLLBACK TO ${name}`);
          db.exec(`RELEASE ${name}`);
          throw error;
        } finally {
          savepointDepth--;
        }
      };

    return Object.assign(run(""), {
      default: run(""),
      deferred: run("DEFERRED"),
      immediate: run("IMMEDIATE"),
      exclusive: run("EXCLUSIVE"),
    }) as Transaction<A, R>;
  };

  return new Proxy(db, {
    get(target, property, receiver) {
      if (property === "transaction") return transaction;
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function openDatabase(path: string, options?: DbOptions): Db {
  return nestable(new Database(path, options) as unknown as Db);
}
