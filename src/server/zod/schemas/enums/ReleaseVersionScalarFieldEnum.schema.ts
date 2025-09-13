import { z } from 'zod';

export const ReleaseVersionScalarFieldEnumSchema = z.enum(['id', 'name', 'createdAt', 'updatedAt', 'createdById'])

export type ReleaseVersionScalarFieldEnum = z.infer<typeof ReleaseVersionScalarFieldEnumSchema>;