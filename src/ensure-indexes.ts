import type { Db, IndexDescription } from "mongodb";

type EnsureIndexesOptions = {
  indexes: IndexDescription[];
  dropIndexes?: boolean;
};

export const ensureIndexes = async (
  db: Db,
  collectionName: string,
  { dropIndexes, indexes }: EnsureIndexesOptions,
) => {
  if (dropIndexes) await db.collection(collectionName).dropIndexes();
  await db.collection(collectionName).createIndexes(indexes);
};
