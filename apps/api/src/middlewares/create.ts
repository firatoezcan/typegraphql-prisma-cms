import { subject } from "@casl/ability";
import { Prisma } from "@prisma/client";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { createInclude } from "../utils/create-include";
import { AppAbility, createUserCreateAbility } from "../utils/permissions";

type ActionType = "create" | "connect" | "createMany" | "connectOrCreate";

const checkModelInput = async (
  context: Context,
  ability: AppAbility,
  action: ActionType,
  parentModel: Prisma.DMMF.Model | undefined,
  modelName: string,
  data: any
) => {
  const { prisma } = context;
  const findModel = (model: string) => Prisma.dmmf.datamodel.models.find((prismaModel) => prismaModel.name === model);
  const prismaModel = findModel(modelName);
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

  const relationFields = prismaModel.fields.filter((field) => field.kind === "object");

  // Check if the columns are even allowed to be inserted
  // We include columns that are going to be created due to `connect` actions
  const keys = [
    ...Object.keys(entityToBeCreated),
    ...relationFields.map((relation) => {
      const relationInput = data[relation.name];
      if (!relationInput) return undefined;
      const action = Object.keys(relationInput)[0] as ActionType;
      // We only need to include data into the entity when it's a connect action
      if (action !== "connect") return undefined;
      return relation?.relationFromFields?.[0];
    }),
  ];
  const columnReasons = keys.map((key) => {
    if (!key) return false;
    const canCreateColumn = ability.can("insert", subject(modelName, entityToBeCreated), key);
    const rule = ability.relevantRuleFor("insert", subject(modelName, entityToBeCreated), key);
    return canCreateColumn || (rule?.reason ?? `Not allowed to insert column "${key}"`);
  });
  if (columnReasons.some((reason) => typeof reason === "string")) {
    return columnReasons;
  }

  /**
   * Todo: Add default columns from session variables (f.e.) userId to created orders
   * This comes after checking the input columns as a valid use-case would be to deny the user
   * to set the userId for orders but have it set by us
   */

  const modelRules = ability.possibleRulesFor("create", modelName as Prisma.ModelName)[0];

  const getRelatedField = async (relation: Prisma.DMMF.Field, where: any) => {
    const fromField = relation?.relationFromFields?.[0] as string;
    const toField = relation?.relationToFields?.[0] as string;

    const include = createInclude(modelRules.conditions, relation.name);
    const relatedField = await prisma[relation.name].findUnique({
      where,
      ...(include && { include }),
    });
    return {
      [relation.name]: relatedField,
      [fromField]: relatedField[toField],
    };
  };

  // Handles explicit relation ids for createMany resolvers
  await Promise.all(
    relationFields.map(async (relation) => {
      const fromField = relation?.relationFromFields?.[0] as string;
      const toField = relation?.relationToFields?.[0] as string;
      if (typeof data[fromField] === "undefined") return;
      Object.assign(entityToBeCreated, await getRelatedField(relation, { [toField]: data[fromField] }));
    })
  );

  // Handles connect syntax
  // Potential memory leak?
  await Promise.all(
    relationFields.map(async (relation) => {
      const relationInput = data[relation.name];
      if (!relationInput) return null;
      const action = Object.keys(relationInput)[0] as ActionType;
      // We only need to include data into the entity when it's a connect action
      if (action !== "connect") return;
      Object.assign(entityToBeCreated, await getRelatedField(relation, relationInput[action]));
    })
  );

  const canCreateEntity = ability.can("create", subject(modelName, entityToBeCreated));
  const rule = ability.relevantRuleFor("create", subject(modelName, entityToBeCreated));
  const reason = rule?.reason ?? `Not allowed to insert into ${modelName}`;
  if (!canCreateEntity) return [reason];

  // Todo: Type safety
  const relationResults = relationFields
    .map((relation) => {
      const relationInput = data[relation.name];
      if (!relationInput) return null;
      const action = Object.keys(relationInput)[0] as ActionType;
      if (action === "connectOrCreate") throw new Error("connectOrCreate is not supported");
      // Already handled above
      if (action === "connect") {
        return true;
      }
      if (action === "createMany") {
        return relationInput[action].data.map((singleData) =>
          checkModelInput(context, ability, action, prismaModel, relation.type, singleData)
        );
      }
      if (action === "create") {
        return checkModelInput(context, ability, action, prismaModel, relation.type, relationInput[action]);
      }

      throw new Error(`Unsupported action "${action}"`);
    })
    .filter((val) => val !== null);
  return [canCreateEntity, ...relationResults];
};

export const createCreateSingleMiddleware = (model: Prisma.ModelName) => {
  const CreateSingleMiddleware = async (resolverData: ResolverData<Context>, next: NextFn) => {
    const [sessionUser, createAbility] = await createUserCreateAbility(resolverData.context);

    const results = await checkModelInput(
      resolverData.context,
      createAbility,
      "create",
      undefined,
      model,
      resolverData.args.data
    );
    const flattedResults = await Promise.all([...new Set(results.flat(Infinity))]);
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
    const { data } = resolverData.args;
    const dataArray = Array.isArray(data) ? data : [data];

    const results = await Promise.all(
      dataArray.map((singleData) =>
        checkModelInput(resolverData.context, createAbility, "create", undefined, model, singleData)
      )
    );
    const flattedResults = await Promise.all([...new Set(results.flat(Infinity))]);
    const invalidResults = flattedResults.filter((result) => typeof result === "string" || !result);
    if (invalidResults.length > 0) {
      throw new Error(invalidResults.join("\n"));
    }

    return next();
  };
  Object.defineProperty(CreateManyMiddleware, "name", { value: `CreateMany${model}Middleware` });
  return CreateManyMiddleware;
};
