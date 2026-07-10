import { z } from 'zod';

export const ClearSpecSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'confirm must be true to clear the environment' }),
  }),
});

export type ClearSpec = z.infer<typeof ClearSpecSchema>;
