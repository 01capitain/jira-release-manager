import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserWhereInputObjectSchema } from './UserWhereInput.schema';
import { UserUpdateWithoutReleaseVersionInputObjectSchema } from './UserUpdateWithoutReleaseVersionInput.schema';
import { UserUncheckedUpdateWithoutReleaseVersionInputObjectSchema } from './UserUncheckedUpdateWithoutReleaseVersionInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => UserWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => UserUpdateWithoutReleaseVersionInputObjectSchema), z.lazy(() => UserUncheckedUpdateWithoutReleaseVersionInputObjectSchema)])
}).strict();
export const UserUpdateToOneWithWhereWithoutReleaseVersionInputObjectSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutReleaseVersionInput> = makeSchema() as unknown as z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutReleaseVersionInput>;
export const UserUpdateToOneWithWhereWithoutReleaseVersionInputObjectZodSchema = makeSchema();
