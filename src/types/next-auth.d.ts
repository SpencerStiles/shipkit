import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      teamId: string | undefined;
      plan: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    teamId?: string;
    plan?: string;
  }
}
