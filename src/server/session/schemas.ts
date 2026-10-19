import { z } from "zod";

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(48)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u)
  .transform((value) => value.toLocaleLowerCase("ru-RU"));

export const reactionInputSchema = z.object({
  entityId: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
  action: z.enum(["like", "skip", "dislike", "tried", "save"]),
  tags: z
    .array(tagSchema)
    .max(12)
    .default([])
    .transform((tags) => [...new Set(tags)]),
}).strict();

export const undoInputSchema = z.object({}).strict();

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const sessionTokenSchema = z
  .string()
  .length(43)
  .regex(/^[A-Za-z0-9_-]+$/);

export type ReactionInput = z.infer<typeof reactionInputSchema>;
