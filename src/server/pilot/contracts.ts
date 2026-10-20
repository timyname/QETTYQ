import { z } from "zod";

export const pointSchema = z.object({
  lat: z.number().min(50.8).max(51.5),
  lon: z.number().min(70.8).max(72),
}).strict();

export const pilotContextSchema = z.object({
  cityId: z.literal("astana").default("astana"),
  goal: z.enum(["food", "walk", "activity", "new"]).default("activity"),
  minutes: z.number().int().min(20).max(720).default(120),
  budget: z.number().int().min(0).max(1_000_000).nullable().default(null),
  origin: pointSchema.nullable().default(null),
  destination: pointSchema.nullable().default(null),
  returnToOrigin: z.boolean().default(false),
  likedTags: z.array(z.string().trim().min(1).max(48)).max(40).default([]),
  partySize: z.number().int().min(1).max(20).default(1),
  budgetBasis: z.enum(["person", "group"]).default("person"),
  strictBudget: z.boolean().default(false),
}).strict();

export const chatInputSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  context: pilotContextSchema.optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    text: z.string().max(1000),
  }).strict()).max(20).default([]),
}).strict();

export const planInputSchema = z.object({
  placeIds: z.array(z.string().min(1).max(128)).min(1).max(5),
  context: pilotContextSchema,
}).strict();

export type PilotContext = z.infer<typeof pilotContextSchema>;
