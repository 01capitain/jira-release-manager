import { releaseComponentFixtures } from "./release-components";

const EXPECTED_COMPONENTS = {
  iosApp: {
    id: "018f1a50-0000-7000-8000-000000000101",
    namingPattern: "app.ios.{patch}",
    releaseScope: "global",
  },
  androidApp: {
    id: "018f1a50-0000-7000-8000-000000000102",
    namingPattern: "app.android.{patch}",
    releaseScope: "global",
  },
  globalAdminPhp: {
    id: "018f1a50-0000-7000-8000-000000000103",
    namingPattern: "admin.{patch}",
    releaseScope: "global",
  },
  nestJsBackend: {
    id: "018f1a50-0000-7000-8000-000000000104",
    namingPattern: "backend.np.{patch}",
    releaseScope: "global",
  },
  desktopAngular: {
    id: "018f1a50-0000-7000-8000-000000000105",
    namingPattern: "desktop.np.{patch}",
    releaseScope: "global",
  },
  desktopAngularJs: {
    id: "018f1a50-0000-7000-8000-000000000106",
    namingPattern: "desktop.op.{patch}",
    releaseScope: "version-bound",
  },
  phpBackend: {
    id: "018f1a50-0000-7000-8000-000000000107",
    namingPattern: "backend.php.{patch}",
    releaseScope: "version-bound",
  },
} as const;

type ExpectedKey = keyof typeof EXPECTED_COMPONENTS;

describe("releaseComponentFixtures", () => {
  it("exposes the expected component keys", () => {
    const exportedKeys = Object.keys(releaseComponentFixtures).sort();
    const expectedKeys = Object.keys(EXPECTED_COMPONENTS).sort();

    expect(exportedKeys).toEqual(expectedKeys);
  });

  for (const [key, expected] of Object.entries(EXPECTED_COMPONENTS) as Array<
    [ExpectedKey, (typeof EXPECTED_COMPONENTS)[ExpectedKey]]
  >) {
    it(`locks attributes for ${key}`, () => {
      expect(releaseComponentFixtures).toHaveProperty(key);
      const fixture = releaseComponentFixtures[key];

      expect(fixture).toMatchObject(expected);
    });
  }
});
