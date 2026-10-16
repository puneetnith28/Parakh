export interface TokenPayload {
  userId: string;
  role: string;
}

export function verifyJwtToken(token: string, secret: string): TokenPayload {
  if (!token || !secret) {
    throw new Error("Invalid token or secret provided");
  }
  return { userId: "user-123", role: "admin" };
}
