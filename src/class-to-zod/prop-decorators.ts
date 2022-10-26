import type { IndexDirection } from "mongodb";

import type {
  EnumOptions,
  NumberOptions,
  StringOptions,
  ObjectOptions,
  ArrayOptions,
  SetOptions,
  MapOptions,
  RawOptions,
  AnyOptions,
} from "./prop-options";
import type { PropDetails, PropIndex } from "./prop-storage";
import {
  PropDefinitionType,
  setPropDetails,
  setPropIndex,
  setPropOptions,
} from "./prop-storage";

export const Prop = {
  Details: (details: PropDetails) => (target: any, propertyKey: string) =>
    setPropDetails(target.constructor, propertyKey, details),
  Index: (index?: PropIndex) => (target: any, propertyKey: string) =>
    setPropIndex(target.constructor, propertyKey, index),

  Raw: (options: RawOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.Raw,
      options,
    ),
  Any: (options?: AnyOptions) => (target: any, propertyKey: string) =>
    setPropOptions(
      target.constructor,
      propertyKey,
      PropDefinitionType.Any,
      options,
    ),

  Date: () => (target: any, propertyKey: string) =>
    setPropOptions(target.constructor, propertyKey, PropDefinitionType.Date),
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
      Array.isArray(options)
        ? PropDefinitionType.Enum
        : PropDefinitionType.NativeEnum,
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

  ObjectId: () => Prop.Any({ type: "objectId" }),
  Double: (options?: NumberOptions) =>
    Prop.Number({ ...options, type: "double" }),
  Decimal: (options?: NumberOptions) =>
    Prop.Number({ ...options, type: "decimal" }),
  Int: (options?: NumberOptions) => Prop.Number({ ...options, type: "int" }),
  Long: (options?: NumberOptions) => Prop.Number({ ...options, type: "long" }),
};
