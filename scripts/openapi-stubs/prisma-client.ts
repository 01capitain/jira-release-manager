export class PrismaClient {}

export const Prisma = {
  JsonNull: null,
  NullTypes: { JsonNull: null },
} as const;

export type Prisma = typeof Prisma;
export type User = { id: string };
export type ReleaseVersion = { id: string };
