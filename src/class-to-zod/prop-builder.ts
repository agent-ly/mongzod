import type { IndexDescription, IndexDirection } from "mongodb";
import { ObjectId } from "mongodb";
import type { ZodTypeAny } from "zod";
import { z } from "zod";

import type { NumberOptions, RawOptions, StringOptions } from "./prop-options";
import { PropDefinitionType } from "./prop";

type PropBuilder = (options?: any) => ZodTypeAny;

const PropBuilders: [PropDefinitionType, PropBuilder][] = [
  [PropDefinitionType.Any, () => z.any()],
  [
    PropDefinitionType.Raw,
    (options?: RawOptions) => {
      if (!options) throw new Error("`Raw` type must have options");
      if (!options.schema) throw new Error("`Raw` type must have a schema");
      return options.schema;
    },
  ],

  [PropDefinitionType.Bool, () => z.boolean()],
  [PropDefinitionType.Date, () => z.date()],
  [
    PropDefinitionType.String,
    (options?: StringOptions) => {
      let schema = z.string();
      if (options?.minLength !== undefined)
        schema = schema.min(options.minLength);
      if (options?.maxLength !== undefined)
        schema = schema.max(options.maxLength);
      const format = options?.format;
      if (format) {
        if (options?.format === "email") schema = schema.email();
        else if (options?.format === "url") schema = schema.url();
        else if (options?.format === "uuid") schema = schema.uuid();
        else if (options?.format === "cuid") schema = schema.cuid();
        else if (options?.format === "objectId")
          schema = schema.regex(/objectId/);
        else if (options?.format === "binData")
          schema = schema.regex(/binData/);
      } else {
        if (options?.pattern !== undefined)
          schema = schema.regex(options.pattern);
      }
      return schema;
    },
  ],
  [
    PropDefinitionType.Number,
    (options?: NumberOptions) => {
      let schema = z.number();
      if (options?.minimum !== undefined)
        schema = schema[options.exclusiveMinimum ? "gt" : "gte"](
          options.minimum,
        );
      if (options?.maximum !== undefined)
        schema = schema[options.exclusiveMaximum ? "lt" : "lte"](
          options.maximum,
        );
      if (options?.multipleOf !== undefined)
        schema = schema.multipleOf(options.multipleOf);
      return schema;
    },
  ],
  [PropDefinitionType.Enum, (options: any) => z.enum(options.values)],
  [
    PropDefinitionType.NativeEnum,
    (options?: any) => z.nativeEnum(options.values),
  ],
];

const builders = new Map(PropBuilders);

export const buildProperty = (type: PropDefinitionType, options?: any) => {
  const builder = builders.get(type);
  if (!builder) throw new Error(`No builder for ${options}`);
  let schema = builder(options);
  return schema;
};

export const buildIndex = (
  key: string,
  direction: IndexDirection = 1,
  options?: {
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
  },
) => {
  if (
    direction !== 1 &&
    direction !== -1 &&
    direction !== "2d" &&
    direction !== "2dsphere" &&
    direction !== "text" &&
    direction !== "geoHaystack" &&
    direction !== "hashed"
  ) {
    throw new Error(`Invalid index direction: ${direction}`);
  }
  const description: IndexDescription = {
    name: `${key}_${direction}`,
    key: { [key]: direction },
  };
  if (options?.unique) description.unique = true;
  if (options?.sparse) description.sparse = true;
  if (options?.expireAfterSeconds)
    description.expireAfterSeconds = options.expireAfterSeconds;
  return description;
};
