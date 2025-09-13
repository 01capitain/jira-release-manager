import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  name: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional()
}).strict();
export const ReleaseVersionUncheckedUpdateManyWithoutCreatedByInputObjectSchema: z.ZodType<Prisma.ReleaseVersionUncheckedUpdateManyWithoutCreatedByInput> = makeSchema() as unknown as z.ZodType<Prisma.ReleaseVersionUncheckedUpdateManyWithoutCreatedByInput>;
export const ReleaseVersionUncheckedUpdateManyWithoutCreatedByInputObjectZodSchema = makeSchema();
