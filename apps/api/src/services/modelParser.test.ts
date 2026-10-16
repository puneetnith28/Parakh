import test from "node:test";
import assert from "node:assert/strict";
import { ModelParser } from "./modelParser.js";
import { ExtractedRequirementsResultSchema } from "@parakh/contracts";

test("ModelParser extracts JSON wrapped in markdown fences with leading text", () => {
  const modelOutput = `Here is the extracted requirements list:
\`\`\`json
{
  "summary": "Technical stack extraction",
  "requirements": [
    {
      "id": "req_001",
      "text": "Build TypeScript backend with Express",
      "category": "backend",
      "priority": "mandatory"
    }
  ]
}
\`\`\`
Hope this helps!`;

  const result = ModelParser.parseWithSchema(modelOutput, ExtractedRequirementsResultSchema);
  assert.equal(result.success, true);
  assert.equal(result.data?.requirements.length, 1);
  assert.equal(result.data?.requirements[0].id, "req_001");
});

test("ModelParser repairs trailing commas in LLM output", () => {
  const dirtyJson = `{
  "summary": "Cleaned trailing comma",
  "requirements": [
    {
      "id": "req_001",
      "text": "Setup PostgreSQL database",
      "category": "database",
      "priority": "mandatory",
    },
  ],
}`;

  const result = ModelParser.parseWithSchema(dirtyJson, ExtractedRequirementsResultSchema);
  assert.equal(result.success, true);
  assert.equal(result.data?.requirements[0].category, "database");
});

test("ModelParser executes bounded retry when initial output is invalid JSON", async () => {
  let callCount = 0;
  const mockGenerator = async (_prompt: string): Promise<string> => {
    callCount++;
    if (callCount === 1) {
      return "Malformed non-json response";
    }
    return JSON.stringify({
      summary: "Recovered in retry",
      requirements: [
        {
          id: "req_retry_01",
          text: "Configured resilient retry handler",
          category: "backend",
          priority: "mandatory",
        },
      ],
    });
  };

  const parsed = await ModelParser.executeWithBoundedRetry(
    mockGenerator,
    "Initial Prompt",
    ExtractedRequirementsResultSchema,
    1
  );

  assert.equal(callCount, 2);
  assert.equal(parsed.requirements[0].id, "req_retry_01");
});
