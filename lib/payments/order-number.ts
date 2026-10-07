/**
 * Order numbers: `NE-YYYYMMDD-XXXXXX`.
 *
 * The date part is the UTC creation day; the sequence is a platform-wide
 * running number (existing payments + 1), zero-padded to six digits. This is
 * the format every stored order already uses — existing rows are never
 * renumbered.
 *
 * Uniqueness is guaranteed by the database, not by the count: the payments
 * table has `order_id text not null unique`. The count only picks a good
 * first candidate. If two requests pick the same candidate at the same time,
 * Postgres lets exactly one insert commit and rejects the other with a
 * unique violation on order_id; that request then moves to a higher number
 * and tries again. No lock, no migration, and no window in which two orders
 * can share a number.
 */

/** UTC date stamp used in order numbers, e.g. 20261007. */
export function orderDateStamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/** `NE-<stamp>-<sequence>`, sequence zero-padded to at least six digits. */
export function formatOrderId(stamp: string, sequence: number): string {
  return `NE-${stamp}-${String(sequence).padStart(6, '0')}`;
}

/** True when a database error is the unique violation on payments.order_id. */
export function isOrderIdConflict(error: { code?: string; message?: string; details?: string } | null | undefined): boolean {
  if (!error || error.code !== '23505') return false;
  return /order_id/i.test(`${error.message ?? ''} ${error.details ?? ''}`);
}

export type OrderInsertAttempt<T> =
  | { ok: true; row: T }
  | { ok: false; conflict: boolean; error: Error };

/** Upper bound on retries; each one is caused by a concurrent insert winning. */
export const ORDER_ID_MAX_ATTEMPTS = 25;

/**
 * Inserts a row under a freshly allocated order number.
 *
 * `countExisting` returns how many payments exist; `tryInsert` performs ONE
 * insert with the given order id and reports whether it failed because that
 * order id is already taken. Any other failure is thrown immediately.
 */
export async function insertWithUniqueOrderId<T>(options: {
  countExisting: () => Promise<number>;
  tryInsert: (orderId: string) => Promise<OrderInsertAttempt<T>>;
  date?: Date;
  maxAttempts?: number;
}): Promise<T> {
  const stamp = orderDateStamp(options.date);
  const maxAttempts = options.maxAttempts ?? ORDER_ID_MAX_ATTEMPTS;

  let sequence = (await options.countExisting()) + 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await options.tryInsert(formatOrderId(stamp, sequence));
    if (result.ok) return result.row;
    if (!result.conflict) throw result.error;

    lastError = result.error;
    // Someone else took this number. Re-read the count (it now includes the
    // winner) and never go backwards.
    sequence = Math.max(sequence + 1, (await options.countExisting()) + 1);
  }

  throw lastError ?? new Error('Could not allocate a unique order number');
}
