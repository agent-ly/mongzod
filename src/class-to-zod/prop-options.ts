import type { ZodTypeAny } from "zod";

import type { Cls } from "../common-types";

export type RawOptions = { schema?: ZodTypeAny };

export type StringOptions = {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  format?:
    | "email"
    | "url"
    | "uuid"
    | "cuid"
    | "objectId"
    | "binData"
    | "timestamp";
};

export type NumberOptions = {
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
};

export type ObjectOptions = { type?: Cls };

export type ArrayOptions = {
  items?: Cls;
  minItems?: number;
  maxItems?: number;
};

export type SetOptions = {
  items?: Cls;
  minSize?: number;
  maxSize?: number;
};

export type MapOptions = { keys?: Cls; values?: Cls };

export type EnumOptions = { values?: readonly string[] };

export type NativeEnumPropOptions = {
  values?: {
    [key: string]: number | string;
    [id: number]: string;
  };
};

export type LiteralOptions = {
  value: any;
};

export type PropOptions =
  | RawOptions
  | StringOptions
  | NumberOptions
  | ObjectOptions
  | ArrayOptions
  | SetOptions
  | MapOptions
  | EnumOptions
  | NativeEnumPropOptions;
