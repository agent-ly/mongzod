// Heavily influenced by https://github.com/StefanTerdell/zod-to-json-schema
// Modified to support MongoDB JSON Schema extensions & omissions
import type {
  ZodArrayDef,
  ZodDefaultDef,
  ZodEnumDef,
  ZodIntersectionDef,
  ZodLiteralDef,
  ZodMapDef,
  ZodNativeEnumDef,
  ZodNullableDef,
  ZodNumberDef,
  ZodObjectDef,
  ZodOptionalDef,
  ZodRecordDef,
  ZodSetDef,
  ZodStringDef,
  ZodTupleDef,
  ZodTupleItems,
  ZodTypeAny,
  ZodTypeDef,
  ZodUnionDef,
} from "zod";
import { ZodFirstPartyTypeKind } from "zod";

import type { JSONSchema, JSONSchemaBSONType } from "./mongodb-json-schema";

const ZodStringFormatMappings = {
  email:
    /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i,
  url: /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
  uuid: /^([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}|00000000-0000-0000-0000-000000000000)$/i,
  cuid: /^c[^\s-]{8,}$/i,
} as const;

const PrimitiveZodTypeMappings = {
  [ZodFirstPartyTypeKind.ZodString]: "string",
  [ZodFirstPartyTypeKind.ZodNumber]: "number",
  [ZodFirstPartyTypeKind.ZodBigInt]: "long",
  [ZodFirstPartyTypeKind.ZodBoolean]: "bool",
  [ZodFirstPartyTypeKind.ZodDate]: "date",
  [ZodFirstPartyTypeKind.ZodNull]: "null",
} as const;

type DefParser = (def?: any) => JSONSchema;

const DefParsers: [ZodFirstPartyTypeKind, DefParser][] = [
  [ZodFirstPartyTypeKind.ZodAny, () => ({})],
  [ZodFirstPartyTypeKind.ZodUnknown, () => ({})],
  [ZodFirstPartyTypeKind.ZodUndefined, () => ({ not: {} })],
  [ZodFirstPartyTypeKind.ZodVoid, () => ({ not: {} })],
  [ZodFirstPartyTypeKind.ZodNever, () => ({ not: {} })],
  [ZodFirstPartyTypeKind.ZodNaN, () => ({ not: {} })],
  [ZodFirstPartyTypeKind.ZodNull, () => ({ bsonType: "null" })],
  [
    ZodFirstPartyTypeKind.ZodDefault,
    (def: ZodDefaultDef) =>
      parseDef(def.innerType._def.typeName, def.innerType._def),
  ],
  [
    ZodFirstPartyTypeKind.ZodOptional,
    (def: ZodOptionalDef) => ({
      anyOf: [
        parseDef(def.innerType._def.typeName, def.innerType._def),
        // FIXME: Should I use `bsonType: "null"` instead?
        { not: {} },
      ],
    }),
  ],
  [
    ZodFirstPartyTypeKind.ZodNullable,
    (def: ZodNullableDef) => {
      if (def.innerType._def.typeName in PrimitiveZodTypeMappings) {
        return {
          bsonType: [
            PrimitiveZodTypeMappings[
              def.innerType._def
                .typeName as keyof typeof PrimitiveZodTypeMappings
            ],
            "null",
          ],
        };
      } else {
        return {
          anyOf: [
            parseDef(def.innerType._def.typeName, def.innerType._def),
            { bsonType: "null" },
          ],
        };
      }
    },
  ],
  [
    ZodFirstPartyTypeKind.ZodIntersection,
    (def: ZodIntersectionDef) => ({
      allOf: [
        parseDef(def.left._def.typeName, def.left._def),
        parseDef(def.right._def.typeName, def.right._def),
      ],
    }),
  ],
  [
    ZodFirstPartyTypeKind.ZodUnion,
    (def: ZodUnionDef) => {
      const options: readonly ZodTypeAny[] =
        def.options instanceof Map
          ? Array.from(def.options.values())
          : def.options;

      // Primitive types
      if (
        options.every(
          (schema) =>
            schema._def.typeName in PrimitiveZodTypeMappings &&
            (!schema._def.checks || !schema._def.checks.length),
        )
      ) {
        const bsonTypes = Array.from(
          options.reduce((set, schema) => {
            const type =
              PrimitiveZodTypeMappings[
                schema._def.typeName as keyof typeof PrimitiveZodTypeMappings
              ];
            set.add(type);
            return set;
          }, new Set<JSONSchemaBSONType>()),
        );
        return {
          bsonType: bsonTypes.length > 1 ? bsonTypes : bsonTypes[0],
        };
      }

      // Literal types
      if (
        options.every(
          (schema) => schema._def.typeName === ZodFirstPartyTypeKind.ZodLiteral,
        )
      ) {
        const bsonTypes = Array.from(
          options.reduce((set, schema) => {
            const bsonType = typeof schema._def.value;
            switch (bsonType) {
              case "string":
              case "number":
                set.add(bsonType);
                break;
              case "boolean":
                set.add("bool");
                break;
              case "bigint":
                set.add("long");
                break;
              case "object":
                if (schema._def.value === null) set.add("null");
                break;
              case "symbol":
              case "undefined":
              case "function":
              default:
                break;
            }
            return set;
          }, new Set<JSONSchemaBSONType>()),
        );
        if (bsonTypes.length === options.length) {
          return {
            bsonType: bsonTypes.length > 1 ? bsonTypes : bsonTypes[0],
            enum: Array.from(
              options.reduce((set, schema) => {
                set.add(schema._def.value);
                return set;
              }, new Set()),
            ),
          };
        }
      }

      // Enum types
      if (
        options.every(
          (schema) => schema._def.typeName === ZodFirstPartyTypeKind.ZodEnum,
        )
      ) {
        return {
          bsonType: "string",
          enum: Array.from(
            options.reduce((set, schema) => {
              for (const value of schema._def.values) set.add(value);
              return set;
            }, new Set()),
          ),
        };
      }

      return {
        anyOf: options.map((schema) =>
          parseDef(schema._def.typeName, schema._def),
        ),
      };
    },
  ],
  [ZodFirstPartyTypeKind.ZodBoolean, () => ({ bsonType: "bool" })],
  [ZodFirstPartyTypeKind.ZodBigInt, () => ({ bsonType: "long" })],
  [ZodFirstPartyTypeKind.ZodDate, () => ({ bsonType: "date" })],
  [
    ZodFirstPartyTypeKind.ZodLiteral,
    (def: ZodLiteralDef) => ({ enum: def.value }),
  ],
  [
    ZodFirstPartyTypeKind.ZodEnum,
    (def: ZodEnumDef) => ({
      bsonType: "string",
      enum: def.values,
    }),
  ],
  [
    ZodFirstPartyTypeKind.ZodNativeEnum,
    (def: ZodNativeEnumDef) => {
      const numberValues = Object.values(def.values)
        .filter((value) => typeof value === "number")
        .map((value) => value.toString());
      const actualValues = Object.values(def.values).filter(
        (_, idx) => idx >= numberValues.length,
      );
      return {
        bsonType:
          numberValues.length === 0
            ? "string"
            : numberValues.length === actualValues.length
            ? "number"
            : ["string", "number"],
        enum: actualValues,
      };
    },
  ],
  [
    ZodFirstPartyTypeKind.ZodNumber,
    (def: ZodNumberDef) => {
      const schema: JSONSchema = { bsonType: "number" };
      // Checks
      for (const check of def.checks) {
        if (check.kind === "int") {
          delete schema.type;
          schema.bsonType = "int";
        } else if (check.kind === "min") {
          schema.minimum = check.value;
          if (!check.inclusive) schema.exclusiveMinimum = true;
        } else if (check.kind === "max") {
          schema.maximum = check.value;
          if (!check.inclusive) schema.exclusiveMaximum = true;
        } else if (check.kind === "multipleOf") {
          schema.multipleOf = check.value;
        }
      }
      return schema;
    },
  ],
  [
    ZodFirstPartyTypeKind.ZodString,
    (def: ZodStringDef) => {
      const schema: JSONSchema = { bsonType: "string" };
      const patterns = new Set<RegExp>();
      for (const check of def.checks) {
        if (check.kind === "min") schema.minLength = check.value;
        else if (check.kind === "max") schema.maxLength = check.value;
        else if (check.kind === "startsWith") patterns.add(/^check.value/);
        else if (check.kind === "endsWith") patterns.add(/check.value$/);
        else if (check.kind === "trim") patterns.add(/^\s+|\s+$/g);
        else if (check.kind === "email")
          patterns.add(ZodStringFormatMappings.email);
        else if (check.kind === "url")
          patterns.add(ZodStringFormatMappings.url);
        else if (check.kind === "uuid")
          patterns.add(ZodStringFormatMappings.uuid);
        else if (check.kind === "cuid")
          patterns.add(ZodStringFormatMappings.cuid);
        else if (check.kind === "regex") {
          if (check.regex.source == "objectId") return { bsonType: "objectId" };
          else if (check.regex.source == "binData")
            return { bsonType: "binData" };
          else if (check.regex.source == "timestamp")
            return { bsonType: "timestamp" };
          patterns.add(check.regex);
        }
      }
      if (patterns.size) {
        if (patterns.size === 1)
          schema.pattern = patterns.values().next().value.source;
        else
          schema.allOf = Array.from(patterns).map((pattern) => ({
            pattern: pattern.source,
          }));
      }
      return schema;
    },
  ],
  [
    ZodFirstPartyTypeKind.ZodObject,
    (def: ZodObjectDef) => {
      const schema: JSONSchema = { bsonType: "object" };
      for (const [key, value] of Object.entries(def.shape())) {
        const result = parseDef(value._def.typeName, value._def);
        if (!schema.properties) schema.properties = {};
        schema.properties[key] = result;
        if (value.isOptional()) continue;
        if (!schema.required) schema.required = [];
        schema.required.push(key);
      }
      const additionalProperties =
        def.catchall._def.typeName === ZodFirstPartyTypeKind.ZodNever
          ? def.unknownKeys === "passthrough"
          : parseDef(def.catchall._def.typeName, def.catchall._def) ?? true;
      if (additionalProperties === false) schema.additionalProperties = false;
      else if (additionalProperties !== true)
        schema.additionalProperties = additionalProperties;
      // By default, additional properties are allowed
      return schema;
    },
  ],
  [
    ZodFirstPartyTypeKind.ZodRecord,
    (def: ZodRecordDef) => ({
      bsonType: "object",
      additionalProperties:
        def.valueType._def.typeName === ZodFirstPartyTypeKind.ZodAny
          ? true
          : parseDef(def.valueType._def.typeName, def.valueType._def),
    }),
  ],
  [
    ZodFirstPartyTypeKind.ZodArray,
    (def: ZodArrayDef) => {
      const schema: JSONSchema = { bsonType: "array" };
      if (def.type?._def?._typeName !== ZodFirstPartyTypeKind.ZodAny)
        schema.items = parseDef(def.type._def.typeName, def?.type._def);
      if (def.minLength) schema.minItems = def.minLength.value;
      if (def.maxLength) schema.maxItems = def.maxLength.value;
      return schema;
    },
  ],
  [
    ZodFirstPartyTypeKind.ZodTuple,
    (def: ZodTupleDef<ZodTupleItems | [], ZodTypeAny | null>) => ({
      bsonType: "array",
      items: def.items.map((schema: ZodTypeAny) =>
        parseDef(schema._def.typeName, schema._def),
      ),
      additionalItems: def.rest
        ? parseDef(def.rest._def, def.rest._def.typeName)
        : false,
      minItems: def.items.length,
      ...(def.rest && { maxItems: def.items.length }),
    }),
  ],
  [
    ZodFirstPartyTypeKind.ZodSet,
    (def: ZodSetDef) => {
      const schema: JSONSchema = {
        bsonType: "array",
        uniqueItems: true,
      };
      if (def.valueType?._def.typeName !== ZodFirstPartyTypeKind.ZodAny)
        schema.items = parseDef(
          def.valueType._def.typeName,
          def.valueType._def,
        );
      if (def.minSize) schema.minItems = def.minSize.value;
      if (def.maxSize) schema.maxItems = def.maxSize.value;
      return schema;
    },
  ],
  [
    ZodFirstPartyTypeKind.ZodMap,
    (def: ZodMapDef) => ({
      bsonType: "array",
      items: {
        bsonType: "array",
        items: [
          parseDef(def.keyType._def.typeName, def.keyType._def),
          parseDef(def.valueType._def.typeName, def.valueType._def),
        ],
        minItems: 2,
        maxItems: 2,
      },
    }),
  ],
];

const defParsers = new Map(DefParsers);

const parseDef = (
  typeName: ZodFirstPartyTypeKind,
  def: ZodTypeDef,
): JSONSchema => {
  const parser = defParsers.get(typeName);
  if (!parser) throw new Error(`No parser for type ${typeName}`);
  const parsed = parser(def);
  if (def.description) parsed.description = def.description;
  return parsed;
};

export const parseSchema = (schema: ZodTypeAny, title?: string): JSONSchema => {
  const parsed = parseDef(schema._def.typeName, schema._def);
  if (title) parsed.title = title;
  return parsed;
};
