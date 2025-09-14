import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserUpdateWithoutReleaseVersionInputObjectSchema } from './UserUpdateWithoutReleaseVersionInput.schema';
import { UserUncheckedUpdateWithoutReleaseVersionInputObjectSchema } from './UserUncheckedUpdateWithoutReleaseVersionInput.schema';
import { UserCreateWithoutReleaseVersionInputObjectSchema } from './UserCreateWithoutReleaseVersionInput.schema';
import { UserUncheckedCreateWithoutReleaseVersionInputObjectSchema } from './UserUncheckedCreateWithoutReleaseVersionInput.schema';
import { UserWhereInputObjectSchema } from './UserWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => UserUpdateWithoutReleaseVersionInputObjectSchema), z.lazy(() => UserUncheckedUpdateWithoutReleaseVersionInputObjectSchema)]),
  create: z.union([z.lazy(() => UserCreateWithoutReleaseVersionInputObjectSchema), z.lazy(() => UserUncheckedCreateWithoutReleaseVersionInputObjectSchema)]),
  where: z.lazy(() => UserWhereInputObjectSchema).optional()
}).strict();
export const UserUpsertWithoutReleaseVersionInputObjectSchema: z.ZodType<Prisma.UserUpsertWithoutReleaseVersionInput> = makeSchema() as unknown as z.ZodType<Prisma.UserUpsertWithoutReleaseVersionInput>;
export const UserUpsertWithoutReleaseVersionInputObjectZodSchema = makeSchema();
