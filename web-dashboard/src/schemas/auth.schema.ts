import { z } from 'zod';

// Mirrors backend/src/controllers/auth.controller.ts:10
// identifier accepts phone OR email; the backend decides which column to query.
export const loginSchema = z.object({
  identifier: z.string().min(3, 'Phone or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
