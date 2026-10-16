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
  charStart: z.number().int().nonnegative().optional(),
  charEnd: z.number().int().nonnegative().optional(),
  sourceSnippet: z.string().max(2000).optional(),
});

export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export const RequirementSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^req_[a-zA-Z0-9_-]+$/, "Requirement ID must begin with 'req_' followed by alphanumeric characters"),
  text: z
    .string()
    .min(3, "Requirement text must be at least 3 characters")
    .max(1000, "Requirement text must not exceed 1000 characters"),
  category: RequirementCategorySchema.default("general"),
  priority: RequirementPrioritySchema.default("mandatory"),
  sourceLocation: SourceLocationSchema.optional(),
  acceptanceCriteria: z.array(z.string().min(2)).max(20).optional(),
});

export type Requirement = z.infer<typeof RequirementSchema>;

export const ExtractedRequirementsResultSchema = z.object({
  summary: z.string().max(1000).optional(),
  requirements: z.array(RequirementSchema).min(1, "At least one requirement must be extracted"),
});

export type ExtractedRequirementsResult = z.infer<typeof ExtractedRequirementsResultSchema>;

export const OpportunitySchema = z.object({
  id: z.string().min(1),
  title: z.string().default("Untitled Opportunity"),
  rawText: z.string().min(1),
  requirements: z.array(RequirementSchema),
  createdAt: z.string().datetime(),
});

export type Opportunity = z.infer<typeof OpportunitySchema>;
