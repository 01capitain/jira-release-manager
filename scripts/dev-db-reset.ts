#!/usr/bin/env tsx

/* eslint-env node */
import { spawn } from "node:child_process";

if (typeof process.loadEnvFile === "function") {
  process.loadEnvFile();
}

export type StageType = "reset" | "init" | "push" | "seed";

export type Stage = {
  type: StageType;
  label: string;
  command: string;
  summary: string;
  spinnerText: string;
  enabled: boolean;
  skipMessage?: string;
};

type StageResult = Stage & {
  status: "success" | "failed" | "skipped";
  output: string;
};

const results: StageResult[] = [];

const grey = (text: string) => `\u001b[90m${text}\u001b[0m`;
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerLineInitialized = false;
let activeSpinnerStopper: (() => void) | null = null;

export function createStages(options: { reseed: boolean }): Stage[] {
  return [
    {
      type: "reset",
      label: "pnpm run db:push -- --force-reset",
      command: "pnpm run db:push -- --force-reset",
      summary: "Database schema was reset",
      spinnerText: "Resetting database schema...",
      enabled: true,
    },
    {
      type: "init",
      label: "pnpm run db:init",
      command: "pnpm run db:init",
      summary: "Database extensions were initialized",
      spinnerText: "Ensuring DB extensions...",
      enabled: true,
    },
    {
      type: "push",
      label: "pnpm run db:push",
      command: "pnpm run db:push",
      summary: "Database schema was updated",
      spinnerText: "Pushing Prisma schema...",
      enabled: true,
    },
    {
      type: "seed",
      label: "pnpm run db:seed",
      command: "pnpm run db:seed",
      summary: "Fixture data was reseeded",
      spinnerText: "Seeding fixtures...",
      enabled: options.reseed,
      skipMessage: "Skipping reseed (pass --reseed to apply fixtures).",
    },
  ];
}

function startSpinner(message: string) {
  let frameIndex = 0;
  if (!spinnerLineInitialized) {
    process.stdout.write("\n");
    spinnerLineInitialized = true;
  }
  const render = () => {
    const frame = spinnerFrames[frameIndex];
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
    process.stdout.write(`\r${frame} ${message}`);
  };
  render();
  const interval = setInterval(render, 120);
  return () => {
    clearInterval(interval);
    process.stdout.write("\r");
    const clearLine = " ".repeat(message.length + 4);
    process.stdout.write(`${clearLine}\r`);
  };
}

function stopSpinner() {
  if (activeSpinnerStopper) {
    activeSpinnerStopper();
    activeSpinnerStopper = null;
  }
}

function setSpinner(message: string) {
  stopSpinner();
  activeSpinnerStopper = startSpinner(message);
}

export function iconFor(result: Pick<StageResult, "status" | "type">): string {
  if (result.status === "skipped") return "⏭";
  if (result.status === "failed") return "❌";
  switch (result.type) {
    case "reset":
      return "🧹";
    case "init":
      return "⚙️";
    case "push":
      return "📦";
    case "seed":
      return "🌱";
    default:
      return "✅";
  }
}

function pushResult(result: StageResult) {
  results.push(result);
  stopSpinner();
  const icon = iconFor(result);
  console.log(`${icon} ${result.summary} (${result.label})`);
}

const streamDelayMs = 20;

function streamOutput(block: string) {
  const lines = block.split(/\r?\n/);
  return new Promise<void>((resolve) => {
    let index = 0;
    const writeNext = () => {
      if (index >= lines.length) {
        resolve();
        return;
      }
      process.stdout.write(`${lines[index]}\n`);
      index += 1;
      setTimeout(writeNext, streamDelayMs);
    };
    writeNext();
  });
}

async function printDetails() {
  for (const result of results) {
    console.log(`\n> ${result.label}`);
    let payload = "";
    if (result.output) {
      payload = grey(result.output.trimEnd() || "(no output)");
    } else if (result.status === "skipped") {
      payload = grey(result.skipMessage ?? "Skipped.");
    } else {
      payload = grey("(no output)");
    }
    // eslint-disable-next-line no-await-in-loop
    await streamOutput(payload);
  }
}

export async function runStage(stage: Stage) {
  if (!stage.enabled) {
    pushResult({
      ...stage,
      status: "skipped",
      output: "",
    });
    return;
  }

  setSpinner(stage.spinnerText);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(stage.command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      const combined = [stdout, stderr].filter(Boolean).join("");
      if (code === 0) {
        pushResult({
          ...stage,
          status: "success",
          output: combined,
        });
        resolve();
      } else {
        pushResult({
          ...stage,
          status: "failed",
          output: combined || `Command exited with code ${code}`,
        });
        reject(new Error(`Stage failed: ${stage.label}`));
      }
    });
    child.on("error", (error) => {
      pushResult({
        ...stage,
        status: "failed",
        output: error.message,
      });
      reject(error);
    });
  });
}

async function printSummaryAndLogs() {
  await printDetails();
}

export async function run(stages: Stage[]): Promise<void> {
  try {
    for (const stage of stages) {
      // eslint-disable-next-line no-await-in-loop
      await runStage(stage);
    }
    await printSummaryAndLogs();
    console.log("\n✔ Database reset complete (development only)");
  } catch (err) {
    await printSummaryAndLogs();
    console.error("\n✖ Database reset failed");
    process.exit(1);
  }
}

export function parseFlags(argv: string[]): { reseed: boolean } {
  const allowedFlags = new Set(["--reseed"]);
  const unknownFlags = argv.filter((arg) => !allowedFlags.has(arg));
  if (unknownFlags.length > 0) {
    console.error(
      `Unknown flag(s): ${unknownFlags.join(", ")}. Supported flags: --reseed`,
    );
    process.exit(1);
  }
  return { reseed: argv.includes("--reseed") };
}

export function assertDevEnv(nodeEnv = process.env.NODE_ENV ?? "development") {
  if (nodeEnv !== "development") {
    console.error(
      `Refusing to reset DB: NODE_ENV is '${nodeEnv}'. Set it to 'development' (e.g., via .env) to run db:reset.`,
    );
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const { reseed } = parseFlags(args);
  assertDevEnv();
  const stages = createStages({ reseed });
  await run(stages);
}

const invokedDirectly =
  process.argv[1]?.endsWith("dev-db-reset.ts") ?? false;

if (invokedDirectly) {
  void main();
}
