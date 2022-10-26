import { ObjectId, Double, Decimal128, Long } from "mongodb";
import type { ZodTypeAny } from "zod";
import { z } from "zod";

import type { Cls } from "../common-types";

export const CustomSchemas = new Map<Cls, ZodTypeAny>([
  [Double, z.number().describe("[bsonType:double]")],
  [Decimal128, z.number().describe("[bsonType:decimal]")],
  [Long, z.number().describe("[bsonType:long]")],
  [
    ObjectId,
    z
      .any()
      .describe("[bsonType:objectId]")
      .refine((value) => ObjectId.isValid(value), "Invalid Object ID"),
  ],
]);

export const CommonSchemas = new Map<Cls, ZodTypeAny>([
  [Date, z.date()],
  [Boolean, z.boolean()],
  [String, z.string()],
  [Number, z.number()],
  [Object, z.object({}).passthrough()],
  [Array, z.array(z.any())],
  [Set, z.set(z.any())],
  [Map, z.map(z.any(), z.any())],
]);
