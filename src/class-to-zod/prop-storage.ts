import type { IndexDirection } from "mongodb";

import type { Cls } from "../common-types";
import type { PropOptions } from "./prop-options";

export enum PropDefinitionType {
  Raw = "raw",
  Any = "any",

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

export const setPropOptions = (
  cls: Cls,
  propertyKey: string,
  type: PropDefinitionType,
  options?: PropOptions,
) => setPropDefinition(cls, { propertyKey, type, options });

export const setPropDetails = (
  cls: Cls,
  propertyKey: string,
  details: PropDetails,
) => setPropDefinition(cls, { propertyKey, details });

export const setPropIndex = (
  cls: Cls,
  propertyKey: string,
  index: PropIndex = {},
) => setPropDefinition(cls, { propertyKey, index });
