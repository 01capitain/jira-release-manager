#!/usr/bin/env node

/* eslint-env node */
import { spawn } from "node:child_process";

if (typeof process.loadEnvFile === "function") {
  process.loadEnvFile();
}

const args = process.argv.slice(2);
const allowedFlags = new Set(["--reseed"]);
const unknownFlags = args.filter((arg) => !allowedFlags.has(arg));
if (unknownFlags.length > 0) {
  console.error(
    `Unknown flag(s): ${unknownFlags.join(
      ", ",
    )}. Supported flags: --reseed`,
  );
  process.exit(1);
}
const shouldReseed = args.includes("--reseed");

const env = process.env.NODE_ENV ?? "development";
if (env !== "development") {
  console.error(
    `Refusing to reset DB: NODE_ENV is '${env}'. Set it to 'development' (e.g., via .env) to run db:reset.`,
  );
  process.exit(1);
}

const stages = [
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
    enabled: shouldReseed,
    skipMessage: "Skipping reseed (pass --reseed to apply fixtures).",
  },
];

const results = [];

const grey = (text) => `\u001b[90m${text}\u001b[0m`;
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerLineInitialized = false;
let activeSpinnerStopper = null;

function startSpinner(message) {
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

function setSpinner(message) {
  stopSpinner();
  activeSpinnerStopper = startSpinner(message);
}

function pushResult(result) {
  results.push(result);
  const last = result;
  stopSpinner();
  const icon = iconFor(last);
  console.log(`${icon} ${last.summary} (${last.label})`);
}

function iconFor(result) {
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

const streamDelayMs = 20;

function streamOutput(block) {
  const lines = block.split(/\r?\n/);
  return new Promise((resolve) => {
    let index = 0;
    const writeNext = () => {
      if (index >= lines.length) {
        resolve(null);
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
    await streamOutput(payload);
  }
}

async function runStage(stage) {
  if (!stage.enabled) {
    pushResult({
      type: stage.type,
      label: stage.label,
      status: "skipped",
      output: "",
      summary: stage.summary,
      skipMessage: stage.skipMessage,
    });
    return;
  }

  setSpinner(stage.spinnerText);

  await new Promise((resolve, reject) => {
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
          type: stage.type,
          label: stage.label,
          summary: stage.summary,
          status: "success",
          output: combined,
        });
        resolve(null);
      } else {
        pushResult({
          type: stage.type,
          label: stage.label,
          summary: stage.summary,
          status: "failed",
          output: combined || `Command exited with code ${code}`,
        });
        reject(new Error(`Stage failed: ${stage.label}`));
      }
    });
    child.on("error", (error) => {
      pushResult({
        type: stage.type,
        label: stage.label,
        summary: stage.summary,
        status: "failed",
        output: error.message,
      });
      reject(error);
    });
  });
}

(async () => {
  try {
    for (const stage of stages) {
      await runStage(stage);
    }
    await printDetails();
    console.log("\n✔ Database reset complete (development only)");
  } catch {
    await printDetails();
    console.error("\n✖ Database reset failed");
    process.exit(1);
  }
})();
