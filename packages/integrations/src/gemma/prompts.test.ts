import test from "node:test";
import assert from "node:assert/strict";
import {
  EXTRACTION_SYSTEM_PROMPT,
  FEW_SHOT_EXTRACTION_EXAMPLES,
  buildExtractionPrompt,
} from "./prompts.js";
import { ExtractedRequirementsResultSchema } from "@parakh/contracts";

test("Gemma few-shot extraction examples conform to ExtractedRequirementsResultSchema", () => {
  for (const example of FEW_SHOT_EXTRACTION_EXAMPLES) {
    const parsed = ExtractedRequirementsResultSchema.parse(example.output);
    assert.ok(parsed.requirements.length > 0);
    for (const req of parsed.requirements) {
      assert.match(req.id, /^req_/);
      assert.ok(req.text.length >= 3);
    }
  }
});

test("buildExtractionPrompt encloses brief in XML tags and injects system instructions", () => {
  assert.ok(EXTRACTION_SYSTEM_PROMPT.length > 50);
  const brief = "Need a Python Flask backend with Redis caching.";
  const { systemPrompt, userPrompt } = buildExtractionPrompt(brief);

  assert.match(systemPrompt, /Parakh's Technical Requirement Extraction Specialist/);
  assert.match(systemPrompt, /Anti-Prompt-Injection/);
  assert.match(userPrompt, /<opportunity_brief>/);
  assert.match(userPrompt, /Need a Python Flask backend with Redis caching\./);
  assert.match(userPrompt, /<\/opportunity_brief>/);
});
