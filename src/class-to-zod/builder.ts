import type { IndexDescription } from "mongodb";
import { ObjectId } from "mongodb";
import type { ZodRawShape, ZodTypeAny } from "zod";
import { z, ZodObject } from "zod";

import type { Cls } from "../common-types";
import { PropDefinitionType, getPropDefinitions } from "./prop";
import { buildProperty, buildIndex } from "./prop-builder";

const AdvancedPropTypes = new Set([
  PropDefinitionType.Object,
  PropDefinitionType.Array,
  PropDefinitionType.Set,
  PropDefinitionType.Map,
]);

const CommonSchemas: [Cls, ZodTypeAny][] = [
  [ObjectId, z.string().regex(/objectId/)],
  [Buffer, z.string().regex(/binData/)],

  [Boolean, z.boolean()],
  [String, z.string()],
  [Number, z.number()],
  [Date, z.date()],

  [Object, z.object({}).passthrough()],
  [Array, z.array(z.any())],
  [Set, z.set(z.any())],
  [Map, z.map(z.any(), z.any())],
];

const schemaStorage = new WeakMap<Cls, ZodTypeAny>(CommonSchemas);

const schemaIndexStorage = new WeakMap<Cls, IndexDescription[]>();

const generateSchema = (cls: Cls) => {
  const shape: ZodRawShape = {};
  const definitions = getPropDefinitions(cls);
  if (definitions) {
    for (const { propertyKey, type, options, details } of definitions) {
      const path = `"${cls.name}.${propertyKey}"`;
      if (!type) throw new Error(`No type defined at ${path}`);

      let prop: ZodTypeAny | undefined;
      if (!AdvancedPropTypes.has(type)) {
        prop = buildProperty(type, options);
      } else {
        if (
          options &&
          (options.type === cls ||
            options.items === cls ||
            options.keys === cls ||
            options.values === cls)
        ) {
          throw new Error(`Circular reference detected at ${path}`);
        }
        if (
          type === PropDefinitionType.Array ||
          type === PropDefinitionType.Set
        ) {
          const kind = type === PropDefinitionType.Array ? "array" : "set";
          prop = z[kind](options?.items ? buildSchema(options.items) : z.any());
        } else if (type === PropDefinitionType.Map) {
          prop = z.map(
            options?.keyType ? buildSchema(options.keyType) : z.any(),
            options?.valueType ? buildSchema(options.valueType) : z.any(),
          );
        } else if (type === PropDefinitionType.Object) {
          prop = options?.type
            ? buildSchema(options.type)
            : z.object({}).passthrough();
        }
      }

      if (!prop) throw new Error(`Could not determine schema at ${path}`);
      if (details?.optional) prop = prop.optional();
      if (details?.nullable) prop = prop.nullable();
      if (details?.defaultValue !== undefined)
        prop = prop.default(details?.defaultValue);
      if (details?.description) prop = prop.describe(details?.description);
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

export const buildSchema = (cls: Cls): ZodTypeAny => {
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
  const schema = z.object(shape);
  schemaStorage.set(cls, schema);
  return schema;
};

export const buildIndexes = (
  cls: Cls,
  parentKey?: string,
): IndexDescription[] => {
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
