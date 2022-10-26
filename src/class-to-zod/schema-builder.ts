import type { IndexDescription } from "mongodb";
import type { ZodRawShape, ZodTypeAny } from "zod";
import { z, ZodObject } from "zod";

import type { Cls } from "../common-types";
import { CustomSchemas, CommonSchemas } from "./schema-constants";
import { PropDefinitionType, getPropDefinitions } from "./prop-storage";
import { buildProperty, buildIndex } from "./prop-builder";

const AdvancedPropTypes = new Set([
  PropDefinitionType.Object,
  PropDefinitionType.Array,
  PropDefinitionType.Set,
  PropDefinitionType.Map,
]);

const schemaStorage = new WeakMap<Cls, ZodTypeAny>([
  ...CustomSchemas,
  ...CommonSchemas,
]);
const schemaIndexStorage = new WeakMap<Cls, IndexDescription[]>();

const determineProperty = (
  cls: Cls,
  key: string,
  type?: PropDefinitionType,
  options?: any,
) => {
  const path = `"${cls.name}.${key}"`;
  if (!type) throw new Error(`Could not determine type for ${path}`);
  if (!AdvancedPropTypes.has(type)) return buildProperty(type, options);

  if (
    options &&
    (options.type === cls ||
      options.items === cls ||
      options.keys === cls ||
      options.values === cls)
  )
    throw new Error(`Circular reference detected at ${path}`);

  if (type === PropDefinitionType.Array || type === PropDefinitionType.Set)
    return z[type === PropDefinitionType.Array ? "array" : "set"](
      options?.items ? buildSchema(options.items) : z.any(),
    );
  else if (type === PropDefinitionType.Map)
    return z.map(
      options?.keyType ? buildSchema(options.keyType) : z.any(),
      options?.valueType ? buildSchema(options.valueType) : z.any(),
    );
  else if (type === PropDefinitionType.Object)
    return options?.type
      ? buildSchema(options.type)
      : z.object({}).passthrough();

  throw new Error(`Could not determine schema at ${path}`);
};

const generateSchema = (cls: Cls) => {
  const shape: ZodRawShape = {};
  const definitions = getPropDefinitions(cls);
  if (definitions) {
    for (const { propertyKey, type, options, details } of definitions) {
      let prop = determineProperty(cls, propertyKey, type, options);
      if (details?.optional) prop = prop.optional();
      if (details?.nullable) prop = prop.nullable();
      if (details?.defaultValue !== undefined)
        prop = prop.default(details.defaultValue);
      if (details?.description)
        prop = prop.describe(
          prop.description
            ? `${details.description}[bsonType:${prop.description}]`
            : details.description,
        );
      shape[propertyKey] = prop;
    }
  }
  const schema = z.object(shape);
  return schema;
};

const generateIndexes = (cls: Cls, parentKey?: string) => {
  let indexes: IndexDescription[] = [];
  const definitions = getPropDefinitions(cls);
  if (definitions) {
    for (const { propertyKey, options, index } of definitions) {
      if (parentKey && index && index.exclude === true) continue;
      const key = parentKey ? `${parentKey}.${propertyKey}` : propertyKey;
      if (index) {
        indexes.push(
          buildIndex(key, index?.direction, {
            unique: index?.unique,
            sparse: index?.sparse,
          }),
        );
      }
      if (options?.type && index?.passthrough === true) {
        if (options.type === cls)
          throw new Error(
            `Circular reference detected at "${cls.name}.${propertyKey}"`,
          );
        const subIndexes = generateIndexes(options.type, key);
        indexes = [...indexes, ...subIndexes];
      }
    }
  }
  return indexes;
};

const isCls = (value: any): value is Cls =>
  typeof value === "function" && value !== Function;

export const buildSchema = (cls: Cls, description?: string): ZodTypeAny => {
  if (!isCls(cls)) throw new Error("Invalid class provided");

  const existingSchema = schemaStorage.get(cls);
  if (existingSchema) return existingSchema;

  let shape: ZodRawShape = {};
  let currCls = cls;
  while (currCls && currCls !== Object.getPrototypeOf(Function)) {
    let newSchema = schemaStorage.get(currCls);
    if (!newSchema) {
      newSchema = generateSchema(currCls);
      schemaStorage.set(currCls, newSchema);
    }
    if (newSchema instanceof ZodObject)
      shape = { ...shape, ...newSchema.shape };
    else throw new Error(`Unexpected schema type: ${currCls.name}`);
    currCls = Object.getPrototypeOf(currCls);
  }
  let schema = z.object(shape);
  if (description) schema = schema.describe(description);
  schemaStorage.set(cls, schema);
  return schema;
};

export const buildIndexes = (
  cls: Cls,
  parentKey?: string,
): IndexDescription[] => {
  if (!isCls(cls)) throw new Error("Invalid class provided");

  const existingIndexes = schemaIndexStorage.get(cls);
  if (existingIndexes) return existingIndexes;

  let indexes: IndexDescription[] = [];
  let currCls = cls;
  while (currCls && currCls !== Object.getPrototypeOf(Function)) {
    let newIndexes = schemaIndexStorage.get(currCls);
    if (!newIndexes) {
      newIndexes = generateIndexes(currCls, parentKey);
      schemaIndexStorage.set(currCls, newIndexes);
    }
    indexes = [...indexes, ...newIndexes];
    currCls = Object.getPrototypeOf(currCls);
  }
  schemaIndexStorage.set(cls, indexes);
  return indexes;
};
