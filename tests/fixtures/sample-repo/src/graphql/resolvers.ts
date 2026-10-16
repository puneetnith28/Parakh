export const resolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, context: { user: { id: string; email: string } }) => {
      return context.user;
    },
    users: async (_parent: unknown, args: { limit?: number }, context: { db: { getUsers: (limit?: number) => Promise<any[]> } }) => {
      return context.db.getUsers(args.limit);
    },
  },
};
