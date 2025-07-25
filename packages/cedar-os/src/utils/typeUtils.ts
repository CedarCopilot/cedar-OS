import { z, ZodTypeAny } from 'zod';

/**
 * Utility type to extract the static TypeScript type from a Zod schema.
 * @example
 * type Player = zodToTS<typeof Player>;
 */
export type zodToTS<S extends ZodTypeAny> = z.infer<S>;
