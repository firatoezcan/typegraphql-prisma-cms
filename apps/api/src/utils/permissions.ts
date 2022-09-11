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
    "read" | "create" | "insert",
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
  can("read", "User", { id: { equals: user.id } });
  can("read", "Location", { userId: { equals: user.id } });
  can("read", "Profile", { userId: { equals: user.id } });
  can("read", "Work", { userId: { equals: user.id } });
  can("read", "Volunteer", { userId: { equals: user.id } });
  can("read", "Education", { userId: { equals: user.id } });
  can("read", "Award", { project: { is: { userId: { equals: user.id } } } });
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
  cannot("create", "User");
  // cannot("create", "User");

  // Both syntaxes work
  // can("create", "Work", { userId: user.id });
  // Todo: Column permissions should be opt-in instead of opt-out
  can("insert", "Work", ["**"]);
  cannot("insert", "Work", ["highlights"]).because("Highlights is a premium only feature");

  /**
   * Create work when connected user
   * has Frontend Skill Category OR
   * some profile with linkedIn OR
   * lives in Country DE AND has label Developer
   */
  can("create", "Work", {
    user: {
      is: {
        AND: [
          {
            id: user.id,
          },
          {
            OR: [
              {
                location: {
                  is: {
                    user: {
                      is: {
                        skills: {
                          some: {
                            category: { equals: "Frontend" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              {
                profiles: {
                  some: {
                    network: { equals: "LinkedIn" },
                  },
                },
              },
              {
                AND: [
                  {
                    location: {
                      is: {
                        countryCode: "DE",
                        user: {
                          is: {
                            firstName: {
                              equals: "Firat",
                            },
                          },
                        },
                      },
                    },
                  },
                  { label: { contains: "Developer" } },
                ],
              },
            ],
          },
        ],
      },
    },
  });
  can("insert", "Location", ["**"]);
  can("create", "Location", { userId: { equals: user.id } });
  can("insert", "Profile", ["**"]);
  can("create", "Profile", { userId: { equals: user.id } });
  can("insert", "Volunteer", ["**"]);
  can("create", "Volunteer", { userId: { equals: user.id } });
  can("insert", "Education", ["**"]);
  can("create", "Education", { userId: { equals: user.id } });
  can("insert", "Award", ["**"]);
  can("create", "Award", { project: { is: { user: { is: { id: { equals: user.id } } } } } });
  can("insert", "Publication", ["**"]);
  can("create", "Publication", { userId: { equals: user.id } });
  can("insert", "Skill", ["**"]);
  can("create", "Skill", { userId: { equals: user.id } });
  can("insert", "Language", ["**"]);
  can("create", "Language", { userId: { equals: user.id } });
  can("insert", "Interest", ["**"]);
  can("create", "Interest", { userId: { equals: user.id } });
  can("insert", "Reference", ["**"]);
  can("create", "Reference", { userId: { equals: user.id } });
  can("insert", "Project", ["**"]);
  can("create", "Project", { userId: { equals: user.id } });
  const ability = build();
  createCache.set(userEmail, ability);
  return [user, ability] as const;
};
