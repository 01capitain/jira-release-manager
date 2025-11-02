type InternalUserFixture = {
  id: string;
  name: string;
  email?: string;
};

const USERS = {
  adamScott: {
    id: "018f1a50-0000-7000-9000-000000000201",
    name: "Adam Scott",
    email: "adam.scott@example.com",
  },
  melanieMayer: {
    id: "018f1a50-0000-7000-9000-000000000202",
    name: "Melanie Mayer",
    email: undefined,
  },
} satisfies Record<string, InternalUserFixture>;

export type UserFixtureKey = keyof typeof USERS;
export type UserFixture = (typeof USERS)[UserFixtureKey];

export const userFixtures = Object.freeze(USERS) as Record<
  UserFixtureKey,
  UserFixture
>;

export const userFixtureList = Object.freeze(Object.values(userFixtures));
