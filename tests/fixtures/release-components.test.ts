import { releaseComponentFixtures } from "./release-components";

const EXPECTED_COMPONENTS = {
  iosApp: {
    id: "018f1a50-0000-7000-8000-000000000101",
    namingPattern: "app.ios.{built_version}",
    releaseScope: "global",
  },
  androidApp: {
    id: "018f1a50-0000-7000-8000-000000000102",
    namingPattern: "app.android.{built_version}",
    releaseScope: "global",
  },
  globalAdminPhp: {
    id: "018f1a50-0000-7000-8000-000000000103",
    namingPattern: "admin.{built_version}",
    releaseScope: "global",
  },
  nestJsBackend: {
    id: "018f1a50-0000-7000-8000-000000000104",
    namingPattern: "backend.np.{built_version}",
    releaseScope: "global",
  },
  desktopAngular: {
    id: "018f1a50-0000-7000-8000-000000000105",
    namingPattern: "desktop.np.{built_version}",
    releaseScope: "global",
  },
  desktopAngularJs: {
    id: "018f1a50-0000-7000-8000-000000000106",
    namingPattern: "desktop.op.{built_version}",
    releaseScope: "version-bound",
  },
  phpBackend: {
    id: "018f1a50-0000-7000-8000-000000000107",
    namingPattern: "backend.php.{built_version}",
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
