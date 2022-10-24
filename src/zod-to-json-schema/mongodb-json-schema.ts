export type JSONSchemaSimpleType =
  | "array"
  | "boolean"
  | "null"
  | "number"
  | "object"
  | "string";

export type JSONSchemaBSONType =
  | "array"
  | "binData"
  | "bool"
  | "date"
  | "decimal"
  | "double"
  | "int"
  | "javascript"
  | "javascriptWithScope"
  | "long"
  | "maxKey"
  | "minKey"
  | "null"
  | "number"
  | "object"
  | "objectId"
  | "regex"
  | "string"
  | "timestamp";

export type MetaProperties = {
  title?: string;
  description?: string;
};

export type NumberProperties = {
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
};

export type StringProperties = {
  maxLength?: number;
  minLength?: number;
  pattern?: string;
};

export type ArrayProperties = {
  additionalItems?: boolean | JSONSchema;
  items?: JSONSchema | JSONSchema[];
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
};

export type ObjectProperties = {
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  properties?: { [key: string]: JSONSchema };
  patternProperties?: { [key: string]: JSONSchema };
  dependencies?: { [key: string]: JSONSchema | string[] };
};

export type EnumProperties = {
  enum?: any[];
};

export type TypeProperties = {
  type?: JSONSchemaSimpleType | JSONSchemaSimpleType[];
  bsonType?: JSONSchemaBSONType | JSONSchemaBSONType[];
};

export type CompositionProperties = {
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
};

export type JSONSchema = MetaProperties &
  NumberProperties &
  StringProperties &
  ArrayProperties &
  ObjectProperties &
  EnumProperties &
  TypeProperties &
  CompositionProperties;

/*
export type JSONSchema = {
  title?: string;
  description?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  additionalItems?: boolean | JSONSchema;
  items?: JSONSchema | JSONSchema[];
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  properties?: { [key: string]: JSONSchema };
  patternProperties?: { [key: string]: JSONSchema };
  dependencies?: { [key: string]: JSONSchema | string[] };
  enum?: any[];
  type?: JSONSchemaSimpleType | JSONSchemaSimpleType[];
  bsonType?: JSONSchemaBSONType | JSONSchemaBSONType[];
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
};
*/
