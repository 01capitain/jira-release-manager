#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";

import { claimSeedOwnership } from "~/server/seed/claim-seed-ownership";

const prisma = new PrismaClient();

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error(
      "Usage: pnpm tsx scripts/claim-seed-owner.ts <user-id|user-email>",
    );
    process.exit(1);
  }

  const user = identifier.includes("@")
    ? await prisma.user.findUnique({ where: { email: identifier } })
    : await prisma.user.findUnique({ where: { id: identifier } });

  if (!user) {
    console.error(`User '${identifier}' not found.`);
    process.exit(1);
  }

  const claimed = await claimSeedOwnership({ userId: user.id, prisma });
  if (claimed) {
    console.log(
      `Assigned release data from placeholder user to ${user.id} (${user.email ?? user.name ?? "unnamed"})`,
    );
  } else {
    console.log("Placeholder user not found or already claimed.");
  }
}

main()
  .catch((err) => {
    console.error("Failed to assign placeholder data");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
