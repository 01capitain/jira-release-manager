import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserWhereUniqueInputObjectSchema } from './UserWhereUniqueInput.schema';
import { UserCreateWithoutReleaseVersionInputObjectSchema } from './UserCreateWithoutReleaseVersionInput.schema';
import { UserUncheckedCreateWithoutReleaseVersionInputObjectSchema } from './UserUncheckedCreateWithoutReleaseVersionInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => UserWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => UserCreateWithoutReleaseVersionInputObjectSchema), z.lazy(() => UserUncheckedCreateWithoutReleaseVersionInputObjectSchema)])
}).strict();
export const UserCreateOrConnectWithoutReleaseVersionInputObjectSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutReleaseVersionInput> = makeSchema() as unknown as z.ZodType<Prisma.UserCreateOrConnectWithoutReleaseVersionInput>;
export const UserCreateOrConnectWithoutReleaseVersionInputObjectZodSchema = makeSchema();
