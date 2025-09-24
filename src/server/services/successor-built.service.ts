import type { PrismaClient, BuiltVersion, User } from "@prisma/client";

import { validatePattern, expandPattern } from "~/server/services/component-version-naming.service";

export type SuccessorBuiltSummary = {
  moved: number;
  created: number;
  updated: number;
  successorBuiltId: string;
};

// Applies the user selection to arrange ComponentVersions between Built X and successor X+1
export class SuccessorBuiltService {
  constructor(private readonly db: PrismaClient) {}

  async createSuccessorBuilt(
    builtVersionId: BuiltVersion["id"],
    selectedReleaseComponentIds: string[],
    _userId: User["id"],
  ): Promise<SuccessorBuiltSummary> {
    if (!selectedReleaseComponentIds?.length) {
      throw Object.assign(new Error("At least one component must be selected"), {
        code: "VALIDATION_ERROR",
      });
    }

    const summary: SuccessorBuiltSummary = { moved: 0, created: 0, updated: 0 };

    const successorId = await this.db.$transaction(async (tx) => {
      const built = await tx.builtVersion.findUniqueOrThrow({
        where: { id: builtVersionId },
        select: { id: true, name: true, versionId: true, createdAt: true },
      });

      // Must be in_deployment
      const latestTransition = await tx.builtVersionTransition.findFirst({
        where: { builtVersionId },
        orderBy: { createdAt: "desc" },
        select: { toStatus: true },
      });
      const status = latestTransition?.toStatus ?? "in_development";
      if (status !== "in_deployment") {
        throw Object.assign(new Error("Operation only allowed from in_deployment"), {
          code: "INVALID_STATE",
          details: { status },
        });
      }

      // Resolve successor X+1
      const successor = await tx.builtVersion.findFirst({
        where: { versionId: built.versionId, createdAt: { gt: built.createdAt } },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      });
      if (!successor) {
        throw Object.assign(new Error("Successor build not found"), {
          code: "MISSING_SUCCESSOR",
        });
      }

      const release = await tx.releaseVersion.findUniqueOrThrow({
        where: { id: built.versionId },
        select: { id: true, name: true },
      });

      // Load all release components for this release
      const componentDefs = await tx.releaseComponent.findMany({
        select: { id: true, namingPattern: true },
      });
      const patternByComponent = new Map(componentDefs.map((c) => [c.id, c.namingPattern] as const));

      // Load current rows on X and potential rows on X+1
      const currentRows = await tx.componentVersion.findMany({
        where: { builtVersionId: built.id },
        select: { id: true, releaseComponentId: true, increment: true, name: true },
      });
      const currentByComponent = new Map<string, { id: string; increment: number; name: string }>();
      for (const row of currentRows) currentByComponent.set(row.releaseComponentId, { id: row.id, increment: row.increment, name: row.name });

      const successorRows = await tx.componentVersion.findMany({
        where: { builtVersionId: successor.id },
        select: { id: true, releaseComponentId: true, increment: true },
      });
      const successorByComponent = new Map<string, { id: string; increment: number }>();
      for (const row of successorRows) successorByComponent.set(row.releaseComponentId, { id: row.id, increment: row.increment });

      const computeName = (rcId: string, nextIncrement: number): string | undefined => {
        const pattern = patternByComponent.get(rcId) ?? null;
        if (!pattern?.trim()) return undefined;
        const { valid } = validatePattern(pattern);
        if (!valid) return undefined;
        return expandPattern(pattern, {
          releaseVersion: release.name,
          builtVersion: successor.name,
          nextIncrement,
        });
      };

      const selected = new Set(selectedReleaseComponentIds);

      for (const comp of componentDefs) {
        const rcId = comp.id;
        const current = currentByComponent.get(rcId);
        const succ = successorByComponent.get(rcId);
        if (selected.has(rcId)) {
          // Ensure a successor seed row exists
          if (succ) {
            const name = computeName(rcId, succ.increment) ?? undefined;
            await tx.componentVersion.update({
              where: { id: succ.id },
              data: {
                ...(name ? { name } : {}),
                tokenValues: {
                  release_version: release.name,
                  built_version: successor.name,
                  increment: succ.increment,
                } as any,
              },
            });
            summary.updated += 1;
          } else {
            const nextIncrement = 0;
            const computed = computeName(rcId, nextIncrement);
            const created = await tx.componentVersion.create({
              data: {
                name: computed ?? `${successor.name}-${rcId}-0`,
                increment: nextIncrement,
                releaseComponent: { connect: { id: rcId } },
                builtVersion: { connect: { id: successor.id } },
                tokenValues: {
                  release_version: release.name,
                  built_version: successor.name,
                  increment: nextIncrement,
                } as any,
              },
            });
            successorByComponent.set(rcId, { id: created.id, increment: nextIncrement });
            summary.created += 1;
          }
          // If the current row is missing (edge case), create one so the closed build shows selected comps
          if (!current) {
            const pattern = patternByComponent.get(rcId) ?? null;
            let nameX = `${built.name}-${rcId}-0`;
            if (pattern?.trim() && validatePattern(pattern).valid) {
              nameX = expandPattern(pattern, {
                releaseVersion: release.name,
                builtVersion: built.name,
                nextIncrement: 0,
              });
            }
            await tx.componentVersion.create({
              data: {
                name: nameX,
                increment: 0,
                releaseComponent: { connect: { id: rcId } },
                builtVersion: { connect: { id: built.id } },
                tokenValues: {
                  release_version: release.name,
                  built_version: built.name,
                  increment: 0,
                } as any,
              },
            });
            summary.created += 1;
          }
        } else {
          // Unselected: move current row to successor
          if (succ) {
            await tx.componentVersion.delete({ where: { id: succ.id } });
            successorByComponent.delete(rcId);
          }
          if (current) {
            const name = computeName(rcId, current.increment) ?? current.name;
            await tx.componentVersion.update({
              where: { id: current.id },
              data: {
                builtVersionId: successor.id,
                name,
                tokenValues: {
                  release_version: release.name,
                  built_version: successor.name,
                  increment: current.increment,
                } as any,
              },
            });
            summary.moved += 1;
          }
        }
      }
      return successor.id;
    });

    return { ...summary, successorBuiltId: successorId };
  }
}
