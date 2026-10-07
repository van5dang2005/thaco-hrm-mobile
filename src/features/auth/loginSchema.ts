import { z } from 'zod';

/** Messages are i18n keys, translated at render time. */
export const loginSchema = z.object({
  domain: z.string(),
  username: z.string().trim().min(1, 'validation.required').max(100, 'validation.maxLength'),
  password: z.string().min(1, 'validation.required'),
});

export type LoginForm = z.infer<typeof loginSchema>;
