import { AbilityBuilder, AbilityClass } from "@casl/ability";
import { accessibleBy, PrismaAbility, Subjects } from "@casl/prisma";
import {
  Award,
  Education,
  Interest,
  Language,
  Location,
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
import { MiddlewareInterface, NextFn, ResolverData } from "type-graphql";
import { Context } from "..";

type AppAbility = PrismaAbility<
  [
    "read",
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
    }>
  ]
>;

const AppAbility = PrismaAbility as AbilityClass<AppAbility>;

const cache: Map<string, AppAbility> = new Map();

export const createUserAbility = async (context: Context) => {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);

  const { userEmail, prisma } = context;
  if (!userEmail) {
    // Todo: Public only
    return build();
  }
  if (cache.has(userEmail)) {
    return cache.get(userEmail) as AppAbility;
  }

  const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { email: true } });
  if (!user) {
    throw new Error(`Couldn't find user with email "${userEmail}"`);
  }

  const userPermission: Prisma.UserWhereInput = { email: { equals: userEmail } };

  // Todo: Generate this in a smart way depending on the location of the models
  can("read", "User");
  can("read", "Location", { user: { is: userPermission } });
  can("read", "Profile", { user: { is: userPermission } });
  can("read", "Work", { user: { is: userPermission } });
  can("read", "Volunteer", { user: { is: userPermission } });
  can("read", "Education", { user: { is: userPermission } });
  can("read", "Award", { user: { is: userPermission } });
  can("read", "Publication", { user: { is: userPermission } });
  can("read", "Skill", { user: { is: userPermission } });
  can("read", "Language", { user: { is: userPermission } });
  can("read", "Interest", { user: { is: userPermission } });
  can("read", "Reference", { user: { is: userPermission } });
  can("read", "Project", { user: { is: userPermission } });
  can("read", "Award", { user: { is: userPermission } });

  const ability = build();
  cache.set(userEmail, ability);
  return ability;
};
