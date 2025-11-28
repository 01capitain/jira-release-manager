import { releaseVersionFixtures } from "./release-versions";

describe("releaseVersionFixtures", () => {
  it("exports expected release version keys", () => {
    expect(Object.keys(releaseVersionFixtures).sort()).toEqual(
      ["version177", "version178", "version26_1"].sort(),
    );
  });

  it("keeps patch metadata for version 177 stable", () => {
    const version = releaseVersionFixtures.version177;
    expect(version).toBeDefined();
    const patchNames = version.patches.map((patch) => patch.name);
    expect(patchNames).toEqual(["177.0", "177.1", "177.2"]);

    const statusByName = Object.fromEntries(
      version.patches.map((patch) => [patch.name, patch.status]),
    );
    expect(statusByName["177.0"]).toBe("deprecated");
    expect(statusByName["177.1"]).toBe("active");
    expect(statusByName["177.2"]).toBe("in_development");
  });
});
