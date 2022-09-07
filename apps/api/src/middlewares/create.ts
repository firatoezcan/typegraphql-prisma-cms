import { ForcedSubject, subject } from "@casl/ability";
import { accessibleBy } from "@casl/prisma";
import { PrismaClient, Prisma } from "@prisma/client";
import graphqlFields from "graphql-fields";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { AppAbility, createUserCreateAbility, createUserReadAbility } from "../utils/permissions";

type ActionType = "create" | "connect" | "createMany" | "connectOrCreate";

const checkModelInput = (
  ability: AppAbility,
  action: ActionType,
  parentModel: Prisma.DMMF.Model | undefined,
  modelName: string,
  data: any
) => {
  const prismaModel = Prisma.dmmf.datamodel.models.find((prismaModel) => prismaModel.name === modelName);
  if (!prismaModel) throw new Error(`Cannot find prisma model for model "${modelName}"`);

  // Create the entity as close to how we are going to get it in the database (good enough?)
  const entityToBeCreated: any = {};
  prismaModel.fields.forEach((field) => {
    if (field.kind === "scalar") {
      const key = field.name;
      const value = data[key];
      if (typeof value === "undefined") return;
      entityToBeCreated[key] = value;
    }
  });

  // // If we are in a relational create we add fields depending on the ActionType and how the relation is done
  // if (parentModel) {
  //   const parentRelationField = prismaModel.fields.find((field) => field.type === parentModel.name);
  //   // We assume a foreign key from a single column (is something else even possible?)
  //   const fromField = parentRelationField?.relationFromFields?.[0] as string;
  //   const toField = parentRelationField?.relationToFields?.[0] as string;
  // }
  const relationFields = prismaModel.fields.filter((field) => field.kind === "object");
  const relevantSubject = subject(modelName, entityToBeCreated);
  const canCreateEntity = ability.can("create", relevantSubject);
  const rule = ability.relevantRuleFor("create", relevantSubject);
  const reason = rule?.reason ?? `Not allowed to insert into ${modelName}`;
  if (!canCreateEntity) return [reason];
  const relationResults = relationFields
    .map((relation) => {
      const relationInput = data[relation.name];
      if (!relationInput) return null;
      const action = Object.keys(relationInput)[0] as ActionType;
      if (action === "createMany") {
        return relationInput[action].data.map((singleData) =>
          checkModelInput(ability, action, prismaModel, relation.type, singleData)
        );
      }
      if (action === "create") {
        return checkModelInput(ability, action, prismaModel, relation.type, relationInput[action]);
      }
      /**
       * Relational columns are not even exposed in the schema and can only be done via the connect action
       * which means we can then easily query for the to be connected entry, then add the necessary fields
       * with relationFrom and relationTo to the entityToBeChecked (this way we can inject the userId nicely with one query per item to be connected)
       * and run our authorization afterwards.
       *
       * Todo: Think about how to solve nested relations
       */
      throw new Error(`Unsupported action "${action}"`);
    })
    .filter((val) => val !== null);
  return [canCreateEntity, ...relationResults];
};

export const createCreateSingleMiddleware = (model: Prisma.ModelName) => {
  const CreateSingleMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const [sessionUser, createAbility] = await createUserCreateAbility(resolverData.context);

    const results = checkModelInput(createAbility, "create", undefined, model, resolverData.args.data);
    const flattedResults = [...new Set(results.flat(Infinity))];
    const invalidResults = flattedResults.filter((result) => typeof result === "string" || !result);
    if (invalidResults.length > 0) {
      throw new Error(invalidResults.join("\n"));
    }

    return next();
  };
  Object.defineProperty(CreateSingleMiddleware, "name", { value: `CreateSingle${model}Middleware` });
  return CreateSingleMiddleware;
};

export const createCreateManyMiddleware = (model: Prisma.ModelName) => {
  const CreateManyMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const [sessionUser, createAbility] = await createUserCreateAbility(resolverData.context);

    const results = resolverData.args.data.map((data) =>
      checkModelInput(createAbility, "create", undefined, model, data)
    );
    const flattedResults = [...new Set(results.flat(Infinity))];
    const invalidResults = flattedResults.filter((result) => typeof result === "string" || !result);
    if (invalidResults.length > 0) {
      throw new Error(invalidResults.join("\n"));
    }

    return next();
  };
  Object.defineProperty(CreateManyMiddleware, "name", { value: `CreateMany${model}Middleware` });
  return CreateManyMiddleware;
};
