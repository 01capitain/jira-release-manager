import {
  assertDevEnv,
  createStages,
  iconFor,
  parseFlags,
  type StageType,
} from "../../scripts/dev-db-reset";

describe("createStages", () => {
  it("builds four stages with reseed enabled", () => {
    const stages = createStages({ reseed: true });
    expect(stages).toHaveLength(4);
    const [reset, init, push, seed] = stages;
    expect(reset).toMatchObject({
      type: "reset",
      command: "pnpm run db:push -- --force-reset",
      enabled: true,
    });
    expect(init).toMatchObject({
      type: "init",
      command: "pnpm run db:init",
      enabled: true,
    });
    expect(push).toMatchObject({
      type: "push",
      command: "pnpm run db:push",
      enabled: true,
    });
    expect(seed).toMatchObject({
      type: "seed",
      command: "pnpm run db:seed",
      enabled: true,
    });
  });

  it("disables the reseed stage when reseed=false", () => {
    const stages = createStages({ reseed: false });
    const seed = stages.at(-1);
    expect(seed?.enabled).toBe(false);
    expect(seed?.skipMessage).toMatch(/Skipping reseed/);
  });
});

describe("iconFor", () => {
  const cases: Array<[StageType, string]> = [
    ["reset", "🧹"],
    ["init", "⚙️"],
    ["push", "📦"],
    ["seed", "🌱"],
  ];

  it.each(cases)("returns %s icon for %s stage", (type, emoji) => {
    expect(iconFor({ type, status: "success" })).toBe(emoji);
  });

  it("returns ⏭ for skipped stages and ❌ for failures", () => {
    expect(iconFor({ type: "reset", status: "skipped" })).toBe("⏭");
    expect(iconFor({ type: "reset", status: "failed" })).toBe("❌");
  });
});

describe("parseFlags", () => {
  it("extracts reseed flag", () => {
    expect(parseFlags(["--reseed"])).toEqual({ reseed: true });
    expect(parseFlags([])).toEqual({ reseed: false });
  });

  it("exits the process on unknown flags", () => {
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() => parseFlags(["--unknown"])).toThrow("exit");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unknown flag"),
    );
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe("assertDevEnv", () => {
  it("allows development environment", () => {
    expect(() => assertDevEnv("development")).not.toThrow();
  });

  it("exits the process when NODE_ENV differs", () => {
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() => assertDevEnv("production")).toThrow("exit");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Refusing to reset DB"),
    );
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
