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
    string,
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

export const createUserAbility = async (context: Context) => {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);

  const { userEmail, prisma } = context;
  if (!userEmail) {
    return build();
  }

  const userPermission: Prisma.UserWhereInput = { email: { equals: userEmail } };

  // Todo: Generate this in a smart way depending on the location of the models
  can("read", "User", userPermission);

  const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
  if (!user) {
    throw new Error(`Couldn't find user with email "${userEmail}"`);
  }
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
  can("read", "Award", { userId: { equals: user.id } });

  // This doesnt actually work
  // can("read", "Location", { user: userPermission });
  // can("read", "Profile", { user: userPermission });
  // can("read", "Work", { user: userPermission });
  // can("read", "Volunteer", { user: userPermission });
  // can("read", "Education", { user: userPermission });
  // can("read", "Award", { user: userPermission });
  // can("read", "Publication", { user: userPermission });
  // can("read", "Skill", { user: userPermission });
  // can("read", "Language", { user: userPermission });
  // can("read", "Interest", { user: userPermission });
  // can("read", "Reference", { user: userPermission });
  // can("read", "Project", { user: userPermission });
  // can("read", "Award", { user: userPermission });

  return build();
};
