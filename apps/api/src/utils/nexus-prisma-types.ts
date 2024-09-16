import { upperFirst } from "lodash";
import { core, nullable, list, nonNull, inputObjectType, enumType } from "nexus";
import { findModel } from "./prisma";

const RelationFilterMixin = (t: core.InputDefinitionBlock<any>, relation: string) => {
  const type = `${relation}WhereInput`;
  t.field({ name: "is", type: nullable(type) });
  t.field({ name: "isNot", type: nullable(type) });
};

const ListRelationFilterMixin = (t: core.InputDefinitionBlock<any>, relation: string) => {
  const type = `${relation}WhereInput`;
  t.field({ name: "every", type: nullable(type) });
  t.field({ name: "some", type: nullable(type) });
  t.field({ name: "none", type: nullable(type) });
};

export const ModelWhereMixin = (t: core.InputDefinitionBlock<any>, relation: string) => {
  const type = `${relation}WhereInput`;
  t.field({ name: "AND", type: nullable(list(nonNull(type))) });
  t.field({ name: "OR", type: nullable(list(nonNull(type))) });
  t.field({ name: "NOT", type: nullable(list(nonNull(type))) });
};

const FilterMixin = (t: core.InputDefinitionBlock<any>, type: "String" | "Int" | "DateTime") => {
  t.field({ name: "equals", type: nullable(type) });
  t.field({ name: "in", type: nullable(list(nonNull(type))) });
  t.field({ name: "notIn", type: nullable(list(nonNull(type))) });
  t.field({ name: "lt", type: nullable(type) });
  t.field({ name: "lte", type: nullable(type) });
  t.field({ name: "gt", type: nullable(type) });
  t.field({ name: "gte", type: nullable(type) });
  t.field({ name: "not", type: nullable(`Nested${upperFirst(type)}Filter`) });
};

export const NestedStringFilter = inputObjectType({
  name: "NestedStringFilter",
  definition(t) {
    FilterMixin(t, "String");

    t.nullable.string("contains");
    t.nullable.string("startsWith");
    t.nullable.string("endsWith");
  },
});

export const NestedIntFilter = inputObjectType({
  name: "NestedIntFilter",
  definition(t) {
    FilterMixin(t, "Int");
  },
});

export const IntFilter = inputObjectType({
  name: "IntFilter",
  definition(t) {
    FilterMixin(t, "Int");
  },
});

export const NestedDateTimeFilter = inputObjectType({
  name: "NestedDateTimeFilter",
  definition(t) {
    FilterMixin(t, "DateTime");
  },
});

export const DateTimeFilter = inputObjectType({
  name: "DateTimeFilter",
  definition(t) {
    FilterMixin(t, "DateTime");
  },
});
export const StringFilter = inputObjectType({
  name: "StringFilter",
  definition(t) {
    FilterMixin(t, "String");

    t.nullable.string("contains");
    t.nullable.string("startsWith");
    t.nullable.string("endsWith");

    t.field({
      name: "mode",
      type: nullable(
        enumType({
          name: "QueryMode",
          members: ["default", "insensitive"],
        })
      ),
    });
  },
});

export const createListRelationFilter = (type: string) => {
  const model = findModel(type);
  const inputType = inputObjectType({
    name: `${type}ListRelationFilter`,
    definition(t) {
      ListRelationFilterMixin(t, type);
    },
  });
  return inputType;
};

export const createRelationFilter = (type: string) => {
  const model = findModel(type);
  const inputType = inputObjectType({
    name: `${type}RelationFilter`,
    definition(t) {
      RelationFilterMixin(t, type);
    },
  });
  return inputType;
};
