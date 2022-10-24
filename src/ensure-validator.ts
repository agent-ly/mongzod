import { isDeepStrictEqual } from "node:util";
import type { Db } from "mongodb";

export const ensureValidator = async (
  db: Db,
  collectionName: string,
  validator: any,
) => {
  const collections = await db
    .listCollections({ name: collectionName })
    .toArray();
  if (collections.length === 0) {
    await db.createCollection(collectionName, {
      validator,
    });
  } else {
    const collection = db.collection(collectionName);
    const options = await collection.options();
    if (
      !options.validator ||
      !isDeepStrictEqual(options.validator, validator)
    ) {
      await db.command({
        collMod: collectionName,
        validator,
      });
    }
  }
};
