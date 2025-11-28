import type { PrismaClient, Patch, User, Prisma } from "@prisma/client";

import {
  validatePattern,
  expandPattern,
} from "~/server/services/component-version-naming.service";
import type { ActionLogger } from "~/server/services/action-history.service";

export type SuccessorPatchSummary = {
  moved: number;
  created: number;
  updated: number;
  successorPatchId: string;
};

// Applies the user selection to arrange ComponentVersions between Patch X and successor X+1
export class SuccessorPatchService {
  constructor(private readonly db: PrismaClient) {}

  async createSuccessorPatch(
    patchId: Patch["id"],
    selectedReleaseComponentIds: string[],
    _userId: User["id"],
    options?: { logger?: ActionLogger },
  ): Promise<SuccessorPatchSummary> {
    if (!selectedReleaseComponentIds?.length) {
      throw Object.assign(
        new Error("At least one component must be selected"),
        {
          code: "VALIDATION_ERROR",
        },
      );
    }

    const summary: SuccessorPatchSummary = {
      moved: 0,
      created: 0,
      updated: 0,
      successorPatchId: "",
    };

    const successorId = await this.db.$transaction(
      async (tx): Promise<string> => {
        const currentPatch = await tx.patch.findUniqueOrThrow({
          where: { id: patchId },
          select: { id: true, name: true, versionId: true, createdAt: true },
        });

        // Must be in_deployment
        const latestTransition = await tx.patchTransition.findFirst({
          where: { patchId },
          orderBy: { createdAt: "desc" },
          select: { toStatus: true },
        });
        const status = latestTransition?.toStatus ?? "in_development";
        if (status !== "in_deployment") {
          throw Object.assign(
            new Error("Operation only allowed from in_deployment"),
            {
              code: "INVALID_STATE",
              details: { status },
            },
          );
        }

        // Resolve successor X+1
        const successor = await tx.patch.findFirst({
          where: {
            versionId: currentPatch.versionId,
            createdAt: { gt: currentPatch.createdAt },
          },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true },
        });
        if (!successor) {
          throw Object.assign(new Error("Successor patch not found"), {
            code: "MISSING_SUCCESSOR",
          });
        }

        const release = await tx.releaseVersion.findUniqueOrThrow({
          where: { id: currentPatch.versionId },
          select: { id: true, name: true },
        });

        // Centralized tokenValues construction
        const makeTokens = (patchName: string, increment: number) => ({
          release_version: release.name,
          patch: patchName,
          increment,
        });

        // Load all release components for this release
        const releaseComponentDelegate = tx.releaseComponent as unknown as {
          findMany(args?: unknown): Promise<
            Array<{
              id: string;
              namingPattern: string | null;
              releaseScope: "global" | "version_bound";
            }>
          >;
        };
        const componentDefs = await releaseComponentDelegate.findMany({
          select: { id: true, namingPattern: true, releaseScope: true },
        });
        const patternByComponent = new Map(
          componentDefs.map((c) => [c.id, c.namingPattern] as const),
        );
        const globalComponentIds = new Set(
          componentDefs
            .filter((c) => c.releaseScope === "global")
            .map((c) => c.id),
        );

        // Load current rows on X and potential rows on X+1
        const currentRows = await tx.componentVersion.findMany({
          where: { patchId: currentPatch.id },
          select: {
            id: true,
            releaseComponentId: true,
            increment: true,
            name: true,
          },
        });
        const currentByComponent = new Map<
          string,
          { id: string; increment: number; name: string }
        >();
        for (const row of currentRows)
          currentByComponent.set(row.releaseComponentId, {
            id: row.id,
            increment: row.increment,
            name: row.name,
          });

        const successorRows = await tx.componentVersion.findMany({
          where: { patchId: successor.id },
          select: { id: true, releaseComponentId: true, increment: true },
        });
        const successorByComponent = new Map<
          string,
          { id: string; increment: number }
        >();
        for (const row of successorRows)
          successorByComponent.set(row.releaseComponentId, {
            id: row.id,
            increment: row.increment,
          });

        const computeName = (
          rcId: string,
          nextIncrement: number,
        ): string | undefined => {
          const pattern = patternByComponent.get(rcId) ?? null;
          if (!pattern?.trim()) return undefined;
          const { valid } = validatePattern(pattern);
          if (!valid) return undefined;
          return expandPattern(pattern, {
            releaseVersion: release.name,
            patch: successor.name,
            nextIncrement,
          });
        };

        const selected = new Set(selectedReleaseComponentIds);
        for (const globalId of globalComponentIds) {
          selected.add(globalId);
        }

        for (const comp of componentDefs) {
          const rcId = comp.id;
          const current = currentByComponent.get(rcId);
          const succ = successorByComponent.get(rcId);
          if (selected.has(rcId)) {
            // Ensure a successor seed row exists
            {
              const nextIncrement = succ?.increment ?? 0;
              const computed = computeName(rcId, nextIncrement) ?? undefined;
              const row = await tx.componentVersion.upsert({
                where: {
                  patchId_releaseComponentId: {
                    patchId: successor.id,
                    releaseComponentId: rcId,
                  },
                },
                create: {
                  name: computed ?? `${successor.name}-${rcId}-0`,
                  increment: nextIncrement,
                  releaseComponent: { connect: { id: rcId } },
                  patch: { connect: { id: successor.id } },
                  tokenValues: makeTokens(
                    successor.name,
                    nextIncrement,
                  ) as Prisma.InputJsonValue,
                },
                update: {
                  ...(computed ? { name: computed } : {}),
                  tokenValues: makeTokens(
                    successor.name,
                    nextIncrement,
                  ) as Prisma.InputJsonValue,
                },
                select: { id: true, increment: true },
              });
              successorByComponent.set(rcId, {
                id: row.id,
                increment: row.increment,
              });
              if (succ) summary.updated += 1;
              else summary.created += 1;
            }
            // If the current row is missing (edge case), create one so the closed build shows selected comps
            if (!current) {
              const pattern = patternByComponent.get(rcId) ?? null;
              let nameX = `${currentPatch.name}-${rcId}-0`;
              if (pattern?.trim() && validatePattern(pattern).valid) {
                nameX = expandPattern(pattern, {
                  releaseVersion: release.name,
                  patch: currentPatch.name,
                  nextIncrement: 0,
                });
              }
              await tx.componentVersion.upsert({
                where: {
                  patchId_releaseComponentId: {
                    patchId: currentPatch.id,
                    releaseComponentId: rcId,
                  },
                },
                create: {
                  name: nameX,
                  increment: 0,
                  releaseComponent: { connect: { id: rcId } },
                  patch: { connect: { id: currentPatch.id } },
                  tokenValues: makeTokens(
                    currentPatch.name,
                    0,
                  ) as Prisma.InputJsonValue,
                },
                update: {
                  name: nameX,
                  tokenValues: makeTokens(
                    currentPatch.name,
                    0,
                  ) as Prisma.InputJsonValue,
                },
              });
              // If it already existed, this counts as an update; keep summary simple and count as created only when missing in our snapshot
              summary.created += current ? 0 : 1;
            }
          } else {
            // Unselected: move current row to successor
            // Idempotency: only delete successor seed and move when a current row exists.
            if (current) {
              if (succ) {
                await tx.componentVersion.delete({ where: { id: succ.id } });
                successorByComponent.delete(rcId);
              }
              const name = computeName(rcId, current.increment) ?? current.name;
              await tx.componentVersion.update({
                where: { id: current.id },
                data: {
                  patchId: successor.id,
                  name,
                  tokenValues: makeTokens(
                    successor.name,
                    current.increment,
                  ) as Prisma.InputJsonValue,
                },
              });
              summary.moved += 1;
            }
            // If current is missing, do nothing to avoid losing an existing successor row.
          }
        }

        return successor.id;
      },
    );

    const result = { ...summary, successorPatchId: successorId };
    if (options?.logger) {
      await options.logger.subaction({
        subactionType: "successorPatch.arrange",
        message: `Rebalanced successor components for ${patchId}`,
        metadata: {
          moved: result.moved,
          created: result.created,
          updated: result.updated,
          successorPatchId: result.successorPatchId,
        },
      });
    }
    return result;
  }
}
