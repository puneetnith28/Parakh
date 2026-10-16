export class PostgresClient {
  async queryUserById(userId: string) {
    const sql = "SELECT id, email, created_at FROM users WHERE id = $1";
    return { id: userId, email: "user@example.com", sql };
  }
}
