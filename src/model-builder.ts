import type { IndexDescription } from "mongodb";
import type { SafeParseError, SafeParseSuccess, ZodTypeAny } from "zod";

import type { Cls } from "./common-types";
import { buildIndexes, buildSchema } from "./class-to-zod/schema-builder";
import type { JSONSchema } from "./zod-to-json-schema/mongodb-json-schema";
import { parseSchema } from "./zod-to-json-schema/json-schema-parser";

export const withId = (schema: JSONSchema) => {
  if (schema.additionalProperties === false) {
    if (!schema.properties) schema.properties = {};
    if (!("_id" in schema.properties))
      schema.properties = {
        _id: { bsonType: "objectId" },
        ...schema.properties,
      };

    if (!schema.required) schema.required = [];
    if (!schema.required.includes("_id"))
      schema.required = ["_id", ...schema.required];
  }
  return schema;
};

type Model<T> = {
  getSchema: () => ZodTypeAny;
  getIndexes: () => IndexDescription[];
  toJSON: () => JSONSchema;
  parse: (data: T) => T;
  safeParse: (data: T) => SafeParseSuccess<T> | SafeParseError<T>;
};

export const buildModel = <T>(cls: Cls<T>, description?: string): Model<T> => {
  const schema = buildSchema(cls, description);
  const indexes = buildIndexes(cls);
  return {
    getSchema: () => schema,
    getIndexes: () => indexes,
    toJSON: () => parseSchema(schema),
    parse: (data: T): T => schema.parse(data),
    safeParse: (data: T): SafeParseSuccess<T> | SafeParseError<T> =>
      schema.safeParse(data),
  };
};
