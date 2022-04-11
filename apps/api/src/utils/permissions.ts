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

export const createUserAbility = (context: Context) => {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);
  const userPermission: Prisma.UserWhereInput = { email: { equals: context.userEmail } };

  // Todo: Generate this in a smart way depending on the location of the models
  can("read", "User", userPermission);
  can("read", "Location", { user: userPermission });
  can("read", "Profile", { user: userPermission });
  can("read", "Work", { user: userPermission });
  can("read", "Volunteer", { user: userPermission });
  can("read", "Education", { user: userPermission });
  can("read", "Award", { user: userPermission });
  can("read", "Publication", { user: userPermission });
  can("read", "Skill", { user: userPermission });
  can("read", "Language", { user: userPermission });
  can("read", "Interest", { user: userPermission });
  can("read", "Reference", { user: userPermission });
  can("read", "Project", { user: userPermission });
  can("read", "Award", { user: userPermission });

  return build();
};
