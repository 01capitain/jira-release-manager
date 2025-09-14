import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { UserUpdateOneRequiredWithoutReleaseVersionNestedInputObjectSchema } from './UserUpdateOneRequiredWithoutReleaseVersionNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  name: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdBy: z.lazy(() => UserUpdateOneRequiredWithoutReleaseVersionNestedInputObjectSchema).optional()
}).strict();
export const ReleaseVersionUpdateInputObjectSchema: z.ZodType<Prisma.ReleaseVersionUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionUpdateInput>;
export const ReleaseVersionUpdateInputObjectZodSchema = makeSchema();
