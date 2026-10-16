import { z } from "zod";

export const RequirementCategorySchema = z.enum([
  "frontend",
  "backend",
  "database",
  "devops",
  "architecture",
  "security",
  "testing",
  "general",
]);

export type RequirementCategory = z.infer<typeof RequirementCategorySchema>;

export const RequirementPrioritySchema = z.enum(["mandatory", "preferred"]);

export type RequirementPriority = z.infer<typeof RequirementPrioritySchema>;

export const SourceLocationSchema = z.object({
  pageNumber: z.number().int().positive().optional(),
  snippetOffset: z.number().int().nonnegative().optional(),
  sourceSnippet: z.string().optional(),
});

export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(3),
  category: RequirementCategorySchema.default("general"),
  priority: RequirementPrioritySchema.default("mandatory"),
  sourceLocation: SourceLocationSchema.optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
});

export type Requirement = z.infer<typeof RequirementSchema>;

export const OpportunitySchema = z.object({
  id: z.string().min(1),
  title: z.string().default("Untitled Opportunity"),
  rawText: z.string(),
  requirements: z.array(RequirementSchema),
  createdAt: z.string().datetime(),
});

export type Opportunity = z.infer<typeof OpportunitySchema>;
