import test from "node:test";
import assert from "node:assert/strict";

import { ObjectId } from "mongodb";

import { Prop, buildModel } from "../src";

class Test {
  @Prop.Any()
  any: any;

  @Prop.Date()
  date: Date;
  @Prop.Bool()
  bool: boolean;
  @Prop.String()
  string: string;
  @Prop.Number()
  number: number;
  @Prop.Int()
  int: number;
  @Prop.Long()
  long: number;
  @Prop.Double()
  double: number;
  @Prop.Decimal()
  decimal: number;

  @Prop.Object()
  object: object;
  @Prop.Array()
  array: any[];
  @Prop.Set()
  set: Set<any>;
  @Prop.Map()
  map: Map<any, any>;

  @Prop.ObjectId()
  objectId: ObjectId;
}

const TestModel = buildModel(Test);

test("Test", async (t) => {
  await t.test("should match the following JSON schema", () => {
    assert.deepStrictEqual(TestModel.toJSON(), {
      bsonType: "object",
      additionalProperties: false,
      required: [
        "date",
        "bool",
        "string",
        "number",
        "int",
        "long",
        "double",
        "decimal",
        "object",
        "array",
        "set",
        "map",
      ],
      properties: {
        any: {},
        date: { bsonType: "date" },
        bool: { bsonType: "bool" },
        string: { bsonType: "string" },
        number: { bsonType: "number" },
        int: { bsonType: "int" },
        long: { bsonType: "long" },
        double: { bsonType: "double" },
        decimal: { bsonType: "decimal" },
        object: { bsonType: "object" },
        array: { bsonType: "array" },
        set: { bsonType: "array", uniqueItems: true },
        map: {
          bsonType: "array",
          items: { bsonType: "array", maxItems: 2, minItems: 2 },
        },
        objectId: { bsonType: "objectId" },
      },
    });
  });
});
