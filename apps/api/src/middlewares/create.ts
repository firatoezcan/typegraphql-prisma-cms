import { subject } from "@casl/ability";
import { PrismaQuery } from "@casl/prisma";
import { Prisma } from "@prisma/client";
import { NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { AppAbility, createUserCreateAbility } from "../utils/permissions";
import _ from "lodash";

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

  // This goes through the defined CASL condition for the given model and creates an array shape so we can know what
  // we need to join later when checking for permissions
  type Result = Array<Result | string>;
  const getRelationsFromCondition = (condition?: PrismaQuery, parent?: string) => {
    if (!condition) return;
    const models: string[] = [];
    const allModels = Object.entries(condition).map(([key, value]) => {
      if (value === null || typeof value !== "object") return undefined;
      if (parent && ["is", "isNot", "every", "none", "some"].includes(key)) {
        models.push(parent);
      }
      if (Array.isArray(value)) {
        return value.map((v) => getRelationsFromCondition(v, key));
      }
      const res = getRelationsFromCondition(value, key);

      return res;
    });
    const containsArray = ["OR", "AND"].includes(parent as string);
    const result = [...models, ...allModels.flat(containsArray ? 2 : 1)].filter(Boolean);
    return result;
  };
  const modelRules = ability.possibleRulesFor("create", modelName as Prisma.ModelName)[0];
  const modelsInPermission = getRelationsFromCondition(modelRules.conditions) as Result;

  const createInclude = (relation: string) => {
    const startIndex = modelsInPermission.findIndex((entry) => entry === relation);
    if (startIndex === -1) return {};

    let shouldStop = false;
    let endIndex = startIndex;
    while (!shouldStop) {
      endIndex++;
      const next = modelsInPermission[endIndex];
      // If this happens we reached the next include tree for another model or the end
      if (typeof next === "string" || typeof next === "undefined") {
        shouldStop = true;
        continue;
      }
    }
    const permissionSlice = modelsInPermission.slice(startIndex + 1, endIndex);
    const slicesWithInclude = permissionSlice.map((slice) => {
      if (!Array.isArray(slice)) return undefined;
      const include = slice.reverse().reduce((acc, cur) => {
        if (typeof cur !== "string") {
          debugger;
          throw new Error("Open the debugger");
        }
        return {
          [cur]: Object.keys(acc).length > 0 ? { include: acc } : true,
        };
      }, {});
      return include;
    });

    const includeObj: Record<any, any> = {};
    slicesWithInclude.forEach((slice) => {
      _.defaultsDeep(includeObj, slice);
    });
    return includeObj;
  };

  // Handles explicit relation ids for createMany resolvers
  await Promise.all(
    relationFields.map(async (relation) => {
      const fromField = relation?.relationFromFields?.[0] as string;
      const toField = relation?.relationToFields?.[0] as string;
      if (typeof data[fromField] === "undefined") return;
      const relatedField = await prisma[relation.name].findUnique({
        where: { [toField]: data[fromField] },
        include: {
          ...createInclude(relation.name),
        },
      });
      entityToBeCreated[relation.name] = relatedField;
      entityToBeCreated[fromField] = relatedField[toField];
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
      const relatedField = await prisma[relation.name].findUnique({
        where: relationInput[action],
        include: {
          ...createInclude(relation.name),
        },
      });
      const fromField = relation?.relationFromFields?.[0] as string;
      const toField = relation?.relationToFields?.[0] as string;
      entityToBeCreated[relation.name] = relatedField;
      entityToBeCreated[fromField] = relatedField[toField];
    })
  );

  const canCreateEntity = ability.can("create", subject(modelName, entityToBeCreated));
  const rule = ability.relevantRuleFor("create", subject(modelName, entityToBeCreated));
  const reason = rule?.reason ?? `Not allowed to insert into ${modelName}`;
  if (!canCreateEntity) return [reason];

  // Todo: Type safety
  const relationResults = await relationFields
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
