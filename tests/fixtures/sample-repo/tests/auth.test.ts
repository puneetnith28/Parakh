import { verifyJwtToken } from "../src/auth/jwt.js";

describe("JWT Authentication Test Suite", () => {
  it("verifies and extracts valid JWT token payload", () => {
    const payload = verifyJwtToken("valid.jwt.token", "secret123");
    expect(payload.userId).toBe("user-123");
  });
});
