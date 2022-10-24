import type { IndexDirection } from "mongodb";

import type { Cls } from "../common-types";
import type {
  EnumOptions,
  NativeEnumPropOptions,
  NumberOptions,
  PropOptions,
  StringOptions,
  ObjectOptions,
  ArrayOptions,
  SetOptions,
  MapOptions,
  RawOptions,
} from "./prop-options";

export enum PropDefinitionType {
  Any = "any",
  Raw = "raw",

  Bool = "bool",
  String = "string",
  Number = "number",
  BigInt = "bigint",
  Date = "date",
  Enum = "enum",
  NativeEnum = "nativeEnum",

  Object = "object",
  Array = "array",
  Set = "set",
  Map = "map",
}

export type PropDetails = {
  description?: string;
  defaultValue?: unknown;
  nullable?: boolean;
  optional?: boolean;
};

export type PropIndex = {
  direction?: IndexDirection;
  passthrough?: boolean;
  exclude?: boolean;
  unique?: boolean;
  sparse?: boolean;
};

export type PropDefinition = {
  propertyKey: string;
  type?: PropDefinitionType;
  options?: any;
  index?: PropIndex;
  details?: PropDetails;
};

const clsPropDefinitions = new WeakMap<Cls, PropDefinition[]>();

export const getPropDefinitions = (cls: Cls) => clsPropDefinitions.get(cls);

const setPropDefinition = (cls: Cls, definition: PropDefinition) => {
  const definitions = clsPropDefinitions.get(cls) || [];
  const existingDefinition = definitions.find(
    (def) => def.propertyKey === definition.propertyKey,
  );
  if (existingDefinition) Object.assign(existingDefinition, definition);
  else definitions.push(definition);
  clsPropDefinitions.set(cls, definitions);
};

const setPropOptions = (
  cls: Cls,
  propertyKey: string,
  type: PropDefinitionType,
  options?: PropOptions,
) => setPropDefinition(cls, { propertyKey, type, options });

const setPropDetails = (cls: Cls, propertyKey: string, details: PropDetails) =>
  setPropDefinition(cls, { propertyKey, details });

const setPropIndex = (cls: Cls, propertyKey: string, index: PropIndex = {}) =>
  setPropDefinition(cls, { propertyKey, index });

export const Prop = {
  Details: (details: PropDetails) => (target: any, propertyKey: string) =>
    setPropDetails(target.constructor, propertyKey, details),
  Index: (index?: PropIndex) => (target: any, propertyKey: string) =>
    setPropIndex(target.constructor, propertyKey, index),

  // Wildcards
  Any: () => (target: any, propertyKey: string) =>
    setPropOptions(target.constructor, propertyKey, PropDefinitionType.Any),
  Raw: (options?: RawOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.Raw,
      options,
    ),

  Bool: () => (target: any, propertyKey: string) =>
    setPropOptions(target.constructor, propertyKey, PropDefinitionType.Bool),

  String: (options?: StringOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.String,
      options,
    ),
  Number: (options?: NumberOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.Number,
      options,
    ),
  Enum: (options?: EnumOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.Enum,
      options,
    ),
  NativeEnum:
    (options?: NativeEnumPropOptions) => (target: any, propertyKey: string) =>
      setPropOptions(
        target.constructor,
        propertyKey,
        PropDefinitionType.NativeEnum,
        options,
      ),
  Object: (options?: ObjectOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.Object,
      options,
    ),
  Array: (options?: ArrayOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.Array,
      options,
    ),
  Set: (options?: SetOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.Set,
      options,
    ),
  Map: (options?: MapOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.Map,
      options,
    ),

  // MongoDB Specific
  ObjectId: () => (target: any, propertyKey: string) =>
    setPropOptions(target.constructor, propertyKey, PropDefinitionType.String, {
      format: "objectId",
    }),
  BinData: () => (target: any, propertyKey: string) =>
    setPropOptions(target.constructor, propertyKey, PropDefinitionType.String, {
      format: "binData",
    }),
  Timestamp: () => (target: any, propertyKey: string) =>
    setPropOptions(target.constructor, propertyKey, PropDefinitionType.String, {
      format: "timestamp",
    }),
  Date: () => (target: any, propertyKey: string) =>
    setPropOptions(target.constructor, propertyKey, PropDefinitionType.Date),
};
