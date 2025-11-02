import { userFixtures } from "./users";

const EXPECTED = {
  adamScott: { name: "Adam Scott", email: "adam.scott@example.com" },
  melanieMayer: { name: "Melanie Mayer", email: undefined },
} as const;

type ExpectedKey = keyof typeof EXPECTED;

describe("userFixtures", () => {
  it("exports the expected user keys", () => {
    expect(Object.keys(userFixtures).sort()).toEqual(
      Object.keys(EXPECTED).sort(),
    );
  });

  for (const [key, expected] of Object.entries(EXPECTED) as Array<
    [ExpectedKey, (typeof EXPECTED)[ExpectedKey]]
  >) {
    it(`keeps attributes stable for ${key}`, () => {
      expect(userFixtures).toHaveProperty(key);
      const fixture = userFixtures[key];
      expect(fixture.name).toBe(expected.name);
      expect(fixture.email).toBe(expected.email);
    });
  }
});
