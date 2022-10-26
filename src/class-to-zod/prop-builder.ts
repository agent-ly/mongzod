import type { IndexDescription, IndexDirection } from "mongodb";
import type { ZodTypeAny } from "zod";
import { z } from "zod";

import type {
  AnyOptions,
  NumberOptions,
  RawOptions,
  StringOptions,
} from "./prop-options";
import { PropDefinitionType } from "./prop-storage";

type PropBuilder = (options?: any) => ZodTypeAny;

const PropBuilders: [PropDefinitionType, PropBuilder][] = [
  [PropDefinitionType.Raw, (options: RawOptions) => options.schema],
  [
    PropDefinitionType.Any,
    (options?: AnyOptions) => {
      let schema = z.any();
      if (options?.type) schema = schema.describe(`[bsonType:${options.type}]`);
      return schema;
    },
  ],

  [PropDefinitionType.Date, () => z.date()],
  [PropDefinitionType.Bool, () => z.boolean()],
  [
    PropDefinitionType.String,
    (options?: StringOptions) => {
      let schema = z.string();
      if (options?.minLength !== undefined)
        schema = schema.min(options.minLength);
      if (options?.maxLength !== undefined)
        schema = schema.max(options.maxLength);
      if (options?.pattern !== undefined)
        schema = schema.regex(options.pattern);
      if (options?.format === "email") schema = schema.email();
      else if (options?.format === "url") schema = schema.url();
      else if (options?.format === "uuid") schema = schema.uuid();
      else if (options?.format === "cuid") schema = schema.cuid();
      return schema;
    },
  ],
  [
    PropDefinitionType.Number,
    (options?: NumberOptions) => {
      let schema = z.number();
      if (options?.type) {
        if (options.type === "int") schema = schema.int();
        else schema = schema.describe(`[bsonType:${options.type}]`);
      }
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
