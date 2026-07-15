/**
 * Optimistic locking: every UPDATE carries the version the client last saw.
 * The row is updated only if the stored version still matches
 * (`WHERE id = ? AND version = ?`), and the version is incremented atomically.
 * A zero row count means somebody else changed the record first -> HTTP 409.
 */
export const CONFLICT = { error: "version_conflict" };

type Updatable = {
  updateMany(args: { where: { id: string; version: number }; data: Record<string, unknown> }): Promise<{ count: number }>;
  findUnique(args: { where: { id: string } }): Promise<unknown>;
};

export async function updateVersioned<T>(
  model: Updatable,
  id: string,
  version: number,
  data: Record<string, unknown>
): Promise<T | null> {
  const { count } = await model.updateMany({
    where: { id, version },
    data: { ...data, version: { increment: 1 } },
  });
  if (count === 0) return null;
  return (await model.findUnique({ where: { id } })) as T;
}
