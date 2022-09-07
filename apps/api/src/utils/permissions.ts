import { AbilityBuilder, AbilityClass } from "@casl/ability";
import { accessibleBy, PrismaAbility, Subjects } from "@casl/prisma";
import {
  Award,
  Education,
  Interest,
  Language,
  Location,
  NestedProjectLevel1,
  NestedProjectLevel2,
  Prisma,
  Profile,
  Project,
  Publication,
  Reference,
  Skill,
  User,
  Volunteer,
  Work,
} from "@prisma/client";
import { time } from "console";
import { Context } from "..";

export type AppAbility = PrismaAbility<
  [
    "read" | "create",
    Subjects<{
      User: User;
      Location: Location;
      Profile: Profile;
      Work: Work;
      Volunteer: Volunteer;
      Education: Education;
      Award: Award;
      Publication: Publication;
      Skill: Skill;
      Language: Language;
      Interest: Interest;
      Reference: Reference;
      Project: Project;
      NestedProjectLevel1: NestedProjectLevel1;
      NestedProjectLevel2: NestedProjectLevel2;
    }>
  ]
>;

const AppAbility = PrismaAbility as AbilityClass<AppAbility>;

const readCache: Map<string, AppAbility> = new Map();

export const createUserReadAbility = async (context: Context) => {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);

  const { userEmail, prisma } = context;
  if (!userEmail) {
    // Todo: Public only
    return build();
  }
  if (readCache.has(userEmail)) {
    return readCache.get(userEmail) as AppAbility;
  }

  const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
  if (!user) {
    throw new Error(`Couldn't find user with email "${userEmail}"`);
  }

  // Todo: Generate this in a smart way depending on the location of the models
  can("read", "User");
  can("read", "Location", { userId: { equals: user.id } });
  can("read", "Profile", { userId: { equals: user.id } });
  can("read", "Work", { userId: { equals: user.id } });
  can("read", "Volunteer", { userId: { equals: user.id } });
  can("read", "Education", { userId: { equals: user.id } });
  can("read", "Award", { userId: { equals: user.id } });
  can("read", "Publication", { userId: { equals: user.id } });
  can("read", "Skill", { userId: { equals: user.id } });
  can("read", "Language", { userId: { equals: user.id } });
  can("read", "Interest", { userId: { equals: user.id } });
  can("read", "Reference", { userId: { equals: user.id } });
  can("read", "Project", { userId: { equals: user.id } });

  const ability = build();
  readCache.set(userEmail, ability);
  return ability;
};

const createCache: Map<string, AppAbility> = new Map();

export const createUserCreateAbility = async (context: Context) => {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);

  const { userEmail, prisma } = context;
  if (!userEmail) {
    can("create", "User");
    cannot("create", "User", ["id"]).because(`Cannot manually insert "id"`);
    cannot("create", "User", { email: { not: { endsWith: "@gmail.com" } } }).because(
      `Email has to end with "@gmail.com"`
    );
    // Todo: Public only
    return [undefined, build()] as const;
  }

  const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
  if (!user) {
    throw new Error(`Couldn't find user with email "${userEmail}"`);
  }

  if (createCache.has(userEmail)) {
    return [user, createCache.get(userEmail) as AppAbility] as const;
  }

  // Only allow gmail.com emails
  can("create", "User");
  // cannot("create", "User");

  cannot("create", "Location", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Profile", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Work", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Volunteer", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Education", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Award", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Publication", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Skill", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Language", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Interest", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Reference", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);
  cannot("create", "Project", ["id", "userId"]).because(`Cannot manually insert "id" or "userId"`);

  const ability = build();
  createCache.set(userEmail, ability);
  return [user, ability] as const;
};
