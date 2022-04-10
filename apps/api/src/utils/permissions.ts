import { AbilityBuilder, AbilityClass } from "@casl/ability";
import { accessibleBy, PrismaAbility, Subjects } from "@casl/prisma";
import {
  Award,
  Education,
  Interest,
  Language,
  Location,
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
const { can, cannot, build } = new AbilityBuilder(AppAbility);

export const createUserAbility = (context: Context) => {
  const userOneRelationAway = { user: { email: { equals: context.userEmail } } };

  can("read", "User", userOneRelationAway.user);
  can("read", "Location", userOneRelationAway);
  can("read", "Profile", userOneRelationAway);
  can("read", "Work", userOneRelationAway);
  can("read", "Volunteer", userOneRelationAway);
  can("read", "Education", userOneRelationAway);
  can("read", "Award", userOneRelationAway);
  can("read", "Publication", userOneRelationAway);
  can("read", "Skill", userOneRelationAway);
  can("read", "Language", userOneRelationAway);
  can("read", "Interest", userOneRelationAway);
  can("read", "Reference", userOneRelationAway);
  can("read", "Project", userOneRelationAway);
  can("read", "Award", userOneRelationAway);

  return build();
};
